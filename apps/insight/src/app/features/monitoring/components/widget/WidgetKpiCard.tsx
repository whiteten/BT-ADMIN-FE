import { fieldMeta, formatValue } from './widgetFormat';
import type { DatasetDetail, KpiDirection } from '../../types';

interface WidgetKpiCardProps {
  detail: DatasetDetail;
  measure: string;
  unit?: string;
  kpiDirection?: KpiDirection;
  threshold?: { warn?: number; danger?: number };
  rows: Record<string, unknown>[];
}

const COLOR_OK = '#0a8a4a';
const COLOR_WARN = '#b76e00';
const COLOR_DANGER = '#c92a2a';
const COLOR_NEUTRAL = '#085fb5';

/** 임계값·방향 기준 KPI 색상. */
function kpiColor(value: number, direction: KpiDirection, warn?: number, danger?: number): string {
  if (direction === 'NEUTRAL' || (warn === undefined && danger === undefined)) return COLOR_NEUTRAL;
  if (direction === 'HIGHER_BETTER') {
    if (danger !== undefined && value <= danger) return COLOR_DANGER;
    if (warn !== undefined && value <= warn) return COLOR_WARN;
    return COLOR_OK;
  }
  // LOWER_BETTER
  if (danger !== undefined && value >= danger) return COLOR_DANGER;
  if (warn !== undefined && value >= warn) return COLOR_WARN;
  return COLOR_OK;
}

/** 통계 PanelKpiCard 패턴 — 단일 측정값(현재값) 카드. */
export default function WidgetKpiCard({ detail, measure, unit, kpiDirection = 'NEUTRAL', threshold, rows }: WidgetKpiCardProps) {
  const m = fieldMeta(detail, measure);
  const value = rows.length > 0 ? Number(rows[0][measure] ?? 0) : 0;
  const color = kpiColor(value, kpiDirection, threshold?.warn, threshold?.danger);

  if (!measure) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-bt-fg-muted)]">측정값을 매핑해주세요.</div>;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 p-3">
      <div className="text-[12px] text-[var(--color-bt-fg-muted)]">{m?.displayName ?? measure}</div>
      <div className="flex items-baseline gap-1 font-mono font-bold" style={{ color }}>
        <span className="text-[40px] leading-none">{formatValue(value, m?.columnFormat)}</span>
        {unit && <span className="text-[16px]">{unit}</span>}
      </div>
      {(threshold?.warn !== undefined || threshold?.danger !== undefined) && (
        <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[var(--color-bt-fg-muted)]">
          {threshold?.warn !== undefined && (
            <span>
              경고 {kpiDirection === 'LOWER_BETTER' ? '≥' : '≤'} {threshold.warn.toLocaleString('ko-KR')}
            </span>
          )}
          {threshold?.danger !== undefined && (
            <span>
              장애 {kpiDirection === 'LOWER_BETTER' ? '≥' : '≤'} {threshold.danger.toLocaleString('ko-KR')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
