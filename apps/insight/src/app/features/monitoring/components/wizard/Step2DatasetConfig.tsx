import { useEffect, useMemo } from 'react';
import { Checkbox, Input, Select } from 'antd';
import { COLUMN_FORMAT_OPTIONS } from '../../constants/monitoringConstants';
import { useGetMonitoringDataset } from '../../hooks/useDatasetQueries';
import type { ColumnFormat, DatasetDetail } from '../../types';

export interface Step2FieldOverride {
  isVisible: boolean;
  displayName: string;
  columnFormat: ColumnFormat;
}

interface Step2Props {
  datasetId: number;
  fieldOverrides: Record<string, Step2FieldOverride>;
  onChange: (next: Record<string, Step2FieldOverride>) => void;
}

interface UnifiedRow {
  columnName: string;
  source: 'BASE' | 'CALC' | 'VIRTUAL';
  classification: 'DIM' | 'MSR';
  dataType: string;
  defaultDisplayName: string;
  defaultColumnFormat: ColumnFormat;
  expression?: string;
  parentField?: string;
}

/** dataset.fields + calcFields를 통합 row 리스트로 — 시안 §1-A Step 3과 동형 */
function flattenDataset(detail: DatasetDetail): UnifiedRow[] {
  const rows: UnifiedRow[] = [];
  // 기본 필드 + virtual
  for (const f of detail.fields) {
    rows.push({
      columnName: f.columnName,
      source: f.isVirtual ? 'VIRTUAL' : 'BASE',
      classification: f.classification,
      dataType: f.dataType,
      defaultDisplayName: f.displayName,
      defaultColumnFormat: f.columnFormat,
      parentField: f.parentField,
    });
  }
  // 계산필드 (ƒ)
  for (const c of detail.calcFields) {
    rows.push({
      columnName: c.fieldCode,
      source: 'CALC',
      classification: c.classification,
      dataType: c.dataType,
      defaultDisplayName: c.displayName,
      defaultColumnFormat: c.columnFormat,
      expression: c.rowExpression,
    });
  }
  return rows;
}

export default function Step2DatasetConfig({ datasetId, fieldOverrides, onChange }: Step2Props) {
  const { data: detail } = useGetMonitoringDataset({
    params: { datasetId },
    queryOptions: { enabled: !!datasetId, retry: false },
  });

  const rows = useMemo<UnifiedRow[]>(() => (detail ? flattenDataset(detail) : []), [detail]);

  // fieldOverrides 초기화 — detail 로드 후 비어있으면 데이터셋 기본값으로 채움
  useEffect(() => {
    if (!detail) return;
    if (Object.keys(fieldOverrides).length > 0) return;
    const init: Record<string, Step2FieldOverride> = {};
    for (const r of rows) {
      // 데이터셋 단의 isVisible 기본값 사용 (BASE/VIRTUAL은 dataset.field, CALC는 항상 노출)
      const baseField = detail.fields.find((f) => f.columnName === r.columnName);
      init[r.columnName] = {
        isVisible: r.source === 'CALC' ? true : (baseField?.isVisible ?? true),
        displayName: r.defaultDisplayName,
        columnFormat: r.defaultColumnFormat,
      };
    }
    onChange(init);
  }, [detail, rows, fieldOverrides, onChange]);

  const updateRow = (columnName: string, patch: Partial<Step2FieldOverride>) => {
    onChange({
      ...fieldOverrides,
      [columnName]: { ...fieldOverrides[columnName], ...patch },
    });
  };

  const toggleAll = (checked: boolean) => {
    const next: Record<string, Step2FieldOverride> = {};
    for (const r of rows) {
      next[r.columnName] = { ...fieldOverrides[r.columnName], isVisible: checked };
    }
    onChange(next);
  };

  const visibleCount = useMemo(() => Object.values(fieldOverrides).filter((o) => o?.isVisible).length, [fieldOverrides]);
  const total = rows.length;

  if (!detail) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-[14px] text-[var(--color-bt-fg-muted)]">데이터셋을 먼저 선택해주세요. (이전 단계로 이동)</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-7 py-3">
        <div>
          <div className="text-[13px] font-semibold">필드 구성 — 위젯 단 표시</div>
          <div className="text-[10.5px] text-[var(--color-bt-fg-muted)] mt-0.5">
            <span className="mono">{detail.datasetName}</span> · 노출할 필드를 선택하고 위젯 단 표시명·서식을 조정하세요
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <button type="button" onClick={() => toggleAll(true)} className="rounded border border-[var(--color-bt-border)] bg-white px-2 py-1 hover:bg-[var(--color-bt-bg-muted)]">
            전체 체크
          </button>
          <button type="button" onClick={() => toggleAll(false)} className="rounded border border-[var(--color-bt-border)] bg-white px-2 py-1 hover:bg-[var(--color-bt-bg-muted)]">
            전체 해제
          </button>
          <span className="rounded bg-[var(--color-bt-primary-soft)] px-2 py-1 mono font-semibold text-[var(--color-bt-primary)]">
            노출 {visibleCount} / {total}
          </span>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto px-7 py-4">
        <div className="rounded border border-[var(--color-bt-border)] overflow-hidden">
          <table className="w-full text-[11.5px]">
            <thead className="bg-[var(--color-bt-bg-muted)]/60 border-b border-[var(--color-bt-border)]">
              <tr>
                <th className="px-3 py-2 text-center font-semibold text-[var(--color-bt-fg-muted)] w-[60px]">사용</th>
                <th className="px-3 py-2 text-left font-semibold text-[var(--color-bt-fg-muted)] w-[90px]" title="기본필드 / 계산필드 / 가상 필드(룩업)">
                  종류
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[var(--color-bt-fg-muted)] w-[70px]" title="DIM / MSR (데이터셋에서 정의됨)">
                  구분
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[var(--color-bt-fg-muted)]">컬럼명 / 식</th>
                <th className="px-3 py-2 text-left font-semibold text-[var(--color-bt-fg-muted)]" title="위젯 단 override — 데이터셋 원본은 유지">
                  표시명 (위젯 단)
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[var(--color-bt-fg-muted)] w-[160px]" title="위젯 단 override">
                  서식 (위젯 단)
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[var(--color-bt-fg-muted)] w-[100px]">데이터 타입</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-bt-border)]">
              {rows.map((r) => {
                const ovr = fieldOverrides[r.columnName];
                const visible = ovr?.isVisible ?? true;
                const isCalc = r.source === 'CALC';
                const isVirtual = r.source === 'VIRTUAL';
                const rowBg = !visible
                  ? 'bg-[var(--color-bt-bg-muted)]/40'
                  : isCalc
                    ? 'bg-[var(--color-bt-success-soft)]/15'
                    : isVirtual
                      ? 'bg-[var(--color-bt-success-soft)]/30'
                      : 'bg-white';
                return (
                  <tr key={r.columnName} className={`${rowBg} hover:bg-blue-50/30 transition-colors`}>
                    {/* 사용 */}
                    <td className="px-3 py-2 text-center">
                      <Checkbox checked={visible} onChange={(e) => updateRow(r.columnName, { isVisible: e.target.checked })} />
                    </td>

                    {/* 종류 */}
                    <td className="px-3 py-2">
                      {r.source === 'CALC' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--color-bt-success)] px-1.5 py-0.5 mono text-[9.5px] font-bold text-white">ƒ 계산</span>
                      ) : r.source === 'VIRTUAL' ? (
                        <span
                          className="inline-flex items-center gap-1 rounded bg-[var(--color-bt-success-soft)] px-1.5 py-0.5 mono text-[9.5px] font-bold text-[var(--color-bt-success)]"
                          title={`룩업 가상 필드 (부모: ${r.parentField})`}
                        >
                          virtual
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--color-bt-fg-muted)]">
                          기본
                        </span>
                      )}
                    </td>

                    {/* 구분 — read-only (데이터셋 단에서 정의) */}
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 mono text-[10px] font-bold ${
                          r.classification === 'MSR' ? 'bg-[var(--color-bt-primary)] text-white' : 'bg-[var(--color-bt-bg-muted)] text-[var(--color-bt-fg-muted)]'
                        }`}
                        title="데이터셋 단에서 정의됨 — 위젯 단 변경 불가"
                      >
                        {r.classification}
                      </span>
                    </td>

                    {/* 컬럼명 / 식 */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 min-w-0">
                        {isVirtual && <span className="text-[var(--color-bt-success)] text-[10px] shrink-0">├→</span>}
                        <span className={`mono font-semibold truncate ${isCalc ? 'text-[var(--color-bt-success)]' : !visible ? 'text-[var(--color-bt-fg-muted)]' : ''}`}>
                          {r.columnName}
                        </span>
                      </div>
                      {r.expression && (
                        <div className="mt-0.5 mono text-[10px] text-[var(--color-bt-fg-muted)] truncate" title={r.expression}>
                          {r.expression}
                        </div>
                      )}
                    </td>

                    {/* 표시명 (위젯 단 override) */}
                    <td className="px-3 py-2">
                      <Input
                        size="small"
                        value={ovr?.displayName ?? r.defaultDisplayName}
                        disabled={!visible}
                        onChange={(e) => updateRow(r.columnName, { displayName: e.target.value })}
                        placeholder={r.defaultDisplayName}
                      />
                    </td>

                    {/* 서식 (위젯 단 override) */}
                    <td className="px-3 py-2">
                      <Select
                        size="small"
                        value={ovr?.columnFormat ?? r.defaultColumnFormat}
                        disabled={!visible}
                        options={COLUMN_FORMAT_OPTIONS}
                        onChange={(v) => updateRow(r.columnName, { columnFormat: v as ColumnFormat })}
                        style={{ width: '100%' }}
                      />
                    </td>

                    {/* 데이터 타입 — read-only */}
                    <td className="px-3 py-2 mono text-[10.5px] text-[var(--color-bt-fg-muted)]">{r.dataType}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 하단 안내 박스 — 계산필드는 §1-A에서만 정의 (M9 정책) */}
        <div className="mt-4 rounded border-l-4 border-l-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]/30 p-3">
          <div className="flex items-start gap-2">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--color-bt-primary)] mono text-[10px] font-bold text-white">i</span>
            <div className="text-[11.5px] leading-relaxed">
              <p>
                <strong>계산필드(ƒ)는 데이터셋 카탈로그(§1-A) Step 4에서 정의</strong>되며 이 데이터셋을 사용하는 모든 위젯이 공유합니다. 위젯 단에서는 추가/수정/삭제할 수
                없습니다.
              </p>
              <p className="mt-1 text-[var(--color-bt-fg-muted)]">
                <strong>위젯 단 override</strong>: 사용 체크 / 표시명 / 서식은 이 위젯에서만 변경되며 데이터셋 카탈로그의 원본은 그대로 유지됩니다 (같은 데이터셋이라도 위젯마다
                다른 표시명·서식 가능 · M9).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
