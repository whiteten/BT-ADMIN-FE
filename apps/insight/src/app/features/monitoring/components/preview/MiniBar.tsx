import { useMemo } from 'react';
import type { DatasetDetail } from '../../types';

interface MiniBarProps {
  detail: DatasetDetail;
  x: string;
  y: string[];
  rows: Record<string, unknown>[];
}

export default function MiniBar({ detail, x, y, rows }: MiniBarProps) {
  const labels = useMemo(() => rows.map((r) => String(r[x] ?? '')), [rows, x]);
  const series = useMemo(() => y.map((field) => ({ field, values: rows.map((r) => Number(r[field] ?? 0)) })), [y, rows]);
  const allValues = series.flatMap((s) => s.values);
  const maxV = allValues.length > 0 ? Math.max(...allValues) : 100;
  const xLabel = detail.fields.find((f) => f.columnName === x)?.displayName ?? x;

  if (!x || y.length === 0 || rows.length === 0) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-bt-fg-muted)]">X축·Y축을 매핑해주세요.</div>;
  }

  const PALETTE = ['#085fb5', '#b76e00'];
  const W = 600;
  const H = 240;
  const PAD = { l: 50, r: 20, t: 30, b: 40 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const groupW = innerW / labels.length;
  const barW = (groupW - 8) / y.length;

  return (
    <div className="h-full p-4 flex flex-col">
      <div className="mb-2 flex items-center gap-3 text-[10.5px]">
        {y.map((field, idx) => {
          const meta = detail.fields.find((f) => f.columnName === field) ?? detail.calcFields.find((c) => c.fieldCode === field);
          const label = meta && 'displayName' in meta ? meta.displayName : field;
          return (
            <span key={field} className="inline-flex items-center gap-1">
              <span className="w-3 h-3" style={{ background: PALETTE[idx] }} />
              <span className="mono">{label}</span>
            </span>
          );
        })}
        <span className="ml-auto text-[var(--color-bt-fg-muted)]">X축: {xLabel}</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full max-h-[280px]" preserveAspectRatio="xMidYMid meet">
          {/* gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p) => {
            const y0 = PAD.t + innerH * (1 - p);
            return (
              <g key={p}>
                <line x1={PAD.l} y1={y0} x2={W - PAD.r} y2={y0} stroke="#e4e7ec" strokeWidth={1} strokeDasharray="2,2" />
                <text x={PAD.l - 6} y={y0 + 3} textAnchor="end" fontSize={9} fill="#6a6f78">
                  {Math.round(maxV * p)}
                </text>
              </g>
            );
          })}
          {/* X axis */}
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#cdd2d9" strokeWidth={1.5} />
          {/* bars */}
          {labels.map((label, gi) => {
            const groupX = PAD.l + groupW * gi + 4;
            return (
              <g key={`${label}-${gi}`}>
                {series.map((s, si) => {
                  const v = s.values[gi];
                  const h = maxV === 0 ? 0 : (v / maxV) * innerH;
                  const x0 = groupX + barW * si;
                  const y0 = H - PAD.b - h;
                  return (
                    <g key={s.field}>
                      <rect x={x0} y={y0} width={barW - 2} height={h} fill={PALETTE[si]} rx={1} />
                      <text x={x0 + barW / 2 - 1} y={y0 - 3} textAnchor="middle" fontSize={9} fontWeight="bold" fill={PALETTE[si]}>
                        {v}
                      </text>
                    </g>
                  );
                })}
                <text x={groupX + groupW / 2 - 4} y={H - PAD.b + 14} textAnchor="middle" fontSize={9} fill="#0a0a0b">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
