import { useMemo, useState } from 'react';
import { Input } from 'antd';
import type { DatasetDetail } from '../../../types';
import type { Step2FieldOverride } from '../Step2DatasetConfig';

export interface PaletteField {
  columnName: string;
  classification: 'DIM' | 'MSR';
  source: 'BASE' | 'CALC' | 'VIRTUAL';
  dataType: string;
  displayName: string;
  parentField?: string;
}

interface FieldPaletteProps {
  detail: DatasetDetail;
  fieldOverrides: Record<string, Step2FieldOverride>;
  /** 슬롯에서 받을 수 있는 필드 (시각화 + 슬롯 타입에 따라) */
  filterFn?: (f: PaletteField) => { available: boolean; reason?: string };
  /** 이미 사용된 필드 (다른 슬롯에) — disable */
  usedFields?: Set<string>;
  onFieldClick: (field: PaletteField) => void;
}

/** dataset.fields + calcFields → 노출 ON 필드만 추출 */
function buildPaletteFields(detail: DatasetDetail, fieldOverrides: Record<string, Step2FieldOverride>): PaletteField[] {
  const result: PaletteField[] = [];
  for (const f of detail.fields) {
    const ovr = fieldOverrides[f.columnName];
    if (!ovr?.isVisible) continue;
    result.push({
      columnName: f.columnName,
      classification: f.classification,
      source: f.isVirtual ? 'VIRTUAL' : 'BASE',
      dataType: f.dataType,
      displayName: ovr?.displayName || f.displayName,
      parentField: f.parentField,
    });
  }
  for (const c of detail.calcFields) {
    const ovr = fieldOverrides[c.fieldCode];
    if (ovr && !ovr.isVisible) continue;
    result.push({
      columnName: c.fieldCode,
      classification: c.classification,
      source: 'CALC',
      dataType: c.dataType,
      displayName: ovr?.displayName || c.displayName,
    });
  }
  return result;
}

export default function FieldPalette({ detail, fieldOverrides, filterFn, usedFields, onFieldClick }: FieldPaletteProps) {
  const [search, setSearch] = useState('');
  const all = useMemo(() => buildPaletteFields(detail, fieldOverrides), [detail, fieldOverrides]);

  const filtered = useMemo(() => {
    let result = all;
    if (search.trim()) {
      const kw = search.toLowerCase();
      result = result.filter((f) => f.columnName.toLowerCase().includes(kw) || f.displayName.toLowerCase().includes(kw));
    }
    return result;
  }, [all, search]);

  const dims = filtered.filter((f) => f.classification === 'DIM' && f.source !== 'CALC');
  const msrs = filtered.filter((f) => f.classification === 'MSR' && f.source !== 'CALC');
  const calcs = filtered.filter((f) => f.source === 'CALC');

  const renderField = (f: PaletteField) => {
    const used = usedFields?.has(f.columnName) ?? false;
    const avail = filterFn ? filterFn(f) : { available: true };
    const disabled = used || !avail.available;
    const isCalc = f.source === 'CALC';
    const isVirtual = f.source === 'VIRTUAL';

    return (
      <button
        key={f.columnName}
        type="button"
        disabled={disabled}
        onClick={() => onFieldClick(f)}
        title={used ? '이미 사용 중' : !avail.available ? avail.reason : f.dataType}
        className={`flex items-center gap-1.5 w-full text-left rounded border px-2 py-1.5 text-[11px] transition-colors ${
          disabled
            ? 'border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 text-[var(--color-bt-fg-muted)] cursor-not-allowed opacity-60'
            : isCalc
              ? 'border-[var(--color-bt-success)]/30 bg-[var(--color-bt-success-soft)]/30 hover:border-[var(--color-bt-success)] hover:bg-[var(--color-bt-success-soft)]'
              : 'border-[var(--color-bt-border)] bg-white hover:border-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-soft)]/30'
        }`}
      >
        {isVirtual && <span className="text-[var(--color-bt-success)] text-[10px] shrink-0">├→</span>}
        {isCalc && <span className="inline-flex h-4 items-center rounded bg-[var(--color-bt-success)] px-1 mono text-[9px] font-bold text-white">ƒ</span>}
        <span className={`mono font-semibold truncate ${isCalc ? 'text-[var(--color-bt-success)]' : ''}`}>{f.columnName}</span>
        <span className="text-[10px] text-[var(--color-bt-fg-muted)] truncate ml-auto">{f.displayName}</span>
      </button>
    );
  };

  return (
    <aside className="w-[280px] shrink-0 border-r border-[var(--color-bt-border)] bg-[var(--color-bt-bg-canvas)] flex flex-col overflow-hidden">
      {/* 검색 */}
      <div className="p-3">
        <Input size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="필드 검색…" allowClear />
      </div>

      {/* 필드 그룹 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {dims.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
              <span className="rounded bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5 mono">DIM</span>
              <span>디멘션</span>
              <span className="ml-auto">{dims.length}</span>
            </div>
            <div className="space-y-1">{dims.map(renderField)}</div>
          </div>
        )}

        {msrs.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
              <span className="rounded bg-[var(--color-bt-primary)] px-1.5 py-0.5 mono text-white">MSR</span>
              <span>측정값</span>
              <span className="ml-auto">{msrs.length}</span>
            </div>
            <div className="space-y-1">{msrs.map(renderField)}</div>
          </div>
        )}

        {calcs.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
              <span className="inline-flex h-4 items-center rounded bg-[var(--color-bt-success)] px-1 mono text-[9px] font-bold text-white">ƒ</span>
              <span>계산필드</span>
              <span className="ml-auto">{calcs.length}</span>
            </div>
            <div className="space-y-1">{calcs.map(renderField)}</div>
          </div>
        )}

        {filtered.length === 0 && <p className="text-[11px] text-center text-[var(--color-bt-fg-muted)] py-4">필드 없음</p>}
      </div>

      <div className="p-3 text-[10px] text-[var(--color-bt-fg-muted)] leading-relaxed">
        <strong>클릭하여 슬롯에 추가</strong>. 노출 OFF 필드는 표시되지 않습니다. 회색 항목은 이미 사용 중이거나 슬롯 제약을 충족하지 못합니다.
      </div>
    </aside>
  );
}
