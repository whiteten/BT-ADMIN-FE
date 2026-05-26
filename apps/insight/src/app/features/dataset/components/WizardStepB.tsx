import { useCallback, useEffect, useState } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColDef, IHeaderParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Checkbox, Input, Modal, Select, Tooltip } from 'antd';
import { Download, Edit2, Plus, X } from 'lucide-react';
import CalcFieldEditor from './CalcFieldEditor';
import type { CalcFieldCreateDatas, ColumnFormat, DomainCode } from '../../report/types';
import { useGetDataSourceFields, useGetSchemaPreview } from '../hooks/useDatasetQueries';
import type { LocalCalcFieldDraft, LocalFieldDisplay } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const FORMAT_OPTIONS: { value: ColumnFormat; label: string }[] = [
  { value: 'Number', label: 'Number (정수)' },
  { value: 'Decimal', label: 'Decimal (소수)' },
  { value: 'Rate', label: 'Rate (%)' },
  { value: 'String', label: 'String (문자)' },
  { value: 'Date', label: 'Date (날짜)' },
  { value: 'Time', label: 'Time (시간)' },
];

function deriveColumnFormat(fieldType: string, fieldRole: string): ColumnFormat {
  if (fieldRole === 'TIMESTAMP') return 'Date';
  if (fieldType === 'NUMBER') return 'Number';
  return 'String';
}

interface CheckboxHeaderParams extends IHeaderParams {
  allVisible: boolean;
  someVisible: boolean;
  toggleAll: (checked: boolean) => void;
}
function CheckboxHeader({ allVisible, someVisible, toggleAll }: CheckboxHeaderParams) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <Checkbox checked={allVisible} indeterminate={someVisible} onChange={(e) => toggleAll(e.target.checked)} />
    </div>
  );
}

// ─── Sortable palette item ─────────────────────────────────────────────────────
function SortableItem({ id, children }: { id: string; children: (dragProps: ReturnType<typeof useSortable>) => React.ReactNode }) {
  const sortable = useSortable({ id });
  return <>{children(sortable)}</>;
}

// ─── Editing state ─────────────────────────────────────────────────────────────
type EditingState = { mode: 'idle' } | { mode: 'add' } | { mode: 'edit'; localId: string };

interface WizardStepBProps {
  datasourceKey?: string;
  dbViewPrefix?: string;
  domain: DomainCode;
  fieldDisplays: LocalFieldDisplay[];
  onFieldDisplaysChange: (displays: LocalFieldDisplay[]) => void;
  calcFields: LocalCalcFieldDraft[];
  onCalcFieldsChange: (fields: LocalCalcFieldDraft[]) => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export default function WizardStepB({
  datasourceKey = '',
  dbViewPrefix,
  domain,
  fieldDisplays,
  onFieldDisplaysChange,
  calcFields,
  onCalcFieldsChange,
  onEditingChange,
}: WizardStepBProps) {
  const [editing, setEditing] = useState<EditingState>({ mode: 'idle' });
  const { gridOptions } = useAggridOptions();

  useEffect(() => {
    onEditingChange?.(editing.mode !== 'idle');
  }, [editing.mode, onEditingChange]);
  const [paletteSearch, setPaletteSearch] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: previewFields = [], isLoading: isLoadingPreview } = useGetSchemaPreview({
    params: { dbViewPrefix: dbViewPrefix ?? '' },
    queryOptions: { enabled: !!dbViewPrefix },
  });
  const { data: existingFields = [], isLoading: isLoadingExisting } = useGetDataSourceFields({
    params: { datasourceKey },
    queryOptions: { enabled: !!datasourceKey && !dbViewPrefix },
  });
  const sourceFields = dbViewPrefix ? previewFields : existingFields;
  const isLoading = dbViewPrefix ? isLoadingPreview : isLoadingExisting;

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
        rawFieldType: f.fieldType,
        rawFieldRole: f.fieldRole,
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

  // ─── 컬럼 가져오기 (초기화) ───────────────────────────────────────────────
  const handleImportColumns = () => {
    const doReset = () => {
      onCalcFieldsChange([]);
      onFieldDisplaysChange([]);
    };
    if (fieldDisplays.length > 0) {
      Modal.confirm({
        title: '컬럼 가져오기',
        content: '이미 조회한 컬럼정보가 존재합니다. 계속 진행하시겠습니까?',
        okText: '확인',
        cancelText: '취소',
        onOk: doReset,
      });
    } else {
      doReset();
    }
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

  const _handleCalcDragEnd = (event: DragEndEvent) => {
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
      <div className="flex h-full">
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
                <span className="rounded bg-[var(--color-bt-bg-muted)] px-1 py-0.5 font-mono">DIM</span>
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
                <span className="rounded bg-[var(--color-bt-primary)] px-1 py-0.5 font-mono text-white">MSR</span>
                <span>측정값</span>
                <span className="ml-auto font-mono">{filteredMsr.length}</span>
              </div>
              <div className="space-y-1">
                {filteredMsr.map((f) => (
                  <div key={f.fieldName} className={`flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm ${f.isCalcField ? 'bg-green-50' : 'bg-primary/5'}`}>
                    {f.isCalcField && (
                      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-600 font-mono text-xs font-bold text-white">ƒ</span>
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
    <div className="flex h-full">
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
                        <span {...attributes} {...listeners} className="cursor-grab text-[var(--color-bt-fg-muted)] select-none touch-none font-mono text-xs">
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
                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-600 font-mono text-xs font-bold text-white">ƒ</span>
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
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        {/* 고정 헤더 */}
        <div className="shrink-0 flex items-center gap-2 px-5 py-3">
          <span className="text-sm font-semibold">필드 구성</span>
          <span className="text-xs text-[var(--color-bt-fg-muted)]">— 노출할 필드를 선택하고 분류·서식·표시명을 지정하세요</span>
          <span className="ml-auto text-xs text-[var(--color-bt-fg-muted)]">
            노출 {visibleCount} / {fieldDisplays.length}
          </span>
          <Button size="small" icon={<Download className="w-3 h-3" />} onClick={handleImportColumns}>
            컬럼 가져오기
          </Button>
          <Button size="small" type="primary" icon={<Plus className="w-3 h-3" />} onClick={() => setEditing({ mode: 'add' })}>
            계산필드 추가
          </Button>
        </div>

        {/* ag-Grid: flex-1로 공간 채우고 내부 스크롤 — 컬럼 헤더 항상 고정 */}
        <div className="flex-1 min-h-0 px-5 pt-3 pb-0">
          {(() => {
            const columnDefs: ColDef<LocalFieldDisplay>[] = [
              {
                headerComponent: CheckboxHeader,
                headerComponentParams: { allVisible, someVisible, toggleAll },
                maxWidth: 52,
                sortable: false,
                suppressHeaderMenuButton: true,
                cellRenderer: ({ data }: { data?: LocalFieldDisplay }) =>
                  data ? (
                    <div className="flex items-center justify-center h-full">
                      <Checkbox checked={data.isVisible} onChange={(e) => updateField(data.fieldName, { isVisible: e.target.checked })} />
                    </div>
                  ) : null,
              },
              {
                headerName: '컬럼',
                field: 'fieldName',
                flex: 2,
                cellRenderer: ({ data }: { data?: LocalFieldDisplay }) => {
                  if (!data) return null;
                  const cf = data.isCalcField ? calcFields.find((c) => c.fieldCode === data.fieldName) : undefined;
                  return (
                    <div className="flex items-center gap-1.5 h-full">
                      {data.isCalcField && (
                        <Tooltip
                          title={
                            cf ? (
                              <div className="text-xs">
                                <div className="font-semibold mb-1">계산식</div>
                                <div className="font-mono">{cf.rowExpression}</div>
                                {cf.aggExpression && <div className="font-mono mt-1 opacity-80">집계: {cf.aggExpression}</div>}
                              </div>
                            ) : (
                              '계산필드'
                            )
                          }
                        >
                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-600 font-mono text-xs font-bold text-white cursor-help">
                            ƒ
                          </span>
                        </Tooltip>
                      )}
                      <span className={`font-mono font-semibold truncate ${!data.isVisible ? 'opacity-40' : data.isCalcField ? 'text-green-700' : ''}`}>{data.fieldName}</span>
                    </div>
                  );
                },
              },
              {
                headerName: '서식',
                field: 'columnFormat',
                width: 160,
                cellRenderer: ({ data }: { data?: LocalFieldDisplay }) =>
                  data ? (
                    <div className="flex items-center h-full w-full">
                      <Select
                        size="small"
                        value={data.columnFormat as ColumnFormat}
                        options={FORMAT_OPTIONS}
                        onChange={(v) => updateField(data.fieldName, { columnFormat: v })}
                        disabled={!data.isVisible}
                        style={{ width: '100%' }}
                      />
                    </div>
                  ) : null,
              },
              {
                headerName: '표시명',
                field: 'displayName',
                flex: 3,
                cellRenderer: ({ data }: { data?: LocalFieldDisplay }) =>
                  data ? (
                    <div className="flex items-center h-full w-full">
                      <Input size="small" value={data.displayName} onChange={(e) => updateField(data.fieldName, { displayName: e.target.value })} disabled={!data.isVisible} />
                    </div>
                  ) : null,
              },
              {
                headerName: '',
                maxWidth: 72,
                sortable: false,
                suppressHeaderMenuButton: true,
                cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' },
                cellRenderer: ({ data }: { data?: LocalFieldDisplay }) => {
                  if (!data?.isCalcField) return null;
                  const cf = calcFields.find((c) => c.fieldCode === data.fieldName);
                  if (!cf) return null;
                  return (
                    <>
                      <Button size="small" type="text" icon={<Edit2 className="w-3 h-3" />} onClick={() => setEditing({ mode: 'edit', localId: cf._localId })} />
                      <Button size="small" type="text" danger icon={<X className="w-3 h-3" />} onClick={() => deleteCalcField(cf._localId)} />
                    </>
                  );
                },
              },
            ];

            const sortedRows = [...fieldDisplays].sort((a, b) => a.sortOrder - b.sortOrder);

            return (
              <div className="h-full">
                <AgGridReact<LocalFieldDisplay>
                  rowData={sortedRows}
                  columnDefs={columnDefs}
                  gridOptions={{ ...gridOptions, rowNumbers: false, pagination: false, statusBar: undefined }}
                  rowHeight={40}
                  getRowId={({ data }) => data.fieldName}
                  getRowClass={({ data }) => {
                    if (data?.isCalcField) return 'ag-row-calc';
                    if (!data?.isVisible) return 'ag-row-hidden';
                    return '';
                  }}
                />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
