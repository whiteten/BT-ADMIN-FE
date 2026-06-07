import { type ComponentProps, type HTMLAttributes, type ReactNode, forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, AlertTriangle, Cable, ChevronRight, Headset, Hourglass, ListOrdered, PhoneIncoming, PhoneMissed, Radio, Server, Timer } from 'lucide-react';
import { SEV_BG, SEV_BG_SOFT, SEV_HEX, SEV_TEXT, abandonSev, agentDonutSegments, answerRateSev, overallStatus, serviceLevelSev, toHealthData, waitingSev } from './helpers';
import type { ChannelBoard, HealthBoardData, HealthBoardThresholds, QualityInfo, QueueRow, Severity, SystemHealth, SystemProcess, TrunkBoard } from './types';
import { useDrilldown } from '../../components/drilldown/DrilldownProvider';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/libs/shared-ui/src/components/shadcn/hover-card';

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
  const { open } = useDrilldown();
  // 드릴다운 구독에 헬스보드 컨텍스트(mediaType 등)를 상속시킨다.
  const drillOptions = options as Record<string, unknown> | undefined;

  // 라이브 데이터(WS DATA 프레임)를 그대로 정규화해 렌더한다. 데이터가 아직 없으면 빈/0 값으로 표시된다.
  const d = useMemo<HealthBoardData>(() => toHealthData(data), [data]);

  const overall = overallStatus(d);

  // 시스템 칩 정렬 — ① 심각도 위험순(danger→warning→notice→success),
  // ② 동률이면 프로세스 다운 비율((total-up)/total)이 높은 쪽을 더 왼쪽으로.
  const sortedSystems = useMemo(() => {
    const downRatio = (s: SystemHealth) => (s.total > 0 ? (s.total - s.up) / s.total : 0);
    return [...d.systems].sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || downRatio(b) - downRatio(a));
  }, [d.systems]);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-bt-bg-canvas p-5">
      {/* ═══ KPI 스트립 — 대형 게이지 ═══ */}
      <section>
        <SectionEyebrow sev={overall.sev}>실시간 응대 지표</SectionEyebrow>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <GaugeCard
            label="응대율"
            icon={<PhoneIncoming className="h-3.5 w-3.5" />}
            value={d.answerRate}
            max={100}
            target={t?.answerRate?.good ?? 90}
            display={fmtPct(d.answerRate)}
            sev={answerRateSev(d, t)}
            caption={
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
            footer={<SevPill sev={answerRateSev(d, t)} okText="목표 충족" warnText="목표 미달" />}
          />
          <GaugeCard
            label="SL"
            icon={<Timer className="h-3.5 w-3.5" />}
            value={d.serviceLevel}
            max={100}
            target={t?.serviceLevel?.good ?? 90}
            display={fmtPct(d.serviceLevel)}
            sev={serviceLevelSev(d, t)}
            footer={<SevPill sev={serviceLevelSev(d, t)} okText="목표 충족" warnText="목표 미달" />}
          />
          <GaugeCard
            label="포기율"
            icon={<PhoneMissed className="h-3.5 w-3.5" />}
            value={d.abandonRate}
            max={100}
            target={t?.abandonRate?.good ?? 3}
            display={fmtPct(d.abandonRate)}
            sev={abandonSev(d, t)}
            footer={<SevPill sev={abandonSev(d, t)} okText="목표 이내" warnText="목표 초과" />}
          />
          <WaitingCard count={d.waitingCnt} sev={waitingSev(d, t)} />
          <AlarmCard
            minor={d.alarm.minor}
            major={d.alarm.major}
            critical={d.alarm.critical}
            onLink={() => open({ title: '알람센터 (장애 이력)', sub: '알람 카드 드릴다운 · TB_CC_ERRHISTORY', widgetType: 'alarm-center' })}
          />
        </div>
      </section>

      {/* ═══ 시스템 신호등 (LED 칩) ═══ */}
      <section>
        <SectionEyebrow sev={worstSeverity(d.systems.map((s) => s.severity))}>프로세스 상태</SectionEyebrow>
        <SystemChipRow
          systems={sortedSystems}
          onLink={() => open({ title: '노드 상세 (시스템 자원)', sub: '시스템 신호등 드릴다운 · SYSTEM:STAT', widgetType: 'node-detail', options: drillOptions })}
        />
      </section>

      {/* ═══ 요약 3카드 ═══ */}
      <section className="flex min-h-0 flex-1 flex-col">
        <SectionEyebrow sev={overall.sev}>상세 현황</SectionEyebrow>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1.2fr_1.2fr_1fr_1fr]">
          <SummaryCard
            title="회선 포화"
            icon={<Cable className="h-4 w-4 text-bt-fg-muted" />}
            link="회선 현황"
            sev={d.trunks.summary.blockCnt > 0 || d.trunks.summary.errorCnt > 0 || d.trunks.summary.saturatedCnt > 0 ? 'danger' : 'success'}
          >
            <TrunkPanel trunks={d.trunks} />
          </SummaryCard>

          <SummaryCard
            title="큐 현황"
            icon={<ListOrdered className="h-4 w-4 text-bt-fg-muted" />}
            link="큐 모니터"
            sev={worstSeverity(d.queues.map((q) => q.sev))}
            onLink={() => open({ title: '큐(CTIQ) 상태 매트릭스', sub: '큐 현황 드릴다운 · IC:CTIQ', widgetType: 'ctiq-status-matrix', options: drillOptions })}
          >
            <QueueChart queues={d.queues} />
          </SummaryCard>

          <SummaryCard title="채널 현황" icon={<Radio className="h-4 w-4 text-bt-fg-muted" />} link="채널 상세" sev={worstSeverity(d.channels.items.map((c) => c.severity))}>
            <ChannelPanel channels={d.channels} />
          </SummaryCard>

          <SummaryCard
            title="상담사 상태"
            icon={<Headset className="h-4 w-4 text-bt-fg-muted" />}
            link="상담사 현황"
            sev="info"
            onLink={() => open({ title: '상담사 상태 매트릭스', sub: '상담사 카드 드릴다운 · IC:AGENT', widgetType: 'agent-status-matrix', options: drillOptions })}
          >
            <AgentDonut data={d} />
          </SummaryCard>

          <SummaryCard
            title="통화 품질"
            icon={<Activity className="h-4 w-4 text-bt-fg-muted" />}
            link="품질 위험판"
            sev={d.quality.bad > 0 ? 'danger' : d.quality.warn > 0 ? 'notice' : 'success'}
          >
            <QualityPanel quality={d.quality} />
          </SummaryCard>
        </div>
      </section>
    </div>
  );
}

// ─── 포맷 ──────────────────────────────────────────────────────

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** 심각도 목록 중 가장 위험한 값 (없으면 정상). */
const SEV_RANK: Record<Severity, number> = { success: 0, notice: 1, warning: 2, danger: 3 };
function worstSeverity(list: Severity[]): Severity {
  return list.reduce<Severity>((acc, s) => (SEV_RANK[s] > SEV_RANK[acc] ? s : acc), 'success');
}

/** 칩 호버 패널용 — 프로세스를 소속 시스템(SYSTEM_NAME)별로 묶는다. */
interface ProcessGroup {
  system: string;
  processes: SystemProcess[];
}

/**
 * 프로세스 목록을 소속 시스템별로 그룹화.
 * - 그룹 안: 위험한 프로세스가 위로 (심각도 내림차순)
 * - 그룹 간: 그룹 내 최악 심각도가 높은 시스템이 위로, 동률이면 이름순
 */
function groupProcessesBySystem(processes: SystemProcess[]): ProcessGroup[] {
  const map = new Map<string, SystemProcess[]>();
  for (const p of processes) {
    const key = p.system?.trim() || '기타';
    const arr = map.get(key);
    if (arr) arr.push(p);
    else map.set(key, [p]);
  }
  const groups: ProcessGroup[] = [];
  for (const [system, list] of map) {
    groups.push({ system, processes: [...list].sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]) });
  }
  const worst = (g: ProcessGroup) => g.processes.reduce((m, p) => Math.max(m, SEV_RANK[p.severity]), 0);
  groups.sort((a, b) => worst(b) - worst(a) || a.system.localeCompare(b.system));
  return groups;
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

function CardLink({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-bt-primary transition-colors hover:bg-bt-primary-soft hover:text-bt-primary-hover ${className}`}
    >
      <span className="underline decoration-bt-primary/40 underline-offset-2 group-hover:decoration-bt-primary-hover">{children}</span>
      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
    </button>
  );
}

// ─── ECharts 컨테이너 자동 리사이즈 래퍼 ───────────────────────

/**
 * echarts-for-react 는 window resize 만 감지하고 컨테이너(부모) 폭 변화는 못 잡는다.
 * 그리드 캔버스에서 위젯이 최종 폭으로 자리잡기 전에 차트가 초기화되면 SVG 가 좁은 폭에
 * 고정돼 좌측으로 치우친다. ResizeObserver 로 컨테이너 변화 시 resize() 를 호출해 보정한다.
 */
function AutoResizeECharts(props: ComponentProps<typeof ReactECharts>) {
  const chartRef = useRef<InstanceType<typeof ReactECharts>>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => chartRef.current?.getEchartsInstance()?.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // echarts 루트에 flex justify-center 를 줘, 내부 렌더 블록이 컨테이너보다 좁아도(리사이즈 지연 등)
  // 항상 가운데 정렬되게 한다(좌측 치우침 방지). 폭이 맞으면 no-op.
  return (
    <div ref={boxRef} className="w-full">
      <ReactECharts ref={chartRef} {...props} className={`flex justify-center ${props.className ?? ''}`} />
    </div>
  );
}

// ─── 게이지 카드 (ECharts 반원 게이지) ──────────────────────────

interface GaugeCardProps {
  label: string;
  icon?: ReactNode;
  value: number | null;
  max: number;
  display: string;
  sev: Severity;
  /** 목표(임계)치 — 게이지 밴드 위에 틱 마커로 표기 (시안 01-healthboard.html). */
  target?: number;
  /** 게이지 바로 아래 보조 캡션(예: 인입·응대 건수). 푸터(SevPill) 위에 표시. */
  caption?: ReactNode;
  footer?: ReactNode;
}

// 게이지 공통 형상 (메인 호 / 목표 틱 두 시리즈가 동일 좌표를 공유)
const GAUGE_GEOM = { startAngle: 200, endAngle: -20, min: 0, radius: '116%', center: ['50%', '82%'] as [string, string] };

function GaugeCard({ label, icon, value, max, display, sev, target, caption, footer }: GaugeCardProps) {
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
        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-bt-fg-muted">
          {icon}
          {label}
        </span>
        {target != null && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-bt-fg-muted">
            <span className="h-2.5 w-0.5 rounded-full bg-[#3a3f47]" />
            목표 {target}
          </span>
        )}
      </div>
      <AutoResizeECharts option={option} style={{ height: 104, width: '100%' }} notMerge lazyUpdate opts={{ renderer: 'svg' }} />
      <div className="mt-auto flex w-full flex-col items-center gap-1 pt-1">
        {caption && <div className="w-full text-center">{caption}</div>}
        <div className="flex min-h-[28px] w-full items-center justify-center">{footer}</div>
      </div>
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
      <div className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold uppercase tracking-wide text-bt-fg-muted">
        <Hourglass className="h-3.5 w-3.5" />
        현재 대기
      </div>
      {/* 게이지 카드의 차트(104px)와 동일 높이 밴드 + 하단 정렬 → 게이지 readout 라인에 숫자를 맞춘다 */}
      <div className="flex h-[104px] items-end justify-center">
        <div className="flex items-baseline gap-1.5">
          <span className={`bt-countup tabular-nums text-[60px] font-extrabold leading-none ${SEV_TEXT[sev]}`}>{count}</span>
          <span className="text-[14px] font-medium text-bt-fg-muted">콜</span>
        </div>
      </div>
      <div className="mt-auto flex min-h-[28px] w-full items-center justify-center pt-1">
        <SevPill sev={sev} okText={sevLabel.success} warnText={sevLabel[sev]} />
      </div>
    </div>
  );
}

// ─── 알람 카드 ─────────────────────────────────────────────────

function AlarmCard({ minor, major, critical, onLink }: { minor: number; major: number; critical: number; onLink: () => void }) {
  const active = critical > 0;
  // 위험(critical) 0 이면 가장 높은 단계 톤으로 카드 외곽을 칠하고, 전부 0 이면 정상(중립) 톤.
  const topSev: Severity = critical > 0 ? 'danger' : major > 0 ? 'warning' : minor > 0 ? 'notice' : 'success';
  const frame: Record<Severity, string> = {
    success: 'border-bt-border bg-bt-bg',
    notice: 'border-bt-notice/25 bg-bt-notice-soft',
    warning: 'border-bt-warning/25 bg-bt-warning-soft',
    danger: 'border-bt-danger/25 bg-bt-danger-soft',
  };
  return (
    <div className={`relative flex flex-col items-center overflow-hidden rounded-xl border px-4 pt-4 pb-2.5 bt-shadow ${frame[topSev]} ${active ? 'bt-pulse-ring' : ''}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${SEV_BG[topSev]}`} />
      {/* 헤더 — '알람' 타이틀에 주의/경고/위험 인디케이터를 바싹 붙임. 알람센터 링크는 우측 상단 절대배치 */}
      <div className="flex w-full items-center gap-2">
        <div className={`inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide ${SEV_TEXT[topSev]}`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          알람
        </div>
        <div className="inline-flex items-center gap-1.5">
          <AlarmStatusLabel sev="notice" label="주의" />
          <AlarmStatusLabel sev="warning" label="경고" />
          <AlarmStatusLabel sev="danger" label="위험" pulse={active} />
        </div>
      </div>
      <CardLink className="absolute right-2 top-3.5" onClick={onLink}>
        알람센터
      </CardLink>
      {/* 숫자 — 위험→경고→주의 순, 현재대기와 동일 위치(104px 밴드 하단 정렬). 숫자 우측에 '건' 단위(현재대기 '콜'과 동일) */}
      <div className="flex h-[104px] w-full items-end justify-center">
        <div className="flex flex-1 items-baseline justify-center gap-1">
          <span className={`bt-countup text-[48px] font-extrabold leading-none tabular-nums ${SEV_TEXT.danger}`}>{critical}</span>
          <span className="text-[14px] font-medium text-bt-fg-muted">건</span>
        </div>
        <div className="h-12 w-px self-end bg-bt-border" />
        <div className="flex flex-1 items-baseline justify-center gap-1">
          <span className={`bt-countup text-[48px] font-extrabold leading-none tabular-nums ${SEV_TEXT.warning}`}>{major}</span>
          <span className="text-[14px] font-medium text-bt-fg-muted">건</span>
        </div>
        <div className="h-12 w-px self-end bg-bt-border" />
        <div className="flex flex-1 items-baseline justify-center gap-1">
          <span className={`bt-countup text-[48px] font-extrabold leading-none tabular-nums ${SEV_TEXT.notice}`}>{minor}</span>
          <span className="text-[14px] font-medium text-bt-fg-muted">건</span>
        </div>
      </div>
      {/* 하단 상태 — 3단계 중 최고 심각도. 현재대기와 동일하게 가운데 정렬 SevPill */}
      <div className="mt-auto flex min-h-[28px] w-full items-center justify-center pt-1">
        <SevPill sev={topSev} okText="정상" warnText={topSev === 'danger' ? '위험' : topSev === 'warning' ? '경고' : '주의'} />
      </div>
    </div>
  );
}

function AlarmStatusLabel({ sev, label, pulse = false }: { sev: Severity; label: string; pulse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${SEV_TEXT[sev]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${SEV_BG[sev]} ${pulse ? 'bt-pulse' : ''}`} />
      {label}
    </span>
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
const PROC_LABEL: Record<Severity, string> = { success: '정상', notice: '주의', warning: '경고', danger: '위험' };

/** 칩 본문(시각). 실제 칩(HoverCard 트리거)과 폭 측정용 미러가 공유한다. asChild 위해 ref 포워딩. */
const SystemChipBody = forwardRef<HTMLDivElement, { system: SystemHealth } & HTMLAttributes<HTMLDivElement>>(({ system, className = '', ...rest }, ref) => {
  const sev = system.severity;
  const ok = sev === 'success';
  return (
    <div
      ref={ref}
      {...rest}
      className={`flex shrink-0 cursor-default items-center gap-2.5 rounded-lg border px-4 py-2.5 transition-shadow hover:bt-shadow ${CHIP_FRAME[sev]} ${className}`}
    >
      <span className={`h-3 w-3 rounded-full ${SEV_BG[sev]} ${sev === 'danger' ? 'bt-pulse' : ''}`} style={{ boxShadow: `0 0 8px ${SEV_HEX[sev]}` }} />
      <div className="leading-tight">
        <div className="text-[13px] font-bold">{system.name}</div>
        <div className={`text-[11px] font-medium ${ok ? 'text-bt-success' : `font-bold ${SEV_TEXT[sev]}`}`}>
          {CHIP_LABEL[sev]} · 프로세스 {system.up}/{system.total}
          {ok ? '' : ' ↓'}
        </div>
      </div>
    </div>
  );
});
SystemChipBody.displayName = 'SystemChipBody';

function SystemChip({ system }: { system: SystemHealth }) {
  return (
    <HoverCard openDelay={80} closeDelay={80}>
      <HoverCardTrigger asChild>
        <SystemChipBody system={system} />
      </HoverCardTrigger>
      <HoverCardContent align="start" sideOffset={8} className="w-72 overflow-hidden border-bt-border bg-bt-bg p-0 text-bt-fg shadow-lg">
        <SystemProcessPanel system={system} />
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * 시스템 칩 행 — 단일 행에 들어가는 만큼만 칩을 그리고, 넘치면 "+N" 배지로 접는다.
 * 측정용 숨김 미러(SystemChipBody 전체)로 각 칩 실제 폭을 구해, 컨테이너 폭에 맞춰 표시 개수를 계산한다.
 */
function SystemChipRow({ systems, onLink }: { systems: SystemHealth[]; onLink: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(systems.length);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const mirror = measureRef.current;
    if (!wrap || !mirror) return;
    const GAP = 12; // gap-3
    const LINK_RESERVE = 92; // '노드 상세' 링크 폭
    const BADGE_RESERVE = 52; // '+N' 배지 폭
    const fit = (avail: number) => {
      let used = 0;
      let count = 0;
      for (const chip of Array.from(mirror.children) as HTMLElement[]) {
        const w = chip.offsetWidth + (count > 0 ? GAP : 0);
        if (used + w > avail) break;
        used += w;
        count++;
      }
      return count;
    };
    const recompute = () => {
      const content = wrap.clientWidth - 40; // px-5 좌우 패딩
      // 링크 자리만 빼고 전부 들어가면 배지 없이 전부 표시
      if (fit(content - LINK_RESERVE) >= systems.length) {
        setVisible(systems.length);
        return;
      }
      setVisible(Math.max(1, fit(content - LINK_RESERVE - BADGE_RESERVE)));
    };
    const ro = new ResizeObserver(recompute);
    ro.observe(wrap);
    recompute();
    return () => ro.disconnect();
  }, [systems]);

  const hidden = systems.slice(visible);
  return (
    <div ref={wrapRef} className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-bt-border bg-bt-bg px-5 py-3.5 bt-shadow">
      {/* 측정용 숨김 미러 — 모든 칩 본문의 실제 폭 산출 (레이아웃 비영향) */}
      <div ref={measureRef} aria-hidden className="pointer-events-none absolute -left-[9999px] top-0 flex gap-3 opacity-0">
        {systems.map((s) => (
          <SystemChipBody key={s.code} system={s} />
        ))}
      </div>
      {systems.slice(0, visible).map((s) => (
        <SystemChip key={s.code} system={s} />
      ))}
      {hidden.length > 0 && <SystemOverflowBadge hidden={hidden} />}
      <CardLink className="ml-auto shrink-0" onClick={onLink}>
        노드 상세
      </CardLink>
    </div>
  );
}

/** "+N" 배지 — 접힌 시스템 개수. 호버 시 접힌 시스템 목록(이름·상태)을 팝오버로 보여준다. */
function SystemOverflowBadge({ hidden }: { hidden: SystemHealth[] }) {
  const worst = worstSeverity(hidden.map((s) => s.severity));
  return (
    <HoverCard openDelay={80} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="flex shrink-0 cursor-default items-center gap-1.5 rounded-lg border border-bt-border bg-bt-bg-muted px-3 py-2.5 text-[13px] font-bold text-bt-fg-muted transition-shadow hover:bt-shadow"
        >
          <span className={`h-2 w-2 rounded-full ${SEV_BG[worst]} ${worst === 'danger' ? 'bt-pulse' : ''}`} />+{hidden.length}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="end" sideOffset={8} className="w-64 overflow-hidden border-bt-border bg-bt-bg p-0 text-bt-fg shadow-lg">
        <div className="border-b border-bt-border px-3.5 py-2.5 text-[12px] font-bold">그 외 시스템 {hidden.length}</div>
        <ul className="max-h-64 overflow-y-auto py-1">
          {hidden.map((s) => (
            <li key={s.code} className="flex items-center justify-between gap-2 px-3.5 py-1.5 transition-colors hover:bg-bt-bg-muted">
              <span className="flex min-w-0 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${SEV_BG[s.severity]} ${s.severity === 'danger' ? 'bt-pulse' : ''}`} />
                <span className="truncate text-[12px] font-semibold">{s.name}</span>
              </span>
              <span className="shrink-0 text-[11px] text-bt-fg-muted">
                {CHIP_LABEL[s.severity]} · {s.up}/{s.total}
              </span>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}

/** 칩 호버 팝오버 — 해당 도메인의 프로세스를 소속 시스템별로 묶어 표시 (그룹 내 위험순). */
function SystemProcessPanel({ system }: { system: SystemHealth }) {
  const sev = system.severity;
  const groups = useMemo(() => groupProcessesBySystem(system.processes), [system.processes]);
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-bt-border px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${SEV_BG[sev]}`} style={{ boxShadow: `0 0 6px ${SEV_HEX[sev]}` }} />
          <span className="text-[13px] font-bold">{system.name}</span>
        </div>
        <span className="text-[11px] font-medium text-bt-fg-muted">
          정상 <b className="tabular-nums text-bt-success">{system.up}</b>
          <span className="tabular-nums">/{system.total}</span>
        </span>
      </div>
      {groups.length > 0 ? (
        <div className="max-h-64 overflow-y-auto py-1">
          {groups.map((g) => (
            <div key={g.system}>
              {/* 시스템(SYSTEM_NAME) 그룹 헤더 — 서버 아이콘으로 시스템임을 표시 */}
              <div className="flex items-center gap-1.5 px-3.5 pt-2 pb-1">
                <Server className="h-3 w-3 shrink-0 text-bt-fg-muted" strokeWidth={2} />
                <span className="truncate text-[10.5px] font-bold uppercase tracking-wide text-bt-fg-muted">{g.system}</span>
                <span className="ml-auto text-[10px] tabular-nums text-bt-fg-muted">{g.processes.length}</span>
              </div>
              <ul>
                {g.processes.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="flex items-center justify-between gap-2 py-1.5 pl-7 pr-3.5 transition-colors hover:bg-bt-bg-muted">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${SEV_BG[p.severity]} ${p.severity === 'danger' ? 'bt-pulse' : ''}`} />
                      <span className="truncate text-[12px] text-bt-fg">{p.name}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${SEV_BG_SOFT[p.severity]} ${SEV_TEXT[p.severity]}`}>
                      {PROC_LABEL[p.severity]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-3.5 py-4 text-center text-[12px] text-bt-fg-muted">프로세스 정보 없음</div>
      )}
    </div>
  );
}

// ─── 요약 카드 셸 ──────────────────────────────────────────────

function SummaryCard({
  title,
  icon,
  link,
  sev,
  onLink,
  children,
}: {
  title: string;
  icon?: ReactNode;
  link: string;
  sev: Severity | 'info';
  /** 링크 클릭 핸들러 — 전용 위젯(드릴다운)이 있는 카드에만 전달. 없으면 링크는 비활성. */
  onLink?: () => void;
  children: ReactNode;
}) {
  // 'info' = 상태(좋고나쁨)가 없는 정보 카드 — 회색(비활성 느낌) 대신 파랑(정보) 액센트.
  const accent = sev === 'info' ? 'bg-bt-primary' : SEV_BG[sev];
  return (
    <div className="relative flex h-full min-h-[230px] flex-col overflow-hidden rounded-xl border border-bt-border bg-bt-bg bt-shadow">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-center justify-between border-b border-bt-border px-5 py-3.5">
        <h2 className="flex items-center gap-1.5 text-[14px] font-bold">
          {icon}
          {title}
        </h2>
        <CardLink onClick={onLink}>{link}</CardLink>
      </div>
      <div className="flex flex-1 flex-col justify-center px-5 py-4">{children}</div>
    </div>
  );
}

// ─── 채널 현황 (IVR/SLEE 채널 점유율 막대 · 점유율순 Top-N) ────────

function ChannelPanel({ channels }: { channels: ChannelBoard }) {
  const s = channels.summary;
  const worst = worstSeverity(channels.items.map((c) => c.severity));
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* 요약 — 전체 점유율 + 시스템 수 */}
      <div className="flex shrink-0 items-center justify-between rounded-lg bg-bt-bg-muted px-3 py-2">
        <span className="text-[12px] text-bt-fg-muted">
          전체 <b className="tabular-nums text-bt-fg">{fmtPct(s.rate)}%</b>{' '}
          <span className="tabular-nums text-[11px]">
            {s.busy}/{s.total}
          </span>
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            worst === 'success' ? 'bg-bt-success-soft text-bt-success' : `${SEV_BG_SOFT[worst]} ${SEV_TEXT[worst]}`
          }`}
        >
          {worst !== 'success' && <span className={`h-1.5 w-1.5 rounded-full ${SEV_BG[worst]} ${worst === 'danger' ? 'bt-pulse' : ''}`} />}
          {worst === 'danger' ? '포화' : worst === 'notice' ? '주의' : '여유'} · {s.systemCnt}
        </span>
      </div>

      {/* 시스템별 점유율 막대 (점유율순) — 인바운드(진)+아웃바운드(연) 분리 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {channels.items.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {channels.items.map((c, i) => {
              const inPct = c.total > 0 ? (c.inBusy / c.total) * 100 : 0;
              return (
                <div key={`${c.systemId}-${i}`} className="flex items-center gap-2 text-[12px]">
                  <span className="flex w-[112px] min-w-0 shrink-0 items-center gap-1.5 font-semibold">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${SEV_BG[c.severity]} ${c.severity === 'danger' ? 'bt-pulse' : ''}`} />
                    <span className="truncate" title={c.name}>
                      {c.name}
                    </span>
                  </span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bt-bg-muted">
                    {/* 총점유(연한색) */}
                    <div className={`absolute inset-y-0 left-0 opacity-40 ${SEV_BG[c.severity]}`} style={{ width: `${Math.min(100, c.rate)}%` }} />
                    {/* 인바운드 점유(진한색) */}
                    <div className={`absolute inset-y-0 left-0 ${SEV_BG[c.severity]}`} style={{ width: `${Math.min(100, inPct)}%` }} />
                  </div>
                  <span className={`w-9 shrink-0 text-right tabular-nums font-bold ${SEV_TEXT[c.severity]}`}>{fmtPct(c.rate)}%</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-[12px] text-bt-fg-muted">채널 데이터 없음</div>
        )}
      </div>

      {/* 푸터 — 인바운드/아웃바운드 점유 채널 */}
      <div className="shrink-0 border-t border-bt-border pt-1.5 text-[11px] text-bt-fg-muted">
        인바운드 <b className="tabular-nums text-bt-fg">{s.inBusy}</b> · 아웃바운드 <b className="tabular-nums">{s.outBusy}</b> 점유
      </div>
    </div>
  );
}

// ─── 회선 포화 (SIP 트렁크 점유율 막대 · 사용율순 Top-N) ─────────

function TrunkPanel({ trunks }: { trunks: TrunkBoard }) {
  const s = trunks.summary;
  const alert = s.saturatedCnt > 0 || s.blockCnt > 0 || s.errorCnt > 0;
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* 요약 — 전체 점유율 + 포화/블록/이상 배지 */}
      <div className="flex shrink-0 items-center justify-between rounded-lg bg-bt-bg-muted px-3 py-2">
        <span className="text-[12px] text-bt-fg-muted">
          전체 <b className="tabular-nums text-bt-fg">{fmtPct(s.rate)}%</b>{' '}
          <span className="tabular-nums text-[11px]">
            {s.busyLine}/{s.totalLine}
          </span>
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            alert ? 'bg-bt-danger-soft text-bt-danger' : 'bg-bt-success-soft text-bt-success'
          }`}
        >
          {alert && <span className="h-1.5 w-1.5 rounded-full bg-bt-danger bt-pulse" />}
          {s.saturatedCnt > 0 ? `포화 ${s.saturatedCnt}` : s.blockCnt > 0 ? `블록 ${s.blockCnt}` : s.errorCnt > 0 ? `이상 ${s.errorCnt}` : '여유'}
        </span>
      </div>

      {/* Top-N 점유율 막대 · 임계 83 마커 — 카드 높이 초과 시 목록만 스크롤 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {trunks.items.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {trunks.items.map((t, i) => {
              // 인라인 한 줄: 이름 + 미니 점유율 막대(수신 진·총점유 연·83 마커) + %
              const inPct = t.totalLine > 0 ? (t.inBusy / t.totalLine) * 100 : 0;
              return (
                <div key={`${t.name}-${i}`} className="flex items-center gap-2 text-[12px]">
                  <span className="flex w-[112px] min-w-0 shrink-0 items-center gap-1.5 font-semibold">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${SEV_BG[t.severity]} ${t.severity === 'danger' ? 'bt-pulse' : ''}`} />
                    <span className="truncate" title={t.name}>
                      {t.name}
                    </span>
                    {t.block === 1 && <span className="shrink-0 text-[9px] font-bold text-bt-danger">BLOCK</span>}
                    {t.registered === 0 && <span className="shrink-0 text-[9px] font-bold text-bt-danger">미등록</span>}
                  </span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bt-bg-muted">
                    {/* 총점유(수신+발신) — 연한색 */}
                    <div className={`absolute inset-y-0 left-0 opacity-40 ${SEV_BG[t.severity]}`} style={{ width: `${Math.min(100, t.rate)}%` }} />
                    {/* 수신 점유 — 진한색 */}
                    <div className={`absolute inset-y-0 left-0 ${SEV_BG[t.severity]}`} style={{ width: `${Math.min(100, inPct)}%` }} />
                    {/* 포화 임계 83 마커 */}
                    <span className="absolute inset-y-0 w-px bg-[#3a3f47]" style={{ left: '83%' }} />
                  </div>
                  <span className={`w-9 shrink-0 text-right tabular-nums font-bold ${SEV_TEXT[t.severity]}`}>{fmtPct(t.rate)}%</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-[12px] text-bt-fg-muted">트렁크 데이터 없음</div>
        )}
      </div>

      {/* 푸터 — 상태 카운트 (정상/미등록·이상/블록) */}
      <div className="shrink-0 border-t border-bt-border pt-1.5 text-[11px] text-bt-fg-muted">
        정상 <b className="tabular-nums text-bt-fg">{s.normalCnt}</b> · 미등록·이상 <b className="tabular-nums">{s.errorCnt}</b> · 블록 <b className="tabular-nums">{s.blockCnt}</b>
      </div>
    </div>
  );
}

// ─── 큐 현황 (ECharts 가로 바) ─────────────────────────────────

function QueueChart({ queues }: { queues: QueueRow[] }) {
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
              formatter: q.waitCnt != null ? String(q.waitCnt) : q.serviceLevel != null ? `SL ${q.serviceLevel}%` : '',
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
        <AutoResizeECharts option={option} style={{ height: queues.length * 34, width: '100%' }} notMerge lazyUpdate />
      ) : (
        <div className="py-6 text-center text-[12px] text-bt-fg-muted">위험 큐 없음</div>
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
        <AutoResizeECharts option={option} style={{ height: 116, width: 116 }} notMerge lazyUpdate />
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
        <AutoResizeECharts option={option} style={{ height: 14, width: '100%' }} notMerge lazyUpdate />
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
