import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Checkbox, Form, Input, Modal, Select, Table, Tabs, Tag, Tooltip } from 'antd';
import { CheckCircle, Edit2, GripVertical, Plus, Trash2, XCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetConditionList, useGetDatasourceDetail, useValidateFormula } from '../../../../features/stat/hooks/useStatQueries';

// ─── Constants ────────────────────────────────────────────────────────────────

export const FORMAT_OPTIONS = ['Unselected', 'Number', 'String', 'Time', 'Rate', 'Date', 'Decimal'] as const;
export const AGG_OPTIONS = ['Unselected', 'Sum', 'Avg', 'Max', 'Min', 'Cnt'] as const;
export const FILTER_OPTIONS = ['Unselected', '=', '>=', '<=', 'BETWEEN', 'IN', 'NOT IN'] as const;

type Format = (typeof FORMAT_OPTIONS)[number];
type Agg = (typeof AGG_OPTIONS)[number];
type Filter = (typeof FILTER_OPTIONS)[number];

const DEFAULT_FLAGS = {
  groupYn: false,
  selectYn: false,
  valueYn: false,
  whereYn: false,
  pivotYn: false,
  compareYn: false,
  footerHideYn: false,
  refColYn: false,
  agg: 'Unselected' as Agg,
  format: 'Unselected' as Format,
  filter: 'Unselected' as Filter,
  groupHeaderName: '',
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FieldMapping {
  datasourceKey: string;
  fieldName: string;
  displayName: string;
  fieldType: string; // NUMBER | STRING | DATETIME
  fieldRole: string; // DIMENSION | MEASURE | TIMESTAMP
  alias: string;
  groupHeaderName: string;
  groupYn: boolean;
  selectYn: boolean;
  valueYn: boolean;
  whereYn: boolean;
  pivotYn: boolean;
  compareYn: boolean;
  footerHideYn: boolean;
  refColYn: boolean;
  agg: Agg;
  format: Format;
  filter: Filter;
  sortOrder: number;
  enabled: boolean;
}

export interface CalcField {
  fieldName: string;
  displayName: string;
  alias: string;
  formula: string;
  fieldType: string;
  groupHeaderName: string;
  groupYn: boolean;
  selectYn: boolean;
  valueYn: boolean;
  whereYn: boolean;
  pivotYn: boolean;
  compareYn: boolean;
  footerHideYn: boolean;
  refColYn: boolean;
  agg: Agg;
  format: Format;
  filter: Filter;
  sortOrder: number;
}

export interface SearchBind {
  conditionId: number | null;
  conditionName: string;
  bindDatasourceKey: string;
  bindFieldName: string;
  sortOrder: number;
}

interface FieldRow {
  rowId: string;
  isCalc: boolean;
  sortOrder: number;
  fieldName: string;
  displayName: string;
  alias: string;
  groupHeaderName: string;
  enabled: boolean;
  datasourceKey?: string;
  fieldType?: string;
  fieldRole?: string;
  formula?: string;
  calcFieldType?: string;
  groupYn: boolean;
  selectYn: boolean;
  valueYn: boolean;
  whereYn: boolean;
  pivotYn: boolean;
  compareYn: boolean;
  footerHideYn: boolean;
  refColYn: boolean;
  agg: Agg;
  format: Format;
  filter: Filter;
}

interface Props {
  selectedDatasourceKeys: string[];
  fieldMappings: FieldMapping[];
  onFieldMappingsChange: (m: FieldMapping[]) => void;
  calcFields: CalcField[];
  onCalcFieldsChange: (c: CalcField[]) => void;
  searchBindings: SearchBind[];
  onSearchBindingsChange: (bindings: SearchBind[]) => void;
}

// ─── Converters ──────────────────────────────────────────────────────────────

function toFieldRows(fieldMappings: FieldMapping[], calcFields: CalcField[]): FieldRow[] {
  return [
    ...fieldMappings.map(
      (f): FieldRow => ({
        rowId: `f:${f.datasourceKey}:${f.fieldName}`,
        isCalc: false,
        sortOrder: f.sortOrder,
        fieldName: f.fieldName,
        displayName: f.displayName,
        alias: f.alias,
        groupHeaderName: f.groupHeaderName,
        enabled: f.enabled,
        datasourceKey: f.datasourceKey,
        fieldType: f.fieldType,
        fieldRole: f.fieldRole,
        groupYn: f.groupYn,
        selectYn: f.selectYn,
        valueYn: f.valueYn,
        whereYn: f.whereYn,
        pivotYn: f.pivotYn,
        compareYn: f.compareYn,
        footerHideYn: f.footerHideYn,
        refColYn: f.refColYn,
        agg: f.agg,
        format: f.format,
        filter: f.filter,
      }),
    ),
    ...calcFields.map(
      (c): FieldRow => ({
        rowId: `c:${c.fieldName}`,
        isCalc: true,
        sortOrder: c.sortOrder,
        fieldName: c.fieldName,
        displayName: c.displayName,
        alias: c.alias,
        groupHeaderName: c.groupHeaderName,
        enabled: true,
        formula: c.formula,
        calcFieldType: c.fieldType,
        fieldType: c.fieldType,
        groupYn: c.groupYn,
        selectYn: c.selectYn,
        valueYn: c.valueYn,
        whereYn: c.whereYn,
        pivotYn: c.pivotYn,
        compareYn: c.compareYn,
        footerHideYn: c.footerHideYn,
        refColYn: c.refColYn,
        agg: c.agg,
        format: c.format,
        filter: c.filter,
      }),
    ),
  ].sort((a, b) => a.sortOrder - b.sortOrder);
}

function fromFieldRows(rows: FieldRow[]): { fieldMappings: FieldMapping[]; calcFields: CalcField[] } {
  const fieldMappings: FieldMapping[] = [];
  const calcFields: CalcField[] = [];
  rows.forEach((row, idx) => {
    if (row.isCalc) {
      calcFields.push({
        fieldName: row.fieldName,
        displayName: row.displayName,
        alias: row.alias,
        formula: row.formula ?? '',
        fieldType: row.calcFieldType ?? 'NUMBER',
        groupHeaderName: row.groupHeaderName,
        groupYn: row.groupYn,
        selectYn: row.selectYn,
        valueYn: row.valueYn,
        whereYn: row.whereYn,
        pivotYn: row.pivotYn,
        compareYn: row.compareYn,
        footerHideYn: row.footerHideYn,
        refColYn: row.refColYn,
        agg: row.agg,
        format: row.format,
        filter: row.filter,
        sortOrder: idx,
      });
    } else {
      fieldMappings.push({
        datasourceKey: row.datasourceKey ?? '',
        fieldName: row.fieldName,
        displayName: row.displayName,
        fieldType: row.fieldType ?? '',
        fieldRole: row.fieldRole ?? '',
        alias: row.alias,
        groupHeaderName: row.groupHeaderName,
        groupYn: row.groupYn,
        selectYn: row.selectYn,
        valueYn: row.valueYn,
        whereYn: row.whereYn,
        pivotYn: row.pivotYn,
        compareYn: row.compareYn,
        footerHideYn: row.footerHideYn,
        refColYn: row.refColYn,
        agg: row.agg,
        format: row.format,
        filter: row.filter,
        sortOrder: idx,
        enabled: row.enabled,
      });
    }
  });
  return { fieldMappings, calcFields };
}

// ─── Drag Context ─────────────────────────────────────────────────────────────

interface DragCtx {
  draggingId: string | null;
  dragOverId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
}

const DragContext = createContext<DragCtx | null>(null);

function DraggableBodyRow({ 'data-row-key': rowId, style, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { 'data-row-key': string }) {
  const ctx = useContext(DragContext);
  if (!ctx) return <tr style={style} {...props} />;
  const isOver = ctx.dragOverId === rowId;
  const isDragging = ctx.draggingId === rowId;
  return (
    <tr
      {...props}
      draggable
      onDragStart={() => ctx.onDragStart(rowId)}
      onDragOver={(e) => {
        e.preventDefault();
        ctx.onDragOver(rowId);
      }}
      onDrop={() => ctx.onDrop(rowId)}
      onDragEnd={ctx.onDragEnd}
      style={{
        ...style,
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isOver ? 'inset 0 -2px 0 0 #3b82f6' : undefined,
        transition: 'opacity 0.15s',
      }}
    />
  );
}

const ROLE_COLOR: Record<string, string> = {
  DIMENSION: 'cyan',
  MEASURE: 'purple',
  TIMESTAMP: 'orange',
};

const TABLE_COMPONENTS = { body: { row: DraggableBodyRow } };

const PSR_TIME_KEY = 'PSR_TIME_KEY';

// ─── SearchBindingTab ─────────────────────────────────────────────────────────

interface SearchBindingTabProps {
  searchBindings: SearchBind[];
  onSearchBindingsChange: (bindings: SearchBind[]) => void;
  selectedDatasourceKeys: string[];
}

function SearchBindingTab({ searchBindings, onSearchBindingsChange, selectedDatasourceKeys }: SearchBindingTabProps) {
  const { data: conditions = [] } = useGetConditionList({});

  const addSearchBind = () => {
    onSearchBindingsChange([
      ...searchBindings,
      { conditionId: null, conditionName: '', bindDatasourceKey: selectedDatasourceKeys[0] || '', bindFieldName: '', sortOrder: searchBindings.length },
    ]);
  };

  const updateBind = (index: number, key: keyof SearchBind, value: unknown) => {
    const updated = [...searchBindings];
    updated[index] = { ...updated[index], [key]: value };
    if (key === 'conditionId') {
      const cond = conditions.find((c) => c.conditionId === value);
      if (cond) updated[index] = { ...updated[index], conditionName: cond.conditionName };
    }
    onSearchBindingsChange(updated);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-semibold text-gray-900">검색조건 바인딩</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">등록된 검색조건을 데이터소스 필드에 바인딩합니다.</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={addSearchBind}>
          검색조건 추가
        </Button>
      </div>
      {searchBindings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-14 text-[12px] text-gray-400">
          <p className="font-medium">바인딩된 검색조건이 없습니다</p>
          <button type="button" className="mt-2 text-blue-500 hover:underline" onClick={addSearchBind}>
            + 검색조건 추가
          </button>
        </div>
      ) : (
        <Table
          dataSource={searchBindings}
          rowKey={(_, idx) => String(idx)}
          pagination={false}
          size="small"
          bordered
          columns={[
            {
              title: '검색조건',
              width: 240,
              render: (_: unknown, __: SearchBind, idx: number) => (
                <Select
                  size="small"
                  value={searchBindings[idx].conditionId}
                  onChange={(v) => updateBind(idx, 'conditionId', v)}
                  options={conditions.map((c) => ({ value: c.conditionId, label: `${c.conditionName} (${c.inputType})` }))}
                  placeholder="검색조건 선택"
                  style={{ width: '100%' }}
                />
              ),
            },
            {
              title: '바인딩 데이터소스',
              width: 200,
              render: (_: unknown, __: SearchBind, idx: number) => (
                <Select
                  size="small"
                  value={searchBindings[idx].bindDatasourceKey}
                  onChange={(v) => updateBind(idx, 'bindDatasourceKey', v)}
                  options={selectedDatasourceKeys.map((k) => ({ value: k, label: k }))}
                  style={{ width: '100%' }}
                />
              ),
            },
            {
              title: '바인딩 필드',
              render: (_: unknown, __: SearchBind, idx: number) => (
                <Input
                  size="small"
                  value={searchBindings[idx].bindFieldName}
                  onChange={(e) => updateBind(idx, 'bindFieldName', e.target.value)}
                  placeholder="STAT_DATE"
                  style={{ fontFamily: 'monospace' }}
                />
              ),
            },
            {
              title: '',
              width: 48,
              render: (_: unknown, __: SearchBind, idx: number) => (
                <Button size="small" type="text" danger icon={<Trash2 size={14} />} onClick={() => onSearchBindingsChange(searchBindings.filter((_, i) => i !== idx))} />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StepFieldMapping({
  selectedDatasourceKeys,
  fieldMappings,
  onFieldMappingsChange,
  calcFields,
  onCalcFieldsChange,
  searchBindings,
  onSearchBindingsChange,
}: Props) {
  const selectedKey = selectedDatasourceKeys[0] ?? undefined;

  const { data: datasourceDetail } = useGetDatasourceDetail({
    params: selectedKey ? { key: selectedKey } : undefined,
    queryOptions: { enabled: !!selectedKey },
  });

  const validateMutation = useValidateFormula({});

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [calcEditRowId, setCalcEditRowId] = useState<string | null>(null);
  const [calcForm] = Form.useForm();
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const initializedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    initializedKeyRef.current = null;
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedKey || !datasourceDetail?.fields?.length) return;
    if (initializedKeyRef.current === selectedKey) return;
    initializedKeyRef.current = selectedKey;

    const dsFieldMap = new Map(datasourceDetail.fields.map((f) => [f.fieldName, f]));

    if (fieldMappings.length === 0) {
      onFieldMappingsChange(
        datasourceDetail.fields.map((field, order) => ({
          datasourceKey: selectedKey,
          fieldName: field.fieldName,
          displayName: field.displayName,
          fieldType: field.fieldType,
          fieldRole: field.fieldRole,
          alias: '',
          ...DEFAULT_FLAGS,
          sortOrder: order,
          enabled: false,
        })),
      );
    } else if (fieldMappings.some((fm) => !fm.fieldType)) {
      // 수정 모드(서버 로드): fieldType 없는 경우에만 보강
      onFieldMappingsChange(
        fieldMappings.map((fm) => {
          const dsField = dsFieldMap.get(fm.fieldName);
          return {
            ...DEFAULT_FLAGS,
            ...fm,
            enabled: true,
            fieldRole: dsField?.fieldRole ?? fm.fieldRole ?? '',
            fieldType: dsField?.fieldType ?? fm.fieldType ?? '',
          };
        }),
      );
    }
  }, [datasourceDetail, selectedKey]);

  const rows = useMemo(() => toFieldRows(fieldMappings, calcFields), [fieldMappings, calcFields]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // ── Row update helpers ────────────────────────────────────────────────────

  const applyRowChanges = useCallback(
    (updated: FieldRow[]) => {
      const { fieldMappings: fm, calcFields: cf } = fromFieldRows(updated);
      onFieldMappingsChange(fm);
      onCalcFieldsChange(cf);
    },
    [onFieldMappingsChange, onCalcFieldsChange],
  );

  const updateRow = useCallback(
    (rowId: string, changes: Partial<FieldRow>) => {
      const updated = rowsRef.current.map((r) => (r.rowId === rowId ? { ...r, ...changes } : r));
      applyRowChanges(updated);
    },
    [applyRowChanges],
  );

  // PSR_TIME_KEY 자동 설정
  const handleEnabledChange = useCallback(
    (rowId: string, enabled: boolean) => {
      const row = rowsRef.current.find((r) => r.rowId === rowId);
      if (!row) return;
      if (enabled && row.fieldName.toUpperCase() === PSR_TIME_KEY) {
        updateRow(rowId, { enabled, groupYn: true, selectYn: true, format: 'Date', valueYn: false, agg: 'Unselected', compareYn: false });
      } else {
        updateRow(rowId, { enabled });
      }
    },
    [updateRow],
  );

  // 피벗: 1개 제한 + 비교와 상호 배타
  const handlePivotYnChange = useCallback(
    (rowId: string, value: boolean) => {
      if (value) {
        const hasCompare = rowsRef.current.some((r) => r.compareYn);
        if (hasCompare) {
          toast.error('피벗 컬럼과 비교 컬럼은 동시에 설정할 수 없습니다.');
          return;
        }
        const updated = rowsRef.current.map((r) => ({ ...r, pivotYn: r.rowId === rowId }));
        applyRowChanges(updated);
      } else {
        updateRow(rowId, { pivotYn: false });
      }
    },
    [applyRowChanges, updateRow],
  );

  // 비교: 1개 제한 + 피벗과 상호 배타
  const handleCompareYnChange = useCallback(
    (rowId: string, value: boolean) => {
      if (value) {
        const hasPivot = rowsRef.current.some((r) => r.pivotYn);
        if (hasPivot) {
          toast.error('피벗 컬럼과 비교 컬럼은 동시에 설정할 수 없습니다.');
          return;
        }
        const updated = rowsRef.current.map((r) => ({ ...r, compareYn: r.rowId === rowId }));
        applyRowChanges(updated);
      } else {
        updateRow(rowId, { compareYn: false });
      }
    },
    [applyRowChanges, updateRow],
  );

  // ── Drag ──────────────────────────────────────────────────────────────────

  const handleDrop = useCallback(
    (targetId: string) => {
      const current = rowsRef.current;
      const fromIdx = current.findIndex((r) => r.rowId === draggingId);
      const toIdx = current.findIndex((r) => r.rowId === targetId);
      setDraggingId(null);
      setDragOverId(null);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
      const next = [...current];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      applyRowChanges(next);
    },
    [draggingId, applyRowChanges],
  );

  const dragCtx = useMemo<DragCtx>(
    () => ({
      draggingId,
      dragOverId,
      onDragStart: setDraggingId,
      onDragOver: setDragOverId,
      onDrop: handleDrop,
      onDragEnd: () => {
        setDraggingId(null);
        setDragOverId(null);
      },
    }),
    [draggingId, dragOverId, handleDrop],
  );

  // ── Import handlers ───────────────────────────────────────────────────────

  const makeDefaultField = (field: { fieldName: string; displayName: string; fieldType: string; fieldRole: string }, order: number): FieldMapping => ({
    datasourceKey: selectedKey!,
    fieldName: field.fieldName,
    displayName: field.displayName,
    fieldType: field.fieldType,
    fieldRole: field.fieldRole,
    alias: '',
    ...DEFAULT_FLAGS,
    sortOrder: order,
    enabled: false,
  });

  const handleImportReset = () => {
    if (!datasourceDetail?.fields?.length || !selectedKey) return;
    initializedKeyRef.current = selectedKey;
    onFieldMappingsChange(datasourceDetail.fields.map(makeDefaultField));
    setImportModalOpen(false);
  };

  const handleImportKeep = () => {
    if (!datasourceDetail?.fields?.length || !selectedKey) return;
    const existing = new Set(fieldMappings.map((f) => f.fieldName));
    const newFields = datasourceDetail.fields.filter((f) => !existing.has(f.fieldName)).map((f, i) => makeDefaultField(f, fieldMappings.length + i));
    if (newFields.length === 0) {
      setImportModalOpen(false);
      return;
    }
    onFieldMappingsChange([...fieldMappings, ...newFields]);
    setImportModalOpen(false);
  };

  // ── Calc modal ────────────────────────────────────────────────────────────

  const openAddCalcModal = () => {
    setCalcEditRowId(null);
    calcForm.setFieldsValue({
      fieldType: 'NUMBER',
      formula: '',
      fieldName: '',
      displayName: '',
      alias: '',
      groupHeaderName: '',
      groupYn: false,
      selectYn: false,
      valueYn: false,
      whereYn: false,
      pivotYn: false,
      compareYn: false,
      footerHideYn: false,
      refColYn: false,
      agg: 'Unselected',
      format: 'Unselected',
      filter: 'Unselected',
    });
    setValidationResult(null);
    setCalcModalOpen(true);
  };

  const openEditCalcModal = (row: FieldRow) => {
    setCalcEditRowId(row.rowId);
    calcForm.setFieldsValue({
      fieldName: row.fieldName,
      displayName: row.displayName,
      alias: row.alias,
      formula: row.formula ?? '',
      fieldType: row.calcFieldType ?? 'NUMBER',
      groupHeaderName: row.groupHeaderName,
      groupYn: row.groupYn,
      selectYn: row.selectYn,
      valueYn: row.valueYn,
      whereYn: row.whereYn,
      pivotYn: row.pivotYn,
      compareYn: row.compareYn,
      footerHideYn: row.footerHideYn,
      refColYn: row.refColYn,
      agg: row.agg,
      format: row.format,
      filter: row.filter,
    });
    setValidationResult(null);
    setCalcModalOpen(true);
  };

  const handleCalcOk = () => {
    calcForm.validateFields().then((values) => {
      const current = rowsRef.current;
      let next: FieldRow[];
      const changes: Partial<FieldRow> = {
        fieldName: values.fieldName as string,
        displayName: (values.displayName as string) || (values.fieldName as string),
        alias: (values.alias as string) || '',
        formula: values.formula as string,
        calcFieldType: values.fieldType as string,
        fieldType: values.fieldType as string,
        groupHeaderName: (values.groupHeaderName as string) || '',
        groupYn: !!values.groupYn,
        selectYn: !!values.selectYn,
        valueYn: !!values.valueYn,
        whereYn: !!values.whereYn,
        pivotYn: !!values.pivotYn,
        compareYn: !!values.compareYn,
        footerHideYn: !!values.footerHideYn,
        refColYn: !!values.refColYn,
        agg: (values.agg as Agg) || 'Unselected',
        format: (values.format as Format) || 'Unselected',
        filter: (values.filter as Filter) || 'Unselected',
      };
      if (calcEditRowId) {
        next = current.map((r) => (r.rowId === calcEditRowId ? { ...r, ...changes } : r));
      } else {
        next = [
          ...current,
          {
            rowId: `c:${values.fieldName as string}`,
            isCalc: true,
            sortOrder: current.length,
            enabled: true,
            ...changes,
          } as FieldRow,
        ];
      }
      applyRowChanges(next);
      setCalcModalOpen(false);
    });
  };

  const removeCalcRow = useCallback(
    (rowId: string) => {
      applyRowChanges(rowsRef.current.filter((r) => r.rowId !== rowId));
    },
    [applyRowChanges],
  );

  const handleValidate = () => {
    const formula = calcForm.getFieldValue('formula') as string;
    const available = rowsRef.current.filter((r) => !r.isCalc).map((r) => r.fieldName);
    validateMutation.mutate(
      { formula, availableFields: available },
      {
        onSuccess: (result) => setValidationResult({ valid: result.valid, message: result.valid ? '유효한 수식입니다' : result.errors.join(', ') }),
      },
    );
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const enabledRows = rows.filter((r) => r.enabled || r.isCalc);
  const selectCount = enabledRows.filter((r) => r.selectYn).length;
  const valueCount = enabledRows.filter((r) => r.valueYn).length;
  const pivotCount = enabledRows.filter((r) => r.pivotYn).length;
  const compareCount = enabledRows.filter((r) => r.compareYn).length;

  // ── Column Definitions (Legacy Layout) ────────────────────────────────────

  const CB = (record: FieldRow, key: keyof FieldRow, handler?: (rowId: string, val: boolean) => void) => {
    const disabled = !record.isCalc && !record.enabled;
    const checked = !!record[key];
    const handleChange = handler
      ? (e: { target: { checked: boolean } }) => handler(record.rowId, e.target.checked)
      : (e: { target: { checked: boolean } }) => updateRow(record.rowId, { [key]: e.target.checked });
    return <Checkbox checked={checked} onChange={handleChange} disabled={disabled} />;
  };

  const columns = [
    {
      title: '',
      key: 'drag',
      width: 32,
      render: () => (
        <div className="flex justify-center text-gray-300 cursor-grab">
          <GripVertical size={14} />
        </div>
      ),
    },
    {
      title: () => {
        const nonCalc = rowsRef.current.filter((r) => !r.isCalc);
        const enabledCount = nonCalc.filter((r) => r.enabled).length;
        const allChecked = nonCalc.length > 0 && enabledCount === nonCalc.length;
        const indeterminate = enabledCount > 0 && !allChecked;
        const handleHeaderChange = () => {
          const next = !allChecked;
          applyRowChanges(rowsRef.current.map((r) => (r.isCalc ? r : { ...r, enabled: next })));
        };
        return (
          <div className="flex flex-col items-center gap-0.5">
            <Checkbox checked={allChecked} indeterminate={indeterminate} onChange={handleHeaderChange} />
            <span className="text-[10px] text-gray-500">활성</span>
          </div>
        );
      },
      key: 'enabled',
      width: 50,
      align: 'center' as const,
      render: (_: unknown, record: FieldRow) =>
        record.isCalc ? (
          <Tag color="purple" className="text-[10px] !m-0">
            계산
          </Tag>
        ) : (
          <Checkbox checked={record.enabled} onChange={(e) => handleEnabledChange(record.rowId, e.target.checked)} />
        ),
    },
    {
      title: '컬럼',
      key: 'fieldName',
      width: 170,
      render: (_: unknown, record: FieldRow) => (
        <div>
          <span className={`font-mono text-[12px] leading-tight ${record.isCalc ? 'text-purple-700' : 'text-gray-800'}`}>{record.fieldName}</span>
          <div className="mt-0.5 flex gap-1">
            {!record.isCalc && record.fieldRole && (
              <Tag color={ROLE_COLOR[record.fieldRole] ?? 'default'} className="text-[10px] !m-0">
                {record.fieldRole}
              </Tag>
            )}
            {record.isCalc && record.formula && (
              <Tooltip title={record.formula}>
                <span className="text-[10px] text-purple-400 font-mono cursor-default">{record.formula.length > 18 ? record.formula.slice(0, 18) + '…' : record.formula}</span>
              </Tooltip>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '표시명',
      key: 'alias',
      render: (_: unknown, record: FieldRow) => (
        <Input
          size="small"
          value={record.alias || record.displayName}
          onChange={(e) => updateRow(record.rowId, { alias: e.target.value })}
          disabled={!record.isCalc && !record.enabled}
        />
      ),
    },
    // ── 기준 컬럼 group ──
    {
      title: '기준 컬럼',
      key: 'group_header',
      children: [
        {
          title: '기준',
          key: 'groupYn',
          width: 46,
          align: 'center' as const,
          render: (_: unknown, record: FieldRow) => CB(record, 'groupYn'),
        },
        {
          title: '차원',
          key: 'selectYn',
          width: 46,
          align: 'center' as const,
          render: (_: unknown, record: FieldRow) => CB(record, 'selectYn'),
        },
        {
          title: '헤더명',
          key: 'groupHeaderName',
          width: 90,
          render: (_: unknown, record: FieldRow) => (
            <Input
              size="small"
              value={record.groupHeaderName}
              onChange={(e) => updateRow(record.rowId, { groupHeaderName: e.target.value })}
              disabled={!record.isCalc && !record.enabled}
            />
          ),
        },
      ],
    },
    // ── 피벗 ──
    {
      title: '피벗',
      key: 'pivot_header',
      children: [
        {
          title: '피벗',
          key: 'pivotYn',
          width: 46,
          align: 'center' as const,
          render: (_: unknown, record: FieldRow) => {
            if (!record.isCalc && record.fieldName.toUpperCase() === PSR_TIME_KEY) return null;
            return CB(record, 'pivotYn', handlePivotYnChange);
          },
        },
      ],
    },
    // ── 비교 ──
    {
      title: '비교',
      key: 'compare_header',
      children: [
        {
          title: '비교',
          key: 'compareYn',
          width: 46,
          align: 'center' as const,
          render: (_: unknown, record: FieldRow) => {
            if (!record.isCalc && record.fieldName.toUpperCase() === PSR_TIME_KEY) return null;
            return CB(record, 'compareYn', handleCompareYnChange);
          },
        },
      ],
    },
    // ── 값 컬럼 group ──
    {
      title: '값 컬럼',
      key: 'value_header',
      children: [
        {
          title: '값',
          key: 'valueYn',
          width: 46,
          align: 'center' as const,
          render: (_: unknown, record: FieldRow) => CB(record, 'valueYn'),
        },
        {
          title: '집계',
          key: 'agg',
          width: 90,
          render: (_: unknown, record: FieldRow) => {
            const disabled = !record.isCalc && !record.enabled;
            return (
              <Select
                size="small"
                value={record.agg}
                style={{ width: '100%' }}
                disabled={disabled || !record.valueYn}
                onChange={(v) => updateRow(record.rowId, { agg: v as Agg })}
                options={AGG_OPTIONS.map((o) => ({ value: o, label: o === 'Unselected' ? '-' : o }))}
              />
            );
          },
        },
        {
          title: '합계미표시',
          key: 'footerHideYn',
          width: 52,
          align: 'center' as const,
          render: (_: unknown, record: FieldRow) => CB(record, 'footerHideYn'),
        },
        {
          title: '참조',
          key: 'refColYn',
          width: 46,
          align: 'center' as const,
          render: (_: unknown, record: FieldRow) => CB(record, 'refColYn'),
        },
      ],
    },
    // ── 서식 ──
    {
      title: '서식',
      key: 'format_header',
      children: [
        {
          title: '컬럼 서식',
          key: 'format',
          width: 110,
          render: (_: unknown, record: FieldRow) => {
            const disabled = !record.isCalc && !record.enabled;
            return (
              <Select
                size="small"
                value={record.format}
                style={{ width: '100%' }}
                disabled={disabled}
                onChange={(v) => updateRow(record.rowId, { format: v as Format })}
                options={FORMAT_OPTIONS.map((o) => ({ value: o, label: o === 'Unselected' ? '-' : o }))}
              />
            );
          },
        },
      ],
    },
    // ── 필터 컬럼 group ──
    {
      title: '필터 컬럼',
      key: 'filter_header',
      children: [
        {
          title: '지정',
          key: 'whereYn',
          width: 46,
          align: 'center' as const,
          render: (_: unknown, record: FieldRow) => CB(record, 'whereYn'),
        },
        {
          title: '필터수식',
          key: 'filter',
          width: 110,
          render: (_: unknown, record: FieldRow) => {
            const disabled = !record.isCalc && !record.enabled;
            return (
              <Select
                size="small"
                value={record.filter}
                style={{ width: '100%' }}
                disabled={disabled || !record.whereYn}
                onChange={(v) => updateRow(record.rowId, { filter: v as Filter })}
                options={FILTER_OPTIONS.map((o) => ({ value: o, label: o === 'Unselected' ? '-' : o }))}
              />
            );
          },
        },
      ],
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      render: (_: unknown, record: FieldRow) =>
        record.isCalc ? (
          <div className="flex gap-1">
            <Button size="small" type="text" icon={<Edit2 size={13} />} onClick={() => openEditCalcModal(record)} />
            <Button size="small" type="text" danger icon={<Trash2 size={13} />} onClick={() => removeCalcRow(record.rowId)} />
          </div>
        ) : null,
    },
  ];

  const isEmpty = rows.length === 0;
  const activeSearchCount = searchBindings.filter((s) => s.conditionId != null).length;

  const fieldTab = (
    <div className="space-y-3 pt-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-gray-900">필드 설정</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">활성 필드의 기준·피벗·비교·값·서식·필터 역할을 설정합니다.</p>
          {!isEmpty && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Tag color="blue">
                활성: {enabledRows.length}/{rows.length}
              </Tag>
              {selectCount > 0 && <Tag color="cyan">차원: {selectCount}</Tag>}
              {valueCount > 0 && <Tag color="purple">값: {valueCount}</Tag>}
              {pivotCount > 0 && <Tag color="orange">피벗: {pivotCount}</Tag>}
              {compareCount > 0 && <Tag color="red">비교: {compareCount}</Tag>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="small" disabled={!selectedKey} onClick={() => setImportModalOpen(true)}>
            컬럼 가져오기
          </Button>
          <Button size="small" icon={<Plus size={14} />} onClick={openAddCalcModal} disabled={!selectedKey}>
            계산컬럼 추가
          </Button>
        </div>
      </div>

      {/* Validation hints */}
      {!isEmpty && (selectCount === 0 || valueCount === 0) && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-700">
          차원(선택) 컬럼과 값 컬럼을 각각 1개 이상 설정해야 저장할 수 있습니다.
        </div>
      )}

      {/* Table */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-14 text-[12px] text-gray-400">
          <p className="font-medium">필드가 없습니다</p>
          <p className="mt-1 text-gray-300">데이터소스 탭에서 먼저 데이터소스를 선택해 주세요</p>
        </div>
      ) : (
        <DragContext.Provider value={dragCtx}>
          <Table
            dataSource={rows}
            rowKey="rowId"
            columns={columns}
            components={TABLE_COMPONENTS}
            pagination={false}
            size="small"
            bordered
            scroll={{ x: 'max-content' }}
            rowClassName={(record: FieldRow) => (!record.isCalc && !record.enabled ? 'opacity-40' : '')}
          />
        </DragContext.Provider>
      )}
    </div>
  );

  return (
    <>
      <Tabs
        defaultActiveKey="fields"
        type="card"
        size="small"
        items={[
          { key: 'fields', label: '📋 필드 설정', children: fieldTab },
          {
            key: 'search',
            label: (
              <span className="flex items-center gap-1.5">
                🔍 검색조건 바인딩
                {activeSearchCount > 0 && <Badge count={activeSearchCount} size="small" />}
              </span>
            ),
            children: (
              <div className="pt-4">
                <SearchBindingTab searchBindings={searchBindings} onSearchBindingsChange={onSearchBindingsChange} selectedDatasourceKeys={selectedDatasourceKeys} />
              </div>
            ),
          },
        ]}
      />

      {/* Calc modal */}
      <Modal
        title={calcEditRowId ? '계산 컬럼 수정' : '계산 컬럼 추가'}
        open={calcModalOpen}
        onOk={handleCalcOk}
        onCancel={() => setCalcModalOpen(false)}
        okText={calcEditRowId ? '수정' : '추가'}
        width={640}
        destroyOnHidden
      >
        <Form form={calcForm} layout="vertical" className="mt-4">
          <div className="grid grid-cols-3 gap-x-4">
            <Form.Item name="fieldName" label="필드명" rules={[{ required: true, message: '필드명을 입력하세요' }]}>
              <Input placeholder="CONVERSION_RATE" className="font-mono" />
            </Form.Item>
            <Form.Item name="displayName" label="표시명">
              <Input placeholder="전환율" />
            </Form.Item>
            <Form.Item name="alias" label="별칭">
              <Input placeholder="별칭" />
            </Form.Item>
          </div>
          <Form.Item name="formula" label="수식" rules={[{ required: true, message: '수식을 입력하세요' }]}>
            <Input.TextArea rows={3} placeholder="{SUCCESS_CNT} / {TOTAL_CNT} * 100" className="font-mono text-sm" />
          </Form.Item>
          <div className="mb-4 flex items-center gap-3">
            <Button size="small" loading={validateMutation.isPending} onClick={handleValidate}>
              수식 검증
            </Button>
            {validationResult && (
              <div className={`flex items-center gap-1 text-xs ${validationResult.valid ? 'text-emerald-600' : 'text-red-500'}`}>
                {validationResult.valid ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {validationResult.message}
              </div>
            )}
          </div>
          <div className="mb-4 rounded-md bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
            <span className="font-medium text-gray-600">사용 가능 함수:</span>{' '}
            {['SUM()', 'AVG()', 'IF()', 'ROUND()', 'NULLIF()', 'COALESCE()'].map((f) => (
              <code
                key={f}
                className="mx-0.5 cursor-pointer rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[11px] text-purple-700 hover:border-purple-300"
                onClick={() => calcForm.setFieldValue('formula', ((calcForm.getFieldValue('formula') as string) ?? '') + f)}
              >
                {f}
              </code>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-x-4">
            <Form.Item name="fieldType" label="데이터 타입">
              <Select
                options={[
                  { value: 'NUMBER', label: 'NUMBER' },
                  { value: 'STRING', label: 'STRING' },
                ]}
              />
            </Form.Item>
            <Form.Item name="agg" label="집계">
              <Select options={AGG_OPTIONS.map((o) => ({ value: o, label: o === 'Unselected' ? '-' : o }))} />
            </Form.Item>
            <Form.Item name="format" label="서식">
              <Select options={FORMAT_OPTIONS.map((o) => ({ value: o, label: o === 'Unselected' ? '-' : o }))} />
            </Form.Item>
          </div>
          <Form.Item name="groupHeaderName" label="헤더명">
            <Input placeholder="그룹 헤더명" />
          </Form.Item>
          <div className="flex flex-wrap gap-5">
            {(['groupYn', 'selectYn', 'valueYn', 'whereYn', 'footerHideYn', 'refColYn'] as const).map((key) => (
              <Form.Item key={key} name={key} valuePropName="checked" className="mb-0">
                <Checkbox>{{ groupYn: '기준', selectYn: '차원', valueYn: '값', whereYn: '지정(Where)', footerHideYn: '합계미표시', refColYn: '참조컬럼' }[key]}</Checkbox>
              </Form.Item>
            ))}
          </div>
        </Form>
      </Modal>

      {/* 컬럼 가져오기 모달 */}
      <Modal title="컬럼 가져오기" open={importModalOpen} onCancel={() => setImportModalOpen(false)} footer={null} width={480}>
        <p className="mb-4 text-[12px] text-gray-500">저장된 컬럼 정보와 데이터소스의 현재 컬럼을 비교해 가져옵니다.</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex flex-col gap-2 rounded-lg border-2 border-gray-200 p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/40"
            onClick={handleImportReset}
          >
            <span className="text-[13px] font-semibold text-gray-800">컬럼정보 초기화</span>
            <span className="text-[12px] text-gray-500">현재 매핑된 컬럼을 모두 지우고 데이터소스 컬럼을 새로 불러옵니다. 기존 설정이 초기화됩니다.</span>
          </button>
          <button
            type="button"
            className="flex flex-col gap-2 rounded-lg border-2 border-gray-200 p-4 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/40"
            onClick={handleImportKeep}
          >
            <span className="text-[13px] font-semibold text-gray-800">컬럼정보 유지</span>
            <span className="text-[12px] text-gray-500">기존 컬럼 설정은 유지하고 데이터소스에 새로 추가된 컬럼만 가져옵니다.</span>
          </button>
        </div>
      </Modal>
    </>
  );
}
