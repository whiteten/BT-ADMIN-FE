import { useCallback, useEffect, useRef, useState } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Input, Select } from 'antd';
import { Plus, X } from 'lucide-react';
import CalcFieldEditor from './CalcFieldEditor';
import type { CalcFieldCreateDatas, ColumnFormat, DomainCode, FieldType } from '../../report/types';
import { useGetDataSourceFields } from '../hooks/useDatasetQueries';
import type { LocalCalcFieldDraft, LocalFieldDisplay } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const FORMAT_OPTIONS: { value: ColumnFormat; label: string }[] = [
  { value: 'Number', label: 'Number (정수)' },
  { value: 'Decimal', label: 'Decimal (소수)' },
  { value: 'Rate', label: 'Rate (%)' },
  { value: 'String', label: 'String (문자)' },
  { value: 'Date', label: 'Date (날짜)' },
  { value: 'Time', label: 'Time (시간)' },
];

const AGG_OPTIONS: { value: string; label: string }[] = [
  { value: 'SUM', label: 'SUM' },
  { value: 'AVG', label: 'AVG' },
  { value: 'MIN', label: 'MIN' },
  { value: 'MAX', label: 'MAX' },
  { value: 'COUNT', label: 'COUNT' },
];

const TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'DIM', label: 'DIM' },
  { value: 'MSR', label: 'MSR' },
];

function deriveColumnFormat(fieldType: string, fieldRole: string): ColumnFormat {
  if (fieldRole === 'TIMESTAMP') return 'Date';
  if (fieldType === 'NUMBER') return 'Number';
  return 'String';
}

// ─── Sortable palette item ────────────────────────────────────────────────────
function SortableItem({ id, children }: { id: string; children: (dragProps: ReturnType<typeof useSortable>) => React.ReactNode }) {
  const sortable = useSortable({ id });
  return <>{children(sortable)}</>;
}

interface WizardStepBProps {
  datasourceKey: string;
  domain: DomainCode;
  fieldDisplays: LocalFieldDisplay[];
  onFieldDisplaysChange: (displays: LocalFieldDisplay[]) => void;
  calcFields: LocalCalcFieldDraft[];
  onCalcFieldsChange: (fields: LocalCalcFieldDraft[]) => void;
}

export default function WizardStepB({ datasourceKey, domain, fieldDisplays, onFieldDisplaysChange, calcFields, onCalcFieldsChange }: WizardStepBProps) {
  const [isCalcEditorOpen, setIsCalcEditorOpen] = useState(false);
  const [editingCalcField, setEditingCalcField] = useState<LocalCalcFieldDraft | undefined>(undefined);
  const [paletteSearch, setPaletteSearch] = useState('');
  const allCheckRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: sourceFields = [], isLoading } = useGetDataSourceFields({
    params: { datasourceKey },
  });

  // 초기화: 기본값 isVisible = false
  useEffect(() => {
    if (sourceFields.length > 0 && fieldDisplays.length === 0) {
      const initial: LocalFieldDisplay[] = sourceFields.map((f, i) => ({
        fieldName: f.fieldName,
        displayName: f.displayName,
        fieldType: f.fieldRole === 'MEASURE' ? 'MSR' : 'DIM',
        columnFormat: deriveColumnFormat(f.fieldType, f.fieldRole),
        isVisible: false,
        sortOrder: i,
      }));
      onFieldDisplaysChange(initial);
    }
  }, [sourceFields, fieldDisplays.length, onFieldDisplaysChange]);

  // 전체 체크박스 indeterminate 상태
  const visibleCount = fieldDisplays.filter((f) => f.isVisible).length;
  const allVisible = visibleCount === fieldDisplays.length && fieldDisplays.length > 0;
  const someVisible = visibleCount > 0 && !allVisible;
  useEffect(() => {
    if (allCheckRef.current) allCheckRef.current.indeterminate = someVisible;
  }, [someVisible]);

  const updateField = useCallback(
    (fieldName: string, patch: Partial<LocalFieldDisplay>) => {
      onFieldDisplaysChange(fieldDisplays.map((f) => (f.fieldName === fieldName ? { ...f, ...patch } : f)));
    },
    [fieldDisplays, onFieldDisplaysChange],
  );

  const toggleAll = (checked: boolean) => {
    onFieldDisplaysChange(fieldDisplays.map((f) => ({ ...f, isVisible: checked })));
  };

  // ─── 팔레트 드래그 재정렬 ─────────────────────────────────────────────────
  const handleDimDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const dims = [...fieldDisplays.filter((f) => f.fieldType === 'DIM')].sort((a, b) => a.sortOrder - b.sortOrder);
    const oldIdx = dims.findIndex((f) => f.fieldName === active.id);
    const newIdx = dims.findIndex((f) => f.fieldName === over.id);
    const reordered = arrayMove(dims, oldIdx, newIdx);
    const dimMin = Math.min(...fieldDisplays.filter((f) => f.fieldType === 'DIM').map((f) => f.sortOrder));
    onFieldDisplaysChange(
      fieldDisplays.map((f) => {
        if (f.fieldType !== 'DIM') return f;
        const pos = reordered.findIndex((r) => r.fieldName === f.fieldName);
        return { ...f, sortOrder: dimMin + pos };
      }),
    );
  };

  const handleMsrDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const msrs = [...fieldDisplays.filter((f) => f.fieldType === 'MSR')].sort((a, b) => a.sortOrder - b.sortOrder);
    const oldIdx = msrs.findIndex((f) => f.fieldName === active.id);
    const newIdx = msrs.findIndex((f) => f.fieldName === over.id);
    const reordered = arrayMove(msrs, oldIdx, newIdx);
    const msrMin = Math.min(...fieldDisplays.filter((f) => f.fieldType === 'MSR').map((f) => f.sortOrder));
    onFieldDisplaysChange(
      fieldDisplays.map((f) => {
        if (f.fieldType !== 'MSR') return f;
        const pos = reordered.findIndex((r) => r.fieldName === f.fieldName);
        return { ...f, sortOrder: msrMin + pos };
      }),
    );
  };

  const handleCalcDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = calcFields.findIndex((c) => c._localId === active.id);
    const newIdx = calcFields.findIndex((c) => c._localId === over.id);
    onCalcFieldsChange(arrayMove(calcFields, oldIdx, newIdx));
  };

  const handleCalcSave = (data: CalcFieldCreateDatas) => {
    if (editingCalcField) {
      onCalcFieldsChange(calcFields.map((c) => (c._localId === editingCalcField._localId ? { ...data, _localId: c._localId } : c)));
    } else {
      onCalcFieldsChange([...calcFields, { ...data, _localId: crypto.randomUUID() }]);
    }
  };

  const dimFields = [...fieldDisplays.filter((f) => f.fieldType === 'DIM')].sort((a, b) => a.sortOrder - b.sortOrder);
  const msrFields = [...fieldDisplays.filter((f) => f.fieldType === 'MSR')].sort((a, b) => a.sortOrder - b.sortOrder);

  const filteredDim = dimFields.filter(
    (f) => f.isVisible && (!paletteSearch || f.fieldName.toLowerCase().includes(paletteSearch.toLowerCase()) || f.displayName.toLowerCase().includes(paletteSearch.toLowerCase())),
  );
  const filteredMsr = msrFields.filter(
    (f) => f.isVisible && (!paletteSearch || f.fieldName.toLowerCase().includes(paletteSearch.toLowerCase()) || f.displayName.toLowerCase().includes(paletteSearch.toLowerCase())),
  );

  if (isLoading) return <FallbackSpinner />;

  return (
    <div className="flex" style={{ minHeight: 560 }}>
      {/* ── 좌측: 원천 뷰 필드 팔레트 ── */}
      <aside className="w-64 shrink-0 border-r border-bt-border bg-bt-bg-muted/30 p-4 overflow-y-auto">
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-bt-fg-muted">원천 뷰</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="rounded bg-bt-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">{domain}</span>
            <span className="font-mono text-xs font-semibold truncate">{datasourceKey}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-bt-fg-muted">{sourceFields.length}개 컬럼</div>
        </div>

        <Input size="small" placeholder="필드 검색…" value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} className="mb-3" />

        {/* DIM 그룹 — 드래그 재정렬 */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-bt-fg-muted">
            <span className="rounded bg-bt-bg-muted px-1 py-0.5 font-mono">DIM</span>
            <span>디멘션</span>
            <span className="ml-auto font-mono">{filteredDim.length}</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDimDragEnd}>
            <SortableContext items={filteredDim.map((f) => f.fieldName)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {filteredDim.map((f) => (
                  <SortableItem key={f.fieldName} id={f.fieldName}>
                    {({ attributes, listeners, setNodeRef, transform, transition, isDragging }) => (
                      <div
                        ref={setNodeRef}
                        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
                        className="flex items-center gap-2 rounded border border-bt-border bg-white px-2 py-1.5 text-[11.5px] hover:border-bt-primary"
                      >
                        <span {...attributes} {...listeners} className="cursor-grab text-bt-fg-muted select-none touch-none font-mono text-xs" title="드래그하여 순서 변경">
                          ⋮⋮
                        </span>
                        <span className="font-mono font-medium flex-1 truncate">{f.fieldName}</span>
                        <span className="text-[10px] text-bt-fg-muted shrink-0">{f.columnFormat === 'Date' ? 'DATE' : 'VARCHAR2'}</span>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* MSR 그룹 — 드래그 재정렬 */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-bt-fg-muted">
            <span className="rounded bg-bt-primary px-1 py-0.5 font-mono text-white">MSR</span>
            <span>메저(밸류)</span>
            <span className="ml-auto font-mono">{filteredMsr.length}</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleMsrDragEnd}>
            <SortableContext items={filteredMsr.map((f) => f.fieldName)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {filteredMsr.map((f) => (
                  <SortableItem key={f.fieldName} id={f.fieldName}>
                    {({ attributes, listeners, setNodeRef, transform, transition, isDragging }) => (
                      <div
                        ref={setNodeRef}
                        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
                        className="flex items-center gap-2 rounded border border-bt-border bg-bt-primary-soft/40 px-2 py-1.5 text-[11.5px] hover:border-bt-primary"
                      >
                        <span {...attributes} {...listeners} className="cursor-grab text-bt-fg-muted select-none touch-none font-mono text-xs">
                          ⋮⋮
                        </span>
                        <span className="font-mono font-semibold flex-1 truncate">{f.fieldName}</span>
                        <span className="text-[10px] text-bt-fg-muted shrink-0">NUMBER</span>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* 계산필드 그룹 — 드래그 재정렬 */}
        {calcFields.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-bt-fg-muted">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-bt-success font-mono text-[10px] font-bold text-white">ƒ</span>
              <span>계산필드</span>
              <span className="ml-auto font-mono">{calcFields.length}</span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleCalcDragEnd}>
              <SortableContext items={calcFields.map((c) => c._localId)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {calcFields.map((cf) => (
                    <SortableItem key={cf._localId} id={cf._localId}>
                      {({ attributes, listeners, setNodeRef, transform, transition, isDragging }) => (
                        <div
                          ref={setNodeRef}
                          style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
                          className="flex items-center gap-2 rounded border border-bt-success/30 bg-bt-success-soft/50 px-2 py-1.5 text-[11.5px] hover:border-bt-success"
                        >
                          <span {...attributes} {...listeners} className="cursor-grab text-bt-fg-muted select-none touch-none font-mono text-xs">
                            ⋮⋮
                          </span>
                          <span className="font-mono font-semibold text-bt-success flex-1 truncate">ƒ {cf.fieldCode}</span>
                          <span className="text-[10px] text-bt-fg-muted shrink-0">{cf.columnFormat}</span>
                        </div>
                      )}
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </aside>

      {/* ── 우측: 필드 구성 ── */}
      <div className="flex-1 bg-white overflow-y-auto">
        <div className="p-5">
          {/* 테이블 헤더 */}
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold">필드 구성</span>
            <span className="text-xs text-bt-fg-muted">— 노출할 필드를 선택하고 분류·서식·표시명을 지정하세요</span>
            <span className="ml-auto text-xs text-bt-fg-muted">
              노출 {visibleCount} / {fieldDisplays.length}
            </span>
          </div>

          <div className="rounded border border-bt-border overflow-hidden">
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col style={{ width: '52px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '76px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '100px' }} />
                <col />
              </colgroup>
              <thead className="bg-bt-bg-muted/60 border-b border-bt-border">
                <tr>
                  <th className="px-2 py-1.5 text-center font-medium text-bt-fg-muted whitespace-nowrap">
                    <div className="flex flex-col items-center gap-0.5">
                      <input
                        ref={allCheckRef}
                        type="checkbox"
                        checked={allVisible}
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="accent-bt-primary"
                        title="전체 선택/해제"
                      />
                      <span className="text-[10px]">노출</span>
                    </div>
                  </th>
                  <th className="px-2 py-1.5 text-left font-medium text-bt-fg-muted">컬럼</th>
                  <th className="px-2 py-1.5 text-left font-medium text-bt-fg-muted">종류</th>
                  <th className="px-2 py-1.5 text-left font-medium text-bt-fg-muted">서식</th>
                  <th className="px-2 py-1.5 text-left font-medium text-bt-fg-muted">어그리게이션</th>
                  <th className="px-2 py-1.5 text-left font-medium text-bt-fg-muted">표시명</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bt-border">
                {fieldDisplays.map((f) => (
                  <tr key={f.fieldName} className={`transition-colors ${f.isVisible ? 'bg-white' : 'bg-bt-bg-muted/20'}`}>
                    <td className="px-2 py-1 text-center">
                      <input type="checkbox" checked={f.isVisible} onChange={(e) => updateField(f.fieldName, { isVisible: e.target.checked })} className="accent-bt-primary" />
                    </td>
                    <td className="px-2 py-1">
                      <span className={`font-mono font-semibold truncate block ${!f.isVisible ? 'text-bt-fg-muted' : ''}`}>{f.fieldName}</span>
                    </td>
                    <td className="px-2 py-1">
                      <Select
                        size="small"
                        value={f.fieldType}
                        options={TYPE_OPTIONS}
                        onChange={(v) => updateField(f.fieldName, { fieldType: v })}
                        disabled={!f.isVisible}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Select
                        size="small"
                        value={f.columnFormat as ColumnFormat}
                        options={FORMAT_OPTIONS}
                        onChange={(v) => updateField(f.fieldName, { columnFormat: v })}
                        disabled={!f.isVisible}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td className="px-2 py-1">
                      {f.fieldType === 'MSR' ? (
                        <Select
                          size="small"
                          value={f.aggFunc ?? undefined}
                          options={AGG_OPTIONS}
                          onChange={(v) => updateField(f.fieldName, { aggFunc: v })}
                          disabled={!f.isVisible}
                          placeholder="선택"
                          style={{ width: '100%' }}
                        />
                      ) : (
                        <span className="text-xs text-bt-fg-muted">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      <Input size="small" value={f.displayName} onChange={(e) => updateField(f.fieldName, { displayName: e.target.value })} disabled={!f.isVisible} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 계산필드 섹션 */}
        <div className="px-5 pb-5">
          <div className="rounded border border-bt-border bg-bt-primary-soft/15 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-bt-success font-mono text-[10px] font-bold text-white">ƒ</span>
                <span className="text-sm font-semibold">계산필드</span>
                <span className="text-xs text-bt-fg-muted">— Row-level 수식 또는 윈도우 함수</span>
              </div>
              <Button
                size="small"
                icon={<Plus className="w-3 h-3" />}
                onClick={() => {
                  setEditingCalcField(undefined);
                  setIsCalcEditorOpen(true);
                }}
              >
                추가
              </Button>
            </div>

            {calcFields.length === 0 ? (
              <div className="py-2 text-xs text-bt-fg-muted">계산필드 없음 — 응답률, 점유율 등 수식 필드를 추가하세요.</div>
            ) : (
              <div className="space-y-2">
                {calcFields.map((cf) => (
                  <div key={cf._localId} className="flex items-start gap-3 rounded border border-bt-success/30 bg-bt-success-soft/50 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs font-bold text-bt-success">ƒ {cf.fieldCode}</span>
                        <span className="text-xs text-bt-fg-muted">· {cf.displayName}</span>
                        <span className="rounded bg-bt-bg-muted px-1 text-[10px] font-mono text-bt-fg-muted">{cf.columnFormat}</span>
                      </div>
                      <div className="font-mono text-[11px] text-bt-fg-muted truncate">{cf.rowExpression}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        className="text-xs text-bt-fg-muted hover:text-bt-primary px-1"
                        onClick={() => {
                          setEditingCalcField(cf);
                          setIsCalcEditorOpen(true);
                        }}
                      >
                        편집
                      </button>
                      <button
                        type="button"
                        className="text-bt-fg-muted hover:text-bt-danger"
                        onClick={() => onCalcFieldsChange(calcFields.filter((c) => c._localId !== cf._localId))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isCalcEditorOpen && <CalcFieldEditor calcField={editingCalcField as CalcFieldCreateDatas | undefined} onClose={() => setIsCalcEditorOpen(false)} onSave={handleCalcSave} />}
    </div>
  );
}
