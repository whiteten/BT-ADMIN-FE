import { useMemo } from 'react';
import type { ColumnFormat, DatasetDetail } from '../../types';
import type { Step2FieldOverride } from '../wizard/Step2DatasetConfig';

interface MiniGridProps {
  detail: DatasetDetail;
  fieldOverrides: Record<string, Step2FieldOverride>;
  columns: string[];
  rows: Record<string, unknown>[];
}

function formatValue(value: unknown, format: ColumnFormat): string {
  if (value === null || value === undefined) return '—';
  if (format === 'Rate' && typeof value === 'number') return value.toFixed(1);
  if (format === 'Number' && typeof value === 'number') return value.toLocaleString();
  if (format === 'Time' && typeof value === 'number') {
    const sec = value;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return String(value);
}

function resolveColumn(detail: DatasetDetail, columnName: string): { displayName: string; columnFormat: ColumnFormat } | undefined {
  const base = detail.fields.find((f) => f.columnName === columnName);
  if (base) return { displayName: base.displayName, columnFormat: base.columnFormat };
  const calc = detail.calcFields.find((c) => c.fieldCode === columnName);
  if (calc) return { displayName: calc.displayName, columnFormat: calc.columnFormat };
  return undefined;
}

export default function MiniGrid({ detail, fieldOverrides, columns, rows }: MiniGridProps) {
  const colMeta = useMemo(() => {
    return columns.map((col) => {
      const ovr = fieldOverrides[col];
      const fallback = resolveColumn(detail, col);
      return {
        columnName: col,
        displayName: ovr?.displayName || fallback?.displayName || col,
        columnFormat: (ovr?.columnFormat as ColumnFormat) || fallback?.columnFormat || 'String',
      };
    });
  }, [columns, fieldOverrides, detail]);

  if (columns.length === 0) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-bt-fg-muted)]">컬럼이 매핑되지 않았습니다.</div>;
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-[11.5px] border-collapse">
        <thead className="sticky top-0 bg-[var(--color-bt-bg-muted)] z-10">
          <tr>
            {colMeta.map((c) => (
              <th key={c.columnName} className="px-3 py-2 text-left font-semibold text-[var(--color-bt-fg-muted)] border-b border-[var(--color-bt-border)]">
                {c.displayName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-bt-border)]">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-blue-50/30">
              {colMeta.map((c) => {
                const raw = row[c.columnName];
                const isStatusGood = c.columnName === 'STATUS' && raw === '정상';
                const isStatusBad = c.columnName === 'STATUS' && raw === '경고';
                return (
                  <td key={c.columnName} className="px-3 py-2">
                    {isStatusGood ? (
                      <span className="rounded bg-[var(--color-bt-success-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-bt-success)]">정상</span>
                    ) : isStatusBad ? (
                      <span className="rounded bg-[var(--color-bt-warn-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-bt-warn)]">경고</span>
                    ) : c.columnFormat === 'Rate' ? (
                      <span className={`mono ${typeof raw === 'number' && raw >= 90 ? 'text-[var(--color-bt-success)]' : 'text-[var(--color-bt-warn)]'}`}>
                        {formatValue(raw, c.columnFormat)}
                      </span>
                    ) : c.columnFormat === 'Number' ? (
                      <span className="mono">{formatValue(raw, c.columnFormat)}</span>
                    ) : (
                      <span>{formatValue(raw, c.columnFormat)}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
