import { useMemo } from 'react';
import type { DatasetDetail, KpiDirection } from '../../types';

interface MiniCardProps {
  detail: DatasetDetail;
  measure: string;
  unit?: string;
  kpiDirection: KpiDirection;
  threshold?: { warn?: number; danger?: number };
  rows: Record<string, unknown>[];
}

function colorByKpi(value: number, kpi: KpiDirection, threshold?: { warn?: number; danger?: number }): { textClass: string; isViolation: boolean } {
  if (!threshold || (threshold.warn === undefined && threshold.danger === undefined) || kpi === 'NEUTRAL') {
    return { textClass: 'text-[var(--color-bt-fg)]', isViolation: false };
  }
  if (kpi === 'HIGHER_BETTER') {
    if (threshold.danger !== undefined && value < threshold.danger) return { textClass: 'text-[var(--color-bt-danger)]', isViolation: true };
    if (threshold.warn !== undefined && value < threshold.warn) return { textClass: 'text-[var(--color-bt-warn)]', isViolation: false };
    return { textClass: 'text-[var(--color-bt-success)]', isViolation: false };
  }
  if (kpi === 'LOWER_BETTER') {
    if (threshold.danger !== undefined && value > threshold.danger) return { textClass: 'text-[var(--color-bt-danger)]', isViolation: true };
    if (threshold.warn !== undefined && value > threshold.warn) return { textClass: 'text-[var(--color-bt-warn)]', isViolation: false };
    return { textClass: 'text-[var(--color-bt-success)]', isViolation: false };
  }
  return { textClass: 'text-[var(--color-bt-fg)]', isViolation: false };
}

export default function MiniCard({ detail, measure, unit, kpiDirection, threshold, rows }: MiniCardProps) {
  const meta = useMemo(() => {
    const base = detail.fields.find((f) => f.columnName === measure);
    if (base) return { label: base.displayName, format: base.columnFormat };
    const calc = detail.calcFields.find((c) => c.fieldCode === measure);
    if (calc) return { label: calc.displayName, format: calc.columnFormat };
    return undefined;
  }, [detail, measure]);

  // 첫 row의 평균값 또는 첫 값 사용 — 검토용 단순화
  const value = useMemo(() => {
    if (!measure || rows.length === 0) return null;
    const values = rows.map((r) => Number(r[measure] ?? 0)).filter((v) => !isNaN(v));
    if (values.length === 0) return null;
    // 평균값
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }, [rows, measure]);

  if (!measure || value === null || !meta) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-bt-fg-muted)]">측정값을 매핑해주세요.</div>;
  }

  const { textClass, isViolation } = colorByKpi(value, kpiDirection, threshold);
  const formatted =
    meta.format === 'Rate' ? value.toFixed(1) : meta.format === 'Number' ? Math.round(value).toLocaleString() : meta.format === 'Decimal' ? value.toFixed(2) : String(value);

  return (
    <div className={`flex items-center justify-center h-full p-6 ${isViolation ? 'border-2 border-[var(--color-bt-danger)] m-2 rounded' : ''}`}>
      <div className="flex flex-col gap-3 items-start">
        <div className="text-[12px] font-medium text-[var(--color-bt-fg-muted)]">{meta.label}</div>
        <div className="flex items-end gap-2">
          <span className={`mono text-[64px] font-bold leading-none tabular-nums ${textClass}`}>{formatted}</span>
          {unit && <span className="mono text-[18px] font-medium text-[var(--color-bt-fg-muted)] pb-1">{unit}</span>}
        </div>
        {threshold && (threshold.warn !== undefined || threshold.danger !== undefined) && (
          <div className="flex items-center gap-2 text-[10px] text-[var(--color-bt-fg-muted)]">
            {threshold.warn !== undefined && <span>경고 ≷ {threshold.warn}</span>}
            {threshold.danger !== undefined && <span>장애 ≷ {threshold.danger}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
