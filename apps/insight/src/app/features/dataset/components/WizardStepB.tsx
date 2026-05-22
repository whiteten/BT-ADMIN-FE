import { useCallback, useEffect, useState } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Checkbox, Input, Select } from 'antd';
import { Edit2, Plus, X } from 'lucide-react';
import CalcFieldEditor from './CalcFieldEditor';
import type { CalcFieldCreateDatas, ColumnFormat, DomainCode } from '../../report/types';
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

function deriveColumnFormat(fieldType: string, fieldRole: string): ColumnFormat {
  if (fieldRole === 'TIMESTAMP') return 'Date';
  if (fieldType === 'NUMBER') return 'Number';
  return 'String';
}

// ─── Sortable palette item ─────────────────────────────────────────────────────
function SortableItem({ id, children }: { id: string; children: (dragProps: ReturnType<typeof useSortable>) => React.ReactNode }) {
  const sortable = useSortable({ id });
  return <>{children(sortable)}</>;
}

// ─── Editing state ─────────────────────────────────────────────────────────────
type EditingState = { mode: 'idle' } | { mode: 'add' } | { mode: 'edit'; localId: string };

interface WizardStepBProps {
  datasourceKey: string;
  domain: DomainCode;
  fieldDisplays: LocalFieldDisplay[];
  onFieldDisplaysChange: (displays: LocalFieldDisplay[]) => void;
  calcFields: LocalCalcFieldDraft[];
  onCalcFieldsChange: (fields: LocalCalcFieldDraft[]) => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export default function WizardStepB({ datasourceKey, domain, fieldDisplays, onFieldDisplaysChange, calcFields, onCalcFieldsChange, onEditingChange }: WizardStepBProps) {
  const [editing, setEditing] = useState<EditingState>({ mode: 'idle' });

  useEffect(() => {
    onEditingChange?.(editing.mode !== 'idle');
  }, [editing.mode, onEditingChange]);
  const [paletteSearch, setPaletteSearch] = useState('');

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
  const nonCalcDisplays = fieldDisplays.filter((f) => !f.isCalcField);
  const visibleCount = fieldDisplays.filter((f) => f.isVisible).length;
  const allVisible = nonCalcDisplays.length > 0 && nonCalcDisplays.every((f) => f.isVisible);
  const someVisible = nonCalcDisplays.some((f) => f.isVisible) && !allVisible;

  const updateField = useCallback(
    (fieldName: string, patch: Partial<LocalFieldDisplay>) => {
      onFieldDisplaysChange(fieldDisplays.map((f) => (f.fieldName === fieldName ? { ...f, ...patch } : f)));
    },
    [fieldDisplays, onFieldDisplaysChange],
  );

  const toggleAll = (checked: boolean) => {
    onFieldDisplaysChange(fieldDisplays.map((f) => (f.isCalcField ? f : { ...f, isVisible: checked })));
  };

  // ─── 팔레트 드래그 재정렬 ──────────────────────────────────────────────────
  const handleDimDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const dims = [...fieldDisplays.filter((f) => f.fieldType === 'DIM' && !f.isCalcField)].sort((a, b) => a.sortOrder - b.sortOrder);
    const oldIdx = dims.findIndex((f) => f.fieldName === active.id);
    const newIdx = dims.findIndex((f) => f.fieldName === over.id);
    const reordered = arrayMove(dims, oldIdx, newIdx);
    const dimMin = Math.min(...fieldDisplays.filter((f) => f.fieldType === 'DIM' && !f.isCalcField).map((f) => f.sortOrder));
    onFieldDisplaysChange(
      fieldDisplays.map((f) => {
        if (f.fieldType !== 'DIM' || f.isCalcField) return f;
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

  // ─── Calc field CRUD + fieldDisplays sync ─────────────────────────────────
  const handleCalcSave = (data: CalcFieldCreateDatas) => {
    if (editing.mode === 'add') {
      const newId = crypto.randomUUID();
      onCalcFieldsChange([...calcFields, { ...data, _localId: newId }]);
      // Sync to fieldDisplays so calc field appears in 필드 구성 table
      onFieldDisplaysChange([
        ...fieldDisplays,
        {
          fieldName: data.fieldCode,
          displayName: data.displayName,
          fieldType: 'MSR',
          columnFormat: data.columnFormat,
          isVisible: true,
          sortOrder: fieldDisplays.length,
          isCalcField: true,
        },
      ]);
    } else if (editing.mode === 'edit') {
      onCalcFieldsChange(calcFields.map((c) => (c._localId === editing.localId ? { ...c, ...data } : c)));
      // Update corresponding fieldDisplays row
      onFieldDisplaysChange(
        fieldDisplays.map((f) => (f.fieldName === data.fieldCode && f.isCalcField ? { ...f, displayName: data.displayName, columnFormat: data.columnFormat } : f)),
      );
    }
    setEditing({ mode: 'idle' });
  };

  const deleteCalcField = (localId: string) => {
    const cf = calcFields.find((c) => c._localId === localId);
    onCalcFieldsChange(calcFields.filter((c) => c._localId !== localId));
    if (cf) {
      onFieldDisplaysChange(fieldDisplays.filter((f) => !(f.fieldName === cf.fieldCode && f.isCalcField)));
    }
  };

  const dimFields = [...fieldDisplays.filter((f) => f.fieldType === 'DIM' && !f.isCalcField)].sort((a, b) => a.sortOrder - b.sortOrder);
  const msrFields = [...fieldDisplays.filter((f) => f.fieldType === 'MSR')].sort((a, b) => a.sortOrder - b.sortOrder);

  const filteredDim = dimFields.filter(
    (f) => f.isVisible && (!paletteSearch || f.fieldName.toLowerCase().includes(paletteSearch.toLowerCase()) || f.displayName.toLowerCase().includes(paletteSearch.toLowerCase())),
  );
  const filteredMsr = msrFields.filter(
    (f) => f.isVisible && (!paletteSearch || f.fieldName.toLowerCase().includes(paletteSearch.toLowerCase()) || f.displayName.toLowerCase().includes(paletteSearch.toLowerCase())),
  );

  // Source fields for the CalcFieldEditor palette (visible non-calc fields)
  const editorSourceFields = fieldDisplays.filter((f) => f.isVisible && !f.isCalcField);

  if (isLoading) return <FallbackSpinner />;

  // ─── Edit mode: full-width CalcFieldEditor ─────────────────────────────────
  if (editing.mode !== 'idle') {
    const editingDraft = editing.mode === 'edit' ? calcFields.find((c) => c._localId === editing.localId) : undefined;
    const otherCalcFields =
      editing.mode === 'edit'
        ? calcFields.filter((c) => c._localId !== editing.localId).map((c) => ({ fieldCode: c.fieldCode, _localId: c._localId }))
        : calcFields.map((c) => ({ fieldCode: c.fieldCode, _localId: c._localId }));

    return (
      <div className="flex" style={{ minHeight: 560 }}>
        {/* Left: source palette (unchanged) */}
        <aside className="w-64 shrink-0 border-r border-border bg-muted/20 p-4 overflow-y-auto">
          <div className="mb-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">원천 뷰</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-white">{domain}</span>
              <span className="font-mono text-sm font-semibold truncate">{datasourceKey}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{sourceFields.length}개 컬럼</div>
          </div>

          {filteredDim.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex items-center gap-2 px-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="rounded bg-bt-bg-muted px-1 py-0.5 font-mono">DIM</span>
                <span>디멘션</span>
                <span className="ml-auto font-mono">{filteredDim.length}</span>
              </div>
              <div className="space-y-1">
                {filteredDim.map((f) => (
                  <div key={f.fieldName} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <span className="font-mono font-medium flex-1 truncate">{f.fieldName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredMsr.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex items-center gap-2 px-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="rounded bg-bt-primary px-1 py-0.5 font-mono text-white">MSR</span>
                <span>측정값</span>
                <span className="ml-auto font-mono">{filteredMsr.length}</span>
              </div>
              <div className="space-y-1">
                {filteredMsr.map((f) => (
                  <div key={f.fieldName} className={`flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm ${f.isCalcField ? 'bg-green-50' : 'bg-primary/5'}`}>
                    {f.isCalcField && (
                      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-600 font-mono text-[9px] font-bold text-white">ƒ</span>
                    )}
                    <span className={`font-mono font-medium flex-1 truncate ${f.isCalcField ? 'text-green-700' : ''}`}>{f.fieldName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right: CalcFieldEditor */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <button className="text-primary hover:underline" onClick={() => setEditing({ mode: 'idle' })}>
              ← 필드 구성
            </button>
            <span>/</span>
            <span>{editing.mode === 'add' ? '새 계산필드' : `편집: ${editingDraft?.fieldCode ?? ''}`}</span>
          </div>
          <CalcFieldEditor
            sourceFields={editorSourceFields}
            existingCalcFields={otherCalcFields}
            initialValue={editingDraft ? { ...editingDraft } : undefined}
            onSave={handleCalcSave}
            onCancel={() => setEditing({ mode: 'idle' })}
          />
        </div>
      </div>
    );
  }

  // ─── List mode: original split panel ──────────────────────────────────────
  return (
    <div className="flex" style={{ minHeight: 560 }}>
      {/* ── 좌측: 원천 뷰 필드 팔레트 ── */}
      <aside className="w-64 shrink-0 border-r border-border bg-muted/20 p-4 overflow-y-auto">
        <div className="mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">원천 뷰</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-white">{domain}</span>
            <span className="font-mono text-sm font-semibold truncate">{datasourceKey}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{sourceFields.length}개 컬럼</div>
        </div>

        <Input size="small" placeholder="필드 검색…" value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} className="mb-3" />

        {/* DIM 그룹 */}
        <div className="mb-4">
          <div className="mb-1 flex items-center gap-2 px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>디멘션</span>
            <span className="ml-auto">{filteredDim.length}</span>
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
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-default"
                      >
                        <span {...attributes} {...listeners} className="cursor-grab text-bt-fg-muted select-none touch-none font-mono text-xs">
                          ⋮⋮
                        </span>
                        <span className="font-mono font-medium flex-1 truncate">{f.fieldName}</span>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* MSR 그룹 */}
        <div className="mb-4">
          <div className="mb-1 flex items-center gap-2 px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>측정값</span>
            <span className="ml-auto">{filteredMsr.length}</span>
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
                        className={`flex items-center gap-2 px-3 py-2 text-sm cursor-default ${f.isCalcField ? 'bg-green-50 hover:bg-green-100/60' : 'bg-primary/5 hover:bg-primary/10'}`}
                      >
                        <span {...attributes} {...listeners} className="cursor-grab text-muted-foreground select-none touch-none">
                          ⋮⋮
                        </span>
                        {f.isCalcField && (
                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-600 font-mono text-[9px] font-bold text-white">ƒ</span>
                        )}
                        <span className={`font-mono font-medium flex-1 truncate ${f.isCalcField ? 'text-green-700' : ''}`}>{f.fieldName}</span>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </aside>

      {/* ── 우측: 필드 구성 ── */}
      <div className="flex-1 bg-white overflow-y-auto">
        <div className="p-5">
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
                <col style={{ width: '44px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '110px' }} />
                <col />
              </colgroup>
              <thead className="bg-bt-bg-muted/60 border-b border-bt-border">
                <tr>
                  <th className="px-3 py-2.5 text-center font-medium text-gray-500 border-b border-gray-100">
                    <Checkbox checked={allVisible} indeterminate={someVisible} onChange={(e) => toggleAll(e.target.checked)} title="전체 선택/해제" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-b border-gray-100">컬럼</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-b border-gray-100">서식</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-b border-gray-100">어그리게이션</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-b border-gray-100">표시명</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bt-border">
                {fieldDisplays.map((f) => (
                  <tr key={f.fieldName} className={`transition-colors ${f.isCalcField ? 'bg-green-50/30' : f.isVisible ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/20`}>
                    <td className="px-3 py-2 text-center border-b border-gray-100">
                      <Checkbox checked={f.isVisible} onChange={(e) => updateField(f.fieldName, { isVisible: e.target.checked })} />
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      <div className="flex items-center gap-1">
                        {f.isCalcField && (
                          <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-bt-success font-mono text-[9px] font-bold text-white">ƒ</span>
                        )}
                        <span className={`font-mono font-semibold truncate ${!f.isVisible ? 'text-bt-fg-muted' : f.isCalcField ? 'text-bt-success' : ''}`}>{f.fieldName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      <Select
                        size="small"
                        value={f.columnFormat as ColumnFormat}
                        options={FORMAT_OPTIONS}
                        onChange={(v) => updateField(f.fieldName, { columnFormat: v })}
                        disabled={!f.isVisible}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      {f.isCalcField ? (
                        <span className="text-xs text-bt-fg-muted">수식 기반</span>
                      ) : f.fieldType === 'MSR' ? (
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
                    <td className="px-3 py-2 border-b border-gray-100">
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
              <Button size="small" type="primary" icon={<Plus className="w-3 h-3" />} onClick={() => setEditing({ mode: 'add' })}>
                추가
              </Button>
            </div>

            {calcFields.length === 0 ? (
              <div
                className="cursor-pointer rounded border border-dashed border-bt-border py-4 text-center text-xs text-bt-fg-muted hover:border-bt-primary hover:text-bt-primary"
                onClick={() => setEditing({ mode: 'add' })}
              >
                계산필드 없음 — 응답률, 점유율 등 수식 필드를 추가하세요.
              </div>
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
                        className="flex items-center gap-0.5 text-xs text-bt-fg-muted hover:text-bt-primary px-1"
                        onClick={() => setEditing({ mode: 'edit', localId: cf._localId })}
                      >
                        <Edit2 className="w-3 h-3" /> 편집
                      </button>
                      <button type="button" className="text-bt-fg-muted hover:text-bt-danger" onClick={() => deleteCalcField(cf._localId)}>
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
    </div>
  );
}
