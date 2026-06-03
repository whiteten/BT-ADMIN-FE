import { type ReactNode, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { DEMO_HEALTH, isHealthDemoMode } from './demoData';
import { SEV_BG, SEV_BG_SOFT, SEV_HEX, SEV_TEXT, abandonSev, agentDonutSegments, answerRateSev, overallStatus, serviceLevelSev, toHealthData, waitingSev } from './helpers';
import type { HealthBoardData, HealthBoardThresholds, QualityInfo, QueueRow, Severity, SystemHealth } from './types';

/**
 * 종합 헬스보드 위젯 — "지금 우리 센터, 정상인가?"
 *
 * 시안: docs/insight/monitoring/mvp-design/wireframes/01-healthboard.html
 * - KPI 스트립(상태 5종): 응대율·SL·포기율 게이지 / 현재대기 / 알람 듀얼 신호등
 * - 시스템 신호등(IE·IC·IR 노드 헬스, LED glow)
 * - 요약 3카드: 큐 현황 / 상담사 상태 도넛 / 통화 품질(MoS)
 *
 * 위젯 제목·실시간 연결 표시·갱신 상태는 대시보드 카드 헤더(WidgetCardHeader)가 이미 제공하므로
 * 위젯 자체 헤더(타이틀/LIVE/시각)는 두지 않는다(중복 제거).
 *
 * 모든 차트는 ECharts(echarts-for-react)로 렌더링한다(게이지·도넛·큐 바·MoS 분포 스택 바).
 * 카드는 캔버스(bg-bt-bg-canvas) 위에 흰 카드 + 테두리 + bt-shadow 로 띄워 경계를 분명히 하고,
 * 상단 컬러 액센트 바로 상태를 강조한다. 위험 상태에는 관제 월보드 톤의 알림 모션
 * (bt-pulse / bt-pulse-ring)을 적용한다(styles.css, prefers-reduced-motion 시 차단).
 */
export interface HealthBoardWidgetProps {
  data: unknown;
  options?: { thresholds?: HealthBoardThresholds; centerName?: string } & Record<string, unknown>;
  widgetId?: number | string;
  onRequestPause?: () => void;
}

export default function HealthBoardWidget({ data, options }: HealthBoardWidgetProps) {
  const t = options?.thresholds;

  // BE 집계 위젯(healthBoardWidget)이 아직 없어, 라이브 데이터가 비어 있으면 목(데모) 데이터로 렌더링한다.
  // BE 가 붙으면 라이브 데이터가 우선되고, ?healthDemo=1 로 강제 데모도 가능. (목 우선은 임시 — BE 연동 후 제거)
  const d = useMemo<HealthBoardData>(() => {
    if (isHealthDemoMode()) return DEMO_HEALTH;
    const live = toHealthData(data);
    return hasLiveData(live) ? live : DEMO_HEALTH;
  }, [data]);

  const overall = overallStatus(d);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-bt-bg-canvas p-5">
      {/* ═══ KPI 스트립 — 대형 게이지 ═══ */}
      <section>
        <SectionEyebrow sev={overall.sev}>실시간 응대 지표</SectionEyebrow>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <GaugeCard
            label="응대율"
            value={d.answerRate}
            max={100}
            target={t?.answerRate?.good ?? 90}
            display={fmtPct(d.answerRate)}
            sev={answerRateSev(d, t)}
            footer={
              <div className="flex items-center justify-center gap-2.5 text-[11.5px]">
                <span className="text-bt-fg-muted">
                  인입 <b className="tabular-nums text-bt-fg">{d.inboundCnt.toLocaleString()}</b>
                </span>
                <span className="h-3 w-px bg-bt-border" />
                <span className="text-bt-fg-muted">
                  응대 <b className="tabular-nums text-bt-success">{d.answeredCnt.toLocaleString()}</b>
                </span>
              </div>
            }
          />
          <GaugeCard
            label="SL"
            value={d.serviceLevel}
            max={100}
            target={t?.serviceLevel?.good ?? 90}
            display={fmtPct(d.serviceLevel)}
            sev={serviceLevelSev(d, t)}
            footer={<SevPill sev={serviceLevelSev(d, t)} okText="목표 충족" warnText="목표 미달" />}
          />
          <GaugeCard
            label="포기율"
            value={d.abandonRate}
            max={10}
            target={t?.abandonRate?.good ?? 3}
            display={fmtPct(d.abandonRate)}
            sev={abandonSev(d, t)}
            footer={<SevPill sev={abandonSev(d, t)} okText="목표 이내" warnText="목표 초과" />}
          />
          <WaitingCard count={d.waitingCnt} sev={waitingSev(d, t)} />
          <AlarmCard notice={d.alarm.notice} warning={d.alarm.warning} danger={d.alarm.danger} />
        </div>
      </section>

      {/* ═══ 시스템 신호등 (LED 칩) ═══ */}
      <section>
        <SectionEyebrow sev={worstSeverity(d.systems.map((s) => s.severity))}>시스템 상태</SectionEyebrow>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-bt-border bg-bt-bg px-5 py-3.5 bt-shadow">
          {d.systems.map((s) => (
            <SystemChip key={s.code} system={s} />
          ))}
          <CardLink className="ml-auto">노드 상세</CardLink>
        </div>
      </section>

      {/* ═══ 요약 3카드 ═══ */}
      <section className="flex min-h-0 flex-1 flex-col">
        <SectionEyebrow sev={overall.sev}>상세 현황</SectionEyebrow>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
          <SummaryCard title="큐 현황" titleSub="· 위험순" link="큐 모니터" sev={worstSeverity(d.queues.map((q) => q.sev))}>
            <QueueChart queues={d.queues} normalCnt={d.normalQueueCnt} />
          </SummaryCard>

          <SummaryCard title="상담사 상태" titleSub={`· ${agentTotal(d)}명`} link="상담사 현황" sev="success">
            <AgentDonut data={d} />
          </SummaryCard>

          <SummaryCard title="통화 품질" titleSub="· MoS" link="품질 위험판" sev={d.quality.bad > 0 ? 'danger' : d.quality.warn > 0 ? 'notice' : 'success'}>
            <QualityPanel quality={d.quality} />
          </SummaryCard>
        </div>
      </section>
    </div>
  );
}

// ─── 포맷 ──────────────────────────────────────────────────────

/** 라이브 DATA 프레임에 의미 있는 값이 들어왔는지 판정 (없으면 목 데이터로 폴백). */
function hasLiveData(d: HealthBoardData): boolean {
  return d.answerRate != null || d.waitingCnt > 0 || d.systems.length > 0 || d.agents.available + d.agents.talking > 0;
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function agentTotal(d: HealthBoardData): number {
  const a = d.agents;
  return a.available + a.talking + a.wrapup + a.aux + a.offline;
}

/** 심각도 목록 중 가장 위험한 값 (없으면 정상). */
const SEV_RANK: Record<Severity, number> = { success: 0, notice: 1, warning: 2, danger: 3 };
function worstSeverity(list: Severity[]): Severity {
  return list.reduce<Severity>((acc, s) => (SEV_RANK[s] > SEV_RANK[acc] ? s : acc), 'success');
}

// ─── 섹션 구분 라벨 ────────────────────────────────────────────

/** 영역 간 시각 구분을 위한 소형 eyebrow (컬러 틱 + 라벨). */
function SectionEyebrow({ sev, children }: { sev: Severity; children: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className={`h-3 w-1 rounded-full ${SEV_BG[sev]}`} />
      <span className="text-[11px] font-bold uppercase tracking-wider text-bt-fg-muted">{children}</span>
    </div>
  );
}

// ─── 링크 (명확한 클릭 affordance) ─────────────────────────────

function CardLink({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={`group inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-bt-primary transition-colors hover:bg-bt-primary-soft hover:text-bt-primary-hover ${className}`}
    >
      <span className="underline decoration-bt-primary/40 underline-offset-2 group-hover:decoration-bt-primary-hover">{children}</span>
      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
    </button>
  );
}

// ─── 게이지 카드 (ECharts 반원 게이지) ──────────────────────────

interface GaugeCardProps {
  label: string;
  value: number | null;
  max: number;
  display: string;
  sev: Severity;
  /** 목표(임계)치 — 게이지 밴드 위에 틱 마커로 표기 (시안 01-healthboard.html). */
  target?: number;
  footer?: ReactNode;
}

// 게이지 공통 형상 (메인 호 / 목표 틱 두 시리즈가 동일 좌표를 공유)
const GAUGE_GEOM = { startAngle: 200, endAngle: -20, min: 0, radius: '116%', center: ['50%', '82%'] as [string, string] };

function GaugeCard({ label, value, max, display, sev, target, footer }: GaugeCardProps) {
  const color = SEV_HEX[sev];
  const option = useMemo(
    () => ({
      animationDuration: 700,
      series: [
        {
          ...GAUGE_GEOM,
          type: 'gauge',
          max,
          progress: { show: true, width: 13, roundCap: true, itemStyle: { color } },
          axisLine: { roundCap: true, lineStyle: { width: 13, color: [[1, '#eef1f6']] } },
          pointer: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, '-8%'],
            fontSize: 32,
            fontWeight: 'bolder',
            fontFamily: 'Poppins, "Noto Sans KR", sans-serif',
            color,
            formatter: () => display,
          },
          data: [{ value: value ?? 0 }],
        },
        // 목표 틱 — 진행 호 위에 겹쳐 그려, 값이 목표를 넘어도 가려지지 않음
        ...(target != null
          ? [
              {
                ...GAUGE_GEOM,
                type: 'gauge',
                max,
                progress: { show: false },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false },
                anchor: { show: false },
                title: { show: false },
                detail: { show: false },
                pointer: {
                  show: true,
                  icon: 'rect',
                  width: 3,
                  length: '26%',
                  offsetCenter: [0, '-87%'],
                  itemStyle: { color: '#3a3f47' },
                },
                silent: true,
                data: [{ value: target }],
              },
            ]
          : []),
      ],
    }),
    [value, max, display, color, target],
  );

  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-xl border border-bt-border bg-bt-bg px-4 pt-4 pb-2.5 bt-shadow">
      <div className={`absolute inset-x-0 top-0 h-1 ${SEV_BG[sev]}`} />
      <div className="flex w-full items-center justify-between">
        <span className="text-[13px] font-bold uppercase tracking-wide text-bt-fg-muted">{label}</span>
        {target != null && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-bt-fg-muted">
            <span className="h-2.5 w-0.5 rounded-full bg-[#3a3f47]" />
            목표 {target}
          </span>
        )}
      </div>
      <ReactECharts option={option} style={{ height: 104, width: '100%' }} notMerge lazyUpdate opts={{ renderer: 'svg' }} />
      <div className="mt-auto flex min-h-[28px] w-full items-center justify-center pt-1">{footer}</div>
    </div>
  );
}

function SevPill({ sev, okText, warnText }: { sev: Severity; okText: string; warnText: string }) {
  const ok = sev === 'success';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEV_BG_SOFT[sev]} ${SEV_TEXT[sev]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${SEV_BG[sev]}`} />
      {ok ? okText : warnText}
    </span>
  );
}

// ─── 현재 대기 카드 ────────────────────────────────────────────

function WaitingCard({ count, sev }: { count: number; sev: Severity }) {
  const sevLabel: Record<Severity, string> = { success: '정상', notice: '주의', warning: '경고', danger: '위험' };
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-xl border border-bt-border bg-bt-bg px-4 pt-4 pb-2.5 bt-shadow">
      <div className={`absolute inset-x-0 top-0 h-1 ${SEV_BG[sev]}`} />
      <div className="self-start text-[13px] font-bold uppercase tracking-wide text-bt-fg-muted">현재 대기</div>
      <div className="flex flex-1 items-baseline justify-center gap-1.5 py-3">
        <span className={`bt-countup tabular-nums text-[60px] font-extrabold leading-none tabular-nums ${SEV_TEXT[sev]}`}>{count}</span>
        <span className="text-[14px] font-medium text-bt-fg-muted">콜</span>
      </div>
      <div className="mt-auto flex min-h-[28px] w-full items-center justify-center pt-1">
        <SevPill sev={sev} okText={sevLabel.success} warnText={sevLabel[sev]} />
      </div>
    </div>
  );
}

// ─── 알람 카드 ─────────────────────────────────────────────────

function AlarmCard({ notice, warning, danger }: { notice: number; warning: number; danger: number }) {
  const active = danger > 0;
  // 위험 0 이면 가장 높은 단계 톤으로 카드 외곽을 칠하고, 전부 0 이면 정상(중립) 톤.
  const topSev: Severity = danger > 0 ? 'danger' : warning > 0 ? 'warning' : notice > 0 ? 'notice' : 'success';
  const frame: Record<Severity, string> = {
    success: 'border-bt-border bg-bt-bg',
    notice: 'border-bt-notice/25 bg-bt-notice-soft',
    warning: 'border-bt-warning/25 bg-bt-warning-soft',
    danger: 'border-bt-danger/25 bg-bt-danger-soft',
  };
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-xl border px-4 pt-4 pb-2.5 bt-shadow ${frame[topSev]} ${active ? 'bt-pulse-ring' : ''}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${SEV_BG[topSev]}`} />
      <div className={`inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide ${SEV_TEXT[topSev]}`}>
        <AlertTriangle className="h-3.5 w-3.5" />
        알람
      </div>
      <div className="flex flex-1 items-center justify-center gap-3 py-2.5">
        <AlarmCount sev="notice" count={notice} label="주의" />
        <div className="h-10 w-px bg-bt-border" />
        <AlarmCount sev="warning" count={warning} label="경고" />
        <div className="h-10 w-px bg-bt-border" />
        <AlarmCount sev="danger" count={danger} label="위험" pulse={active} />
      </div>
      <div className="mt-auto flex min-h-[28px] w-full items-center justify-center pt-1">
        <CardLink>알람센터</CardLink>
      </div>
    </div>
  );
}

function AlarmCount({ sev, count, label, pulse = false }: { sev: Severity; count: number; label: string; pulse?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`bt-countup tabular-nums text-[32px] font-extrabold leading-none tabular-nums ${SEV_TEXT[sev]}`}>{count}</span>
      <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold ${SEV_TEXT[sev]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${SEV_BG[sev]} ${pulse ? 'bt-pulse' : ''}`} />
        {label}
      </span>
    </div>
  );
}

// ─── 시스템 칩 ─────────────────────────────────────────────────

// 시스템 칩 — system.severity 기반 (정상 green / 주의 amber / 경고 orange / 위험 red).
const CHIP_FRAME: Record<Severity, string> = {
  success: 'border-bt-success/25 bg-bt-success-soft',
  notice: 'border-bt-notice/25 bg-bt-notice-soft',
  warning: 'border-bt-warning/25 bg-bt-warning-soft',
  danger: 'border-bt-danger/25 bg-bt-danger-soft bt-pulse-ring',
};
const CHIP_LABEL: Record<Severity, string> = { success: '정상', notice: '주의', warning: '경고', danger: '이상' };

function SystemChip({ system }: { system: SystemHealth }) {
  const sev = system.severity;
  const ok = sev === 'success';
  return (
    <div className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 ${CHIP_FRAME[sev]}`}>
      <span className={`h-3 w-3 rounded-full ${SEV_BG[sev]} ${sev === 'danger' ? 'bt-pulse' : ''}`} style={{ boxShadow: `0 0 8px ${SEV_HEX[sev]}` }} />
      <div className="leading-tight">
        <div className="text-[13px] font-bold">{system.name}</div>
        <div className={`text-[11px] font-medium ${ok ? 'text-bt-success' : `font-bold ${SEV_TEXT[sev]}`}`}>
          {CHIP_LABEL[sev]} · 노드 {system.up}/{system.total}
          {ok ? '' : ' ↓'}
        </div>
      </div>
    </div>
  );
}

// ─── 요약 카드 셸 ──────────────────────────────────────────────

function SummaryCard({ title, titleSub, link, sev, children }: { title: string; titleSub?: string; link: string; sev: Severity; children: ReactNode }) {
  return (
    <div className="relative flex h-full min-h-[230px] flex-col overflow-hidden rounded-xl border border-bt-border bg-bt-bg bt-shadow">
      <div className={`absolute inset-x-0 top-0 h-1 ${SEV_BG[sev]}`} />
      <div className="flex items-center justify-between border-b border-bt-border px-5 py-3.5">
        <h2 className="text-[14px] font-bold">
          {title}
          {titleSub && <span className="text-[12px] font-normal text-bt-fg-muted"> {titleSub}</span>}
        </h2>
        <CardLink>{link}</CardLink>
      </div>
      <div className="flex flex-1 flex-col justify-center px-5 py-4">{children}</div>
    </div>
  );
}

// ─── 큐 현황 (ECharts 가로 바) ─────────────────────────────────

function QueueChart({ queues, normalCnt }: { queues: QueueRow[]; normalCnt: number }) {
  // ECharts yAxis 는 아래→위 순이라, 위험순(barPct 큰 것)이 위로 가도록 역순으로 넣는다.
  const ordered = useMemo(() => [...queues].reverse(), [queues]);

  const option = useMemo(
    () => ({
      animationDuration: 500,
      grid: { left: 4, right: 56, top: 2, bottom: 2, containLabel: true },
      xAxis: { type: 'value', max: 100, show: false },
      yAxis: {
        type: 'category',
        data: ordered.map((q) => q.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#0a0a0b', fontSize: 12, fontWeight: 600, margin: 10 },
      },
      series: [
        {
          type: 'bar',
          barWidth: 11,
          itemStyle: { borderRadius: 6 },
          data: ordered.map((q) => ({
            value: Math.max(3, Math.min(100, q.barPct)),
            itemStyle: { color: SEV_HEX[q.sev] },
            label: {
              show: true,
              position: 'right',
              distance: 8,
              formatter: q.waitCnt != null ? `${q.waitCnt} 대기` : q.serviceLevel != null ? `SL ${q.serviceLevel}%` : '',
              color: SEV_HEX[q.sev],
              fontFamily: 'Poppins, "Noto Sans KR", sans-serif',
              fontSize: 11.5,
              fontWeight: 'bold',
            },
          })),
        },
      ],
    }),
    [ordered],
  );

  return (
    <div className="flex flex-col gap-2.5">
      {queues.length > 0 ? (
        <ReactECharts option={option} style={{ height: queues.length * 34, width: '100%' }} notMerge lazyUpdate />
      ) : (
        <div className="py-6 text-center text-[12px] text-bt-fg-muted">위험 큐 없음</div>
      )}
      {normalCnt > 0 && (
        <button type="button" className="self-start rounded text-[11.5px] text-bt-fg-muted transition-colors hover:text-bt-fg">
          ·· 정상 큐 {normalCnt}개
        </button>
      )}
    </div>
  );
}

// ─── 상담사 도넛 (ECharts pie) ─────────────────────────────────

function AgentDonut({ data }: { data: HealthBoardData }) {
  const { segments } = useMemo(() => agentDonutSegments(data.agents), [data.agents]);
  const option = useMemo(
    () => ({
      animationDuration: 700,
      tooltip: { trigger: 'item', confine: true, formatter: '{b}: {c}명 ({d}%)' },
      series: [
        {
          type: 'pie',
          radius: ['66%', '96%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          emphasis: { scale: false },
          data: segments.map((s) => ({ value: s.value, name: s.label, itemStyle: { color: s.color } })),
        },
      ],
    }),
    [segments],
  );

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: 116, height: 116 }}>
        <ReactECharts option={option} style={{ height: 116, width: 116 }} notMerge lazyUpdate />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold leading-none tabular-nums text-bt-success">{data.agents.available}</span>
          <span className="text-[11px] text-bt-fg-muted">가용</span>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-1.5 text-[12px]">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
            <b className="tabular-nums">{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── 통화 품질 ─────────────────────────────────────────────────

function QualityPanel({ quality }: { quality: QualityInfo }) {
  const dist = quality.dist;

  const option = useMemo(() => {
    const segs = [
      { w: dist.good, color: '#0a8a4a', label: '좋음' },
      { w: dist.fair, color: '#84cc16', label: '보통' },
      { w: dist.warn, color: '#b76e00', label: '주의' },
      { w: dist.bad, color: '#c92a2a', label: '나쁨' },
    ];
    return {
      animationDuration: 500,
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { type: 'value', max: 100, show: false },
      yAxis: { type: 'category', data: [''], show: false },
      tooltip: { trigger: 'item', confine: true, formatter: (p: { seriesName: string; value: number }) => `${p.seriesName} ${p.value}%` },
      series: segs.map((s, i) => ({
        name: s.label,
        type: 'bar',
        stack: 'mos',
        barWidth: 14,
        data: [s.w],
        itemStyle: {
          color: s.color,
          borderRadius: i === 0 ? [6, 0, 0, 6] : i === segs.length - 1 ? [0, 6, 6, 0] : 0,
        },
      })),
    };
  }, [dist]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center rounded-lg bg-bt-danger-soft px-3.5 py-2">
          <span className="text-xl font-extrabold leading-none tabular-nums text-bt-danger">{quality.bad}</span>
          <span className="mt-1 text-[11px] font-semibold text-bt-danger">{'나쁨 <3.0'}</span>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-bt-warn-soft px-3.5 py-2">
          <span className="text-xl font-extrabold leading-none tabular-nums text-bt-warn">{quality.warn}</span>
          <span className="mt-1 text-[11px] font-semibold text-bt-warn">주의 ~3.5</span>
        </div>
        <div className="flex-1 text-right">
          <div className="text-[11px] text-bt-fg-muted">정상 자리</div>
          <div className="text-xl font-bold tabular-nums text-bt-fg-muted">{quality.normal}</div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] text-bt-fg-muted">MoS 등급 분포</div>
        <ReactECharts option={option} style={{ height: 14, width: '100%' }} notMerge lazyUpdate />
      </div>

      {quality.lowestMos != null && (
        <div className="flex items-center justify-between rounded-lg bg-bt-danger-soft px-3.5 py-2">
          <span className="text-[12px]">
            최저 MoS <b className="text-xl tabular-nums text-bt-danger">{quality.lowestMos.toFixed(1)}</b>
          </span>
          {quality.lowestAgentName && (
            <span className="text-[12px] text-bt-fg-muted">
              {quality.lowestAgentName}
              {quality.lowestAgentDn && <span className="tabular-nums text-[11px]"> ({quality.lowestAgentDn})</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
