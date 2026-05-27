import { useMemo } from 'react';
import type { DatasetDetail } from '../../types';

interface MiniLineProps {
  detail: DatasetDetail;
  x: string;
  y: string[];
  rows: Record<string, unknown>[];
}

const PALETTE = ['#085fb5', '#0a8a4a', '#b76e00', '#c92a2a'];

export default function MiniLine({ detail, x, y, rows }: MiniLineProps) {
  const labels = useMemo(() => rows.map((r) => String(r[x] ?? '')), [rows, x]);
  const series = useMemo(() => y.map((field) => ({ field, values: rows.map((r) => Number(r[field] ?? 0)) })), [y, rows]);
  const allValues = series.flatMap((s) => s.values);
  const maxV = allValues.length > 0 ? Math.max(...allValues) : 100;

  if (!x || y.length === 0 || rows.length === 0) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-bt-fg-muted)]">X축(시간) · Y축을 매핑해주세요.</div>;
  }

  const W = 600;
  const H = 240;
  const PAD = { l: 50, r: 20, t: 30, b: 40 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const stepX = innerW / Math.max(1, labels.length - 1);

  return (
    <div className="h-full p-4 flex flex-col">
      <div className="mb-2 flex items-center gap-3 text-[10.5px] flex-wrap">
        {y.map((field, idx) => {
          const meta = detail.fields.find((f) => f.columnName === field) ?? detail.calcFields.find((c) => c.fieldCode === field);
          const label = meta && 'displayName' in meta ? meta.displayName : field;
          return (
            <span key={field} className="inline-flex items-center gap-1">
              <span className="w-3 h-0.5" style={{ background: PALETTE[idx % PALETTE.length] }} />
              <span className="mono">{label}</span>
            </span>
          );
        })}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full max-h-[280px]" preserveAspectRatio="xMidYMid meet">
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
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#cdd2d9" strokeWidth={1.5} />

          {/* lines */}
          {series.map((s, si) => {
            const points = s.values
              .map((v, i) => {
                const x0 = PAD.l + stepX * i;
                const y0 = H - PAD.b - (maxV === 0 ? 0 : (v / maxV) * innerH);
                return `${x0},${y0}`;
              })
              .join(' ');
            return (
              <g key={s.field}>
                <polyline fill="none" stroke={PALETTE[si % PALETTE.length]} strokeWidth={2} points={points} />
                {s.values.map((v, i) => {
                  const x0 = PAD.l + stepX * i;
                  const y0 = H - PAD.b - (maxV === 0 ? 0 : (v / maxV) * innerH);
                  return <circle key={i} cx={x0} cy={y0} r={3} fill="#fff" stroke={PALETTE[si % PALETTE.length]} strokeWidth={2} />;
                })}
              </g>
            );
          })}

          {/* X labels */}
          {labels.map((label, i) => {
            if (i % Math.max(1, Math.floor(labels.length / 6)) !== 0 && i !== labels.length - 1) return null;
            return (
              <text key={i} x={PAD.l + stepX * i} y={H - PAD.b + 14} textAnchor="middle" fontSize={9} fill="#0a0a0b">
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
