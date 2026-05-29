import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColDef, IHeaderParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Checkbox, Divider, Input, Modal, Select, Tag, Tooltip } from 'antd';
import { Download, Edit2, Play, Plus, Trash2 } from 'lucide-react';
import { format as formatSql } from 'sql-formatter';
import { toast } from '@/shared-util';
import CalcFieldEditor from './CalcFieldEditor';
import type { CalcFieldCreateDatas, ColumnFormat, DomainCode } from '../../report/types';
import { datasetApi } from '../api/datasetApi';
import { useGetDataSourceFields, useGetSchemaPreview } from '../hooks/useDatasetQueries';
import type { LocalCalcFieldDraft, LocalFieldDisplay, ValidationStatus } from '../types';
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

function formatTimeAgo(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return '방금 전 검증';
  if (diffMin < 60) return `${diffMin}분 전 검증`;
  return `${Math.floor(diffMin / 60)}시간 전 검증`;
}

function ValidationChip({ status, checkedAt, errors }: { status: ValidationStatus; checkedAt?: Date; errors?: string[] }) {
  if (status === 'unchecked') return <Tag className="select-none">미검증</Tag>;
  if (status === 'checking')
    return (
      <Tag color="processing" className="select-none">
        검증 중…
      </Tag>
    );
  if (status === 'valid') {
    return (
      <Tooltip title={checkedAt ? formatTimeAgo(checkedAt) : undefined}>
        <Tag color="success" className="select-none cursor-default">
          유효 ✓
        </Tag>
      </Tooltip>
    );
  }
  if (status === 'stale') {
    return (
      <Tooltip title="필드가 변경되어 재검증이 필요합니다">
        <Tag color="warning" className="select-none cursor-default">
          재검증 필요
        </Tag>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={errors?.length ? errors.join(' / ') : '검증 실패'}>
      <Tag color="error" className="select-none cursor-default">
        무효 ✕
      </Tag>
    </Tooltip>
  );
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
  datasetId?: number;
  dbViewPrefix?: string;
  domain: DomainCode;
  fieldDisplays: LocalFieldDisplay[];
  onFieldDisplaysChange: (displays: LocalFieldDisplay[]) => void;
  calcFields: LocalCalcFieldDraft[];
  onCalcFieldsChange: (fields: LocalCalcFieldDraft[]) => void;
  onEditingChange?: (isEditing: boolean) => void;
  onValidationStatusChange?: (status: ValidationStatus) => void;
}

export default function WizardStepB({
  datasetId,
  dbViewPrefix,
  domain,
  fieldDisplays,
  onFieldDisplaysChange,
  calcFields,
  onCalcFieldsChange,
  onEditingChange,
  onValidationStatusChange,
}: WizardStepBProps) {
  const [editing, setEditing] = useState<EditingState>({ mode: 'idle' });
  const { gridOptions } = useAggridOptions();

  // ─── Validation state ──────────────────────────────────────────────────────
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('unchecked');
  const [validationCheckedAt, setValidationCheckedAt] = useState<Date | undefined>();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSql, setValidationSql] = useState<string | undefined>();
  const [isChecking, setIsChecking] = useState(false);

  const validationStatusRef = useRef<ValidationStatus>('unchecked');
  useEffect(() => {
    validationStatusRef.current = validationStatus;
    onValidationStatusChange?.(validationStatus);
  }, [validationStatus, onValidationStatusChange]);

  // fingerprint: 검증 후 필드 변경 감지 → stale
  const fieldFingerprint = useMemo(() => {
    const fStr = fieldDisplays
      .filter((f) => !f.isCalcField)
      .map((f) => `${f.fieldName}:${f.displayName}:${f.fieldType}:${f.columnFormat}`)
      .join('|');
    const cStr = calcFields.map((c) => `${c.fieldCode}:${c.rowExpression}:${c.displayName}:${c.columnFormat}`).join('|');
    return `${fStr}__${cStr}`;
  }, [fieldDisplays, calcFields]);

  const prevFingerprintRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevFingerprintRef.current;
    prevFingerprintRef.current = fieldFingerprint;
    if (prev === null || prev === fieldFingerprint) return;
    const s = validationStatusRef.current;
    if (s === 'valid' || s === 'invalid') {
      setValidationStatus('stale');
    }
  }, [fieldFingerprint]);

  const handleValidate = async () => {
    setIsChecking(true);
    setValidationStatus('checking');
    try {
      const visibleRegularFields = fieldDisplays.filter((f) => f.isVisible && !f.isCalcField).map((f) => f.fieldName);
      // {FIELD_CODE} placeholder → 실제 컬럼명으로 치환 후 전송
      const stripBraces = (expr: string) => expr.replace(/\{([A-Za-z0-9_]+)\}/g, '$1');
      const calcExpressions = calcFields.map((c) => ({ alias: c.fieldCode, expression: stripBraces(c.rowExpression) }));
      const result = await datasetApi.validateFields({
        // 신규: dbViewPrefix 사용, 편집: datasetId 로 서버에서 prefix 조회
        ...(dbViewPrefix ? { dbViewPrefix } : { datasetId }),
        fields: visibleRegularFields,
        calcExpressions,
      });
      if (result.valid) {
        setValidationErrors([]);
        setValidationSql(undefined);
        setValidationCheckedAt(new Date());
        setValidationStatus('valid');
        toast.success(`모든 필드가 유효합니다. (${result.executionMs}ms)`);
      } else {
        const errors = result.errors ?? ['검증 실패'];
        setValidationErrors(errors);
        setValidationSql(result.executedSql);
        setValidationStatus('invalid');
        errors.forEach((e) => toast.error(e));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '검증 실행 중 오류가 발생했습니다.';
      setValidationErrors([msg]);
      setValidationStatus('invalid');
      toast.error(msg);
    } finally {
      setIsChecking(false);
    }
  };

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
    params: { datasetId: datasetId ?? 0 },
    queryOptions: { enabled: !!datasetId && !dbViewPrefix },
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

  const editorSourceFields = fieldDisplays.filter((f) => f.isVisible && !f.isCalcField);

  if (isLoading) return <FallbackSpinner />;

  // ─── Edit mode: full-width CalcFieldEditor ─────────────────────────────────
  if (editing.mode !== 'idle') {
    const editingDraft = editing.mode === 'edit' ? calcFields.find((c) => c._localId === editing.localId) : undefined;
    const otherCalcFields =
      editing.mode === 'edit'
        ? calcFields.filter((c) => c._localId !== editing.localId).map((c) => ({ fieldCode: c.fieldCode, _localId: c._localId, displayName: c.displayName }))
        : calcFields.map((c) => ({ fieldCode: c.fieldCode, _localId: c._localId, displayName: c.displayName }));

    return (
      <div className="flex h-full">
        <aside className="w-64 shrink-0 border-r border-border bg-muted/20 p-4 overflow-y-auto">
          <div className="mb-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">원천 뷰</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-white">{domain}</span>
              <span className="font-mono text-sm font-semibold truncate">{datasetId}</span>
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
            <span className="font-mono text-sm font-semibold truncate">{datasetId}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{sourceFields.length}개 컬럼</div>
        </div>

        <Input size="small" placeholder="필드 검색…" value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} className="mb-3" />

        {/* DIM 그룹 */}
        <div className="mb-4">
          <div className="mb-1 flex items-center gap-2 px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 cursor-default"
                      >
                        <span {...attributes} {...listeners} className="cursor-grab text-muted-foreground select-none touch-none font-mono text-xs">
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
          <div className="mb-1 flex items-center gap-2 px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
          <ValidationChip status={validationStatus} checkedAt={validationCheckedAt} errors={validationErrors} />
          <Button size="small" icon={<Play className="w-3 h-3" />} loading={isChecking} onClick={handleValidate} disabled={visibleCount === 0}>
            검증 실행
          </Button>
          <Divider type="vertical" className="mx-0" />
          <Button size="small" icon={<Download className="w-3 h-3" />} onClick={handleImportColumns}>
            컬럼 가져오기
          </Button>
          <Button size="small" type="primary" icon={<Plus className="w-3 h-3" />} onClick={() => setEditing({ mode: 'add' })}>
            계산필드 추가
          </Button>
        </div>

        {/* 검증 결과 인라인 에러 */}
        {validationStatus === 'invalid' && validationErrors.length > 0 && (
          <div className="shrink-0 mx-5 mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 space-y-2">
            <div className="text-xs font-semibold text-red-600">검증 실패 — DB에서 반환된 오류</div>
            <div className="space-y-0.5">
              {validationErrors.map((e, i) => (
                <div key={i} className="font-mono text-xs text-red-700 break-all">
                  {e}
                </div>
              ))}
            </div>
            {validationSql && (
              <details className="mt-1">
                <summary className="cursor-pointer text-[11px] text-red-500 hover:text-red-700 select-none">실행된 SQL 보기</summary>
                <pre className="mt-1 overflow-x-auto rounded bg-red-100 px-2 py-1.5 font-mono text-[11px] text-red-800 whitespace-pre-wrap">
                  {(() => {
                    try {
                      return formatSql(validationSql, { language: 'plsql', keywordCase: 'upper', tabWidth: 2 });
                    } catch {
                      return validationSql;
                    }
                  })()}
                </pre>
              </details>
            )}
          </div>
        )}
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
                      <Button size="small" type="text" danger icon={<Trash2 className="w-3 h-3" />} onClick={() => deleteCalcField(cf._localId)} />
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
