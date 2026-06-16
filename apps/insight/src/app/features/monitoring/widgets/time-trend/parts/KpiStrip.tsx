import { ArrowDown, ArrowUp } from 'lucide-react';
import type { TimeTrendCurrent, TimeTrendPeak } from '../types';

interface KpiStripProps {
  current: TimeTrendCurrent;
  peak: TimeTrendPeak;
}

/** 30분전 대비 델타 칩. goodLow=true 면 상승이 나쁨(빨강). */
function Delta({ value, goodLow }: { value: number | null; goodLow?: boolean }) {
  if (value == null) {
    return <span className="text-[11px] text-[var(--color-bt-fg-muted)]">—</span>;
  }
  const up = value > 0;
  const bad = goodLow ? up : false;
  const color = bad ? 'text-[var(--color-bt-danger)]' : up ? 'text-[var(--color-bt-success)]' : 'text-[var(--color-bt-fg-muted)]';
  const Icon = value < 0 ? ArrowDown : ArrowUp;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${color}`}>
      {value !== 0 && <Icon size={11} />}
      {Math.abs(value)}% <span className="font-normal text-[var(--color-bt-fg-muted)]">30분전</span>
    </span>
  );
}

function Tile({ label, value, unit, danger, children }: { label: string; value: string | number; unit?: string; danger?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`flex flex-col bg-white border border-[var(--color-bt-border)] rounded-lg p-3 ${danger ? 'ring-1 ring-[var(--color-bt-danger)]/40' : ''}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-bt-fg-muted)]">{label}</div>
      <div className="flex items-baseline justify-center gap-1 mt-1">
        <span className={`text-[24px] font-extrabold leading-none tabular-nums ${danger ? 'text-[var(--color-bt-danger)]' : ''}`}>{value}</span>
        {unit && <span className="text-[12px] text-[var(--color-bt-fg-muted)]">{unit}</span>}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** 상단 KPI 4타일 — 현재 인입·미처리·가용 상담사·오늘 피크 (meeting-009 D9-7). */
export default function KpiStrip({ current, peak }: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Tile label="현재 인입" value={current.inbound.toLocaleString()} unit="콜/h">
        <Delta value={current.inboundDelta} />
      </Tile>
      <Tile label="현재 미처리" value={current.unhandled.toLocaleString()} unit="콜" danger={current.unhandled > 0}>
        <Delta value={current.unhandledDelta} goodLow />
      </Tile>
      <Tile label="현재 가용 상담사" value={current.available.toLocaleString()} unit="명">
        <span className="text-[11px] text-[var(--color-bt-fg-muted)]">현재값(추세 없음)</span>
      </Tile>
      <Tile label="오늘 피크" value={peak.time ?? '—'} unit={peak.time ? `· ${peak.value.toLocaleString()}콜/h` : undefined}>
        <span className="text-[11px] text-[var(--color-bt-fg-muted)]">비교 대상 없음</span>
      </Tile>
    </div>
  );
}
