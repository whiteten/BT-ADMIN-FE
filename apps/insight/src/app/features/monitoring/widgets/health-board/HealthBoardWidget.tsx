import { type ReactNode, useMemo } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { DEMO_HEALTH, isHealthDemoMode } from './demoData';
import {
  SEV_BG,
  SEV_BG_SOFT,
  SEV_HEX,
  SEV_TEXT,
  abandonSev,
  agentDonutSegments,
  answerRateSev,
  gaugeArc,
  gaugeTick,
  overallStatus,
  serviceLevelSev,
  toHealthData,
  waitingSev,
} from './helpers';
import type { HealthBoardData, HealthBoardThresholds, QualityInfo, QueueRow, Severity, SystemHealth } from './types';
import NoData from '@/components/custom/NoData';

/**
 * 종합 헬스보드 위젯 — "지금 우리 센터, 정상인가?"
 *
 * 시안: docs/insight/monitoring/mvp-design/wireframes/01-healthboard.html
 * - KPI 스트립(상태 5종): 응대율·SL·포기율 게이지 / 현재대기 / 알람
 * - 시스템 신호등(IE·IC·IR 노드 헬스)
 * - 요약 3카드: 큐 현황 / 상담사 상태 도넛 / 통화 품질(MoS)
 *
 * 모션(pulse 등)은 insight 정책상 사용하지 않고 정적 색·테두리로 상태를 표현한다.
 */
export interface HealthBoardWidgetProps {
  data: unknown;
  options?: { thresholds?: HealthBoardThresholds } & Record<string, unknown>;
  widgetId?: number | string;
  onRequestPause?: () => void;
}

export default function HealthBoardWidget({ data, options }: HealthBoardWidgetProps) {
  const d = useMemo<HealthBoardData>(() => (isHealthDemoMode() ? DEMO_HEALTH : toHealthData(data)), [data]);
  const t = options?.thresholds;

  const hasData = d.answerRate != null || d.waitingCnt > 0 || d.systems.length > 0 || d.agents.available + d.agents.talking > 0;
  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center bg-bt-bg-canvas">
        <NoData message="데이터 수신 중입니다." />
      </div>
    );
  }

  const overall = overallStatus(d);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-bt-bg-canvas p-4">
      {/* 종합 상태 바 */}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-bt-bg bt-shadow px-5 py-3">
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 ${SEV_BG_SOFT[overall.sev]}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${SEV_BG[overall.sev]}`} />
          <span className={`text-[13px] font-bold ${SEV_TEXT[overall.sev]}`}>{overall.sev === 'success' ? '정상 운영 중' : `주의 필요 · 위험 ${overall.dangerCnt}건`}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-bt-success">
          <span className="h-2 w-2 rounded-full bg-bt-success" />
          LIVE
        </div>
      </div>

      {/* KPI 스트립 */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <GaugeCard
          label="응대율"
          display={fmtPct(d.answerRate)}
          fraction={(d.answerRate ?? 0) / 100}
          targetFraction={0.96}
          sev={answerRateSev(d, t)}
          footer={
            <div className="flex items-center justify-center gap-3 pt-1 text-[12px]">
              <span className="text-bt-fg-muted">
                인입 <b className="font-mono tabular-nums text-bt-fg">{d.inboundCnt.toLocaleString()}</b>
              </span>
              <span className="h-3 w-px bg-bt-border" />
              <span className="text-bt-fg-muted">
                응대 <b className="font-mono tabular-nums text-bt-success">{d.answeredCnt.toLocaleString()}</b>
              </span>
            </div>
          }
        />
        <GaugeCard
          label="SL"
          display={fmtPct(d.serviceLevel)}
          fraction={(d.serviceLevel ?? 0) / 100}
          targetFraction={0.96}
          sev={serviceLevelSev(d, t)}
          footer={<SevFooter sev={serviceLevelSev(d, t)} okText="목표 충족" warnText="목표 미달" />}
        />
        <GaugeCard
          label="포기율"
          display={fmtPct(d.abandonRate)}
          fraction={(d.abandonRate ?? 0) / 10}
          targetFraction={0.3}
          sev={abandonSev(d, t)}
          footer={<SevFooter sev={abandonSev(d, t)} okText="목표 이내" warnText="목표 초과" />}
        />
        <WaitingCard count={d.waitingCnt} sev={waitingSev(d, t)} />
        <AlarmCard danger={d.alarm.danger} warn={d.alarm.warn} />
      </section>

      {/* 시스템 신호등 */}
      <section className="flex flex-wrap items-center gap-3 rounded-xl bg-bt-bg bt-shadow px-5 py-3.5">
        <span className="mr-1 text-[12px] font-bold uppercase tracking-wide text-bt-fg-muted">시스템</span>
        {d.systems.map((s) => (
          <SystemChip key={s.code} system={s} />
        ))}
        <span className="ml-auto inline-flex cursor-pointer items-center gap-0.5 text-[12px] font-semibold text-bt-primary">
          노드 상세 <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </section>

      {/* 요약 3카드 */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SummaryCard title="큐 현황" titleSub="· 위험순" link="큐 모니터">
          <div className="flex flex-col gap-3">
            {d.queues.map((q) => (
              <QueueBar key={q.id} queue={q} />
            ))}
            {d.normalQueueCnt > 0 && <div className="text-left text-[11px] text-bt-fg-muted">·· 정상 큐 {d.normalQueueCnt}개</div>}
          </div>
        </SummaryCard>

        <SummaryCard title="상담사 상태" titleSub={`· ${agentTotal(d)}명`} link="상담사 현황">
          <AgentDonut data={d} />
        </SummaryCard>

        <SummaryCard title="통화 품질" titleSub="· MoS" link="품질 위험판">
          <QualityPanel quality={d.quality} />
        </SummaryCard>
      </section>
    </div>
  );
}

// ─── 포맷 ──────────────────────────────────────────────────────

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function agentTotal(d: HealthBoardData): number {
  const a = d.agents;
  return a.available + a.talking + a.wrapup + a.aux + a.offline;
}

// ─── 게이지 카드 ───────────────────────────────────────────────

interface GaugeCardProps {
  label: string;
  display: string;
  fraction: number;
  targetFraction?: number;
  sev: Severity;
  footer?: ReactNode;
}

function GaugeCard({ label, display, fraction, targetFraction, sev, footer }: GaugeCardProps) {
  const tick = targetFraction != null ? gaugeTick(targetFraction) : null;
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-xl bg-bt-bg bt-shadow p-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${SEV_BG[sev]}`} />
      <div className="self-start text-[12px] font-bold uppercase tracking-wide text-bt-fg-muted">{label}</div>
      <svg viewBox="0 0 160 92" className="mt-1 h-[104px] w-[180px]">
        <path d="M16 80 A64 64 0 0 1 144 80" fill="none" stroke="#eef1f6" strokeWidth={14} strokeLinecap="round" />
        <path d={gaugeArc(fraction)} fill="none" stroke={SEV_HEX[sev]} strokeWidth={14} strokeLinecap="round" />
        {tick && <line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="#6a6f78" strokeWidth={2.5} />}
        <text x={80} y={74} textAnchor="middle" className="font-mono" style={{ fontVariantNumeric: 'tabular-nums' }} fontSize={34} fontWeight={800} fill={SEV_HEX[sev]}>
          {display}
        </text>
      </svg>
      <div className="mt-auto w-full self-stretch">{footer}</div>
    </div>
  );
}

function SevFooter({ sev, okText, warnText }: { sev: Severity; okText: string; warnText: string }) {
  if (sev === 'success') {
    return <div className="self-start text-[12px] font-semibold text-bt-success">✓ {okText}</div>;
  }
  return <div className={`self-start text-[12px] font-semibold ${SEV_TEXT[sev]}`}>⚠ {warnText}</div>;
}

// ─── 현재 대기 카드 ────────────────────────────────────────────

function WaitingCard({ count, sev }: { count: number; sev: Severity }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl bg-bt-bg bt-shadow p-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${SEV_BG[sev]}`} />
      <div className="text-[12px] font-bold uppercase tracking-wide text-bt-fg-muted">현재 대기</div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`font-mono text-[64px] font-extrabold leading-none tabular-nums ${SEV_TEXT[sev]}`}>{count}</span>
        <span className="text-[15px] font-medium text-bt-fg-muted">콜</span>
      </div>
      <div className="mt-auto pt-3 text-[12px] text-bt-fg-muted">실시간 대기 호수 · 전 큐 합계</div>
    </div>
  );
}

// ─── 알람 카드 ─────────────────────────────────────────────────

function AlarmCard({ danger, warn }: { danger: number; warn: number }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl border border-bt-danger/20 bg-bt-danger-soft bt-shadow p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-bt-danger" />
      <div className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-bt-danger">
        <AlertTriangle className="h-3.5 w-3.5" />
        알람
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span className="font-mono text-[40px] font-extrabold leading-none tabular-nums text-bt-danger">{danger}</span>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-bt-danger">
            <span className="h-2 w-2 rounded-full bg-bt-danger" />
            위험
          </span>
        </div>
        <div className="h-10 w-px bg-bt-danger/20" />
        <div className="flex flex-col items-center">
          <span className="font-mono text-[40px] font-extrabold leading-none tabular-nums text-bt-warn">{warn}</span>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-bt-warn">
            <span className="h-2 w-2 rounded-full bg-bt-warn" />
            주의
          </span>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-1 pt-3 text-[12px] font-semibold text-bt-primary">
        알람센터 <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

// ─── 시스템 칩 ─────────────────────────────────────────────────

function SystemChip({ system }: { system: SystemHealth }) {
  const down = system.up < system.total;
  return (
    <div className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${down ? 'bg-bt-danger-soft' : 'bg-bt-success-soft'}`}>
      <span className={`h-3 w-3 rounded-full ${down ? 'bg-bt-danger' : 'bg-bt-success'}`} />
      <div>
        <div className="text-[13px] font-bold">{system.name}</div>
        <div className={`text-[11px] font-medium ${down ? 'font-bold text-bt-danger' : 'text-bt-success'}`}>
          {down ? '이상' : '정상'} · 노드 {system.up}/{system.total}
          {down ? ' ↓' : ''}
        </div>
      </div>
    </div>
  );
}

// ─── 요약 카드 셸 ──────────────────────────────────────────────

function SummaryCard({ title, titleSub, link, children }: { title: string; titleSub?: string; link: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl bg-bt-bg bt-shadow">
      <div className="flex items-center justify-between px-5 py-3.5">
        <h2 className="text-[14px] font-bold">
          {title}
          {titleSub && <span className="text-[12px] font-normal text-bt-fg-muted"> {titleSub}</span>}
        </h2>
        <span className="inline-flex cursor-pointer items-center gap-0.5 text-[12px] font-semibold text-bt-primary">
          {link} <ChevronRight className="h-3 w-3" />
        </span>
      </div>
      <div className="px-5 pb-4">{children}</div>
    </div>
  );
}

// ─── 큐 막대 ───────────────────────────────────────────────────

function QueueBar({ queue }: { queue: QueueRow }) {
  const valueText = queue.waitCnt != null ? `${queue.waitCnt} 대기` : queue.serviceLevel != null ? `SL ${queue.serviceLevel}%` : '';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <span className={`h-2 w-2 rounded-full ${SEV_BG[queue.sev]}`} />
          {queue.name}
        </span>
        <span className={`font-mono font-bold tabular-nums ${SEV_TEXT[queue.sev]}`}>{valueText}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-bt-bg-muted">
        <div className={`h-full rounded-full ${SEV_BG[queue.sev]}`} style={{ width: `${Math.max(0, Math.min(100, queue.barPct))}%` }} />
      </div>
    </div>
  );
}

// ─── 상담사 도넛 ───────────────────────────────────────────────

function AgentDonut({ data }: { data: HealthBoardData }) {
  const { segments } = useMemo(() => agentDonutSegments(data.agents), [data.agents]);
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg viewBox="0 0 110 110" className="h-[110px] w-[110px] -rotate-90">
          {segments.map((s) => (
            <circle key={s.key} cx={55} cy={55} r={44} fill="none" stroke={s.color} strokeWidth={14} strokeDasharray={s.dasharray} strokeDashoffset={s.dashoffset} />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[22px] font-extrabold leading-none tabular-nums text-bt-success">{data.agents.available}</span>
          <span className="text-[10px] text-bt-fg-muted">가용</span>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-1.5 text-[12px]">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
            <b className="font-mono tabular-nums">{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── 통화 품질 ─────────────────────────────────────────────────

function QualityPanel({ quality }: { quality: QualityInfo }) {
  const dist = quality.dist;
  const bars: { w: number; color: string; title: string }[] = [
    { w: dist.good, color: '#0a8a4a', title: '좋음' },
    { w: dist.fair, color: '#84cc16', title: '보통' },
    { w: dist.warn, color: '#b76e00', title: '주의' },
    { w: dist.bad, color: '#c92a2a', title: '나쁨' },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center rounded-lg bg-bt-danger-soft px-4 py-2">
          <span className="font-mono text-[28px] font-extrabold leading-none tabular-nums text-bt-danger">{quality.bad}</span>
          <span className="mt-0.5 text-[10px] font-semibold text-bt-danger">{'나쁨 <3.0'}</span>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-bt-warn-soft px-4 py-2">
          <span className="font-mono text-[28px] font-extrabold leading-none tabular-nums text-bt-warn">{quality.warn}</span>
          <span className="mt-0.5 text-[10px] font-semibold text-bt-warn">주의 ~3.5</span>
        </div>
        <div className="flex-1 text-right">
          <div className="text-[11px] text-bt-fg-muted">정상 자리</div>
          <div className="font-mono text-[20px] font-bold tabular-nums text-bt-fg-muted">{quality.normal}</div>
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] text-bt-fg-muted">MoS 등급 분포</div>
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {bars.map((b) => b.w > 0 && <span key={b.title} title={b.title} style={{ width: `${b.w}%`, background: b.color }} />)}
        </div>
      </div>

      {quality.lowestMos != null && (
        <div className="flex items-center justify-between rounded-lg bg-bt-danger-soft px-3 py-2">
          <span className="text-[12px]">
            최저 MoS <b className="font-mono text-[15px] tabular-nums text-bt-danger">{quality.lowestMos.toFixed(1)}</b>
          </span>
          {quality.lowestAgentName && (
            <span className="text-[12px] text-bt-fg-muted">
              {quality.lowestAgentName}
              {quality.lowestAgentDn && <span className="font-mono text-[11px]"> ({quality.lowestAgentDn})</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
