import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, Form, Input, Modal, Select, Table, Tag, Tooltip } from 'antd';
import { CheckCircle, Edit2, GripVertical, Plus, Trash2, XCircle } from 'lucide-react';
import { useGetDatasourceDetail, useValidateFormula } from '../../../../features/stat/hooks/useStatQueries';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FieldMapping {
  datasourceKey: string;
  fieldName: string;
  displayName: string;
  fieldType: string;
  fieldRole: string;
  alias: string;
  showInGrid: boolean;
  chartRole: string;
  aggregation: string;
  showRatio: boolean;
  format: string;
  sortOrder: number;
  enabled: boolean;
}

export interface CalcField {
  fieldName: string;
  displayName: string;
  formula: string;
  fieldType: string;
  showInGrid: boolean;
  chartRole: string;
  showRatio: boolean;
  format: string;
  sortOrder: number;
}

interface FieldRow {
  rowId: string;
  isCalc: boolean;
  sortOrder: number;
  fieldName: string;
  aliasName: string;
  originalDisplayName: string;
  enabled: boolean;
  showInGrid: boolean;
  chartRole: string;
  fieldRole?: string;
  aggregation?: string;
  showRatio?: boolean;
  format?: string;
  datasourceKey?: string;
  fieldType?: string;
  formula?: string;
  calcType?: string;
}

interface Props {
  selectedDatasourceKeys: string[];
  fieldMappings: FieldMapping[];
  onFieldMappingsChange: (m: FieldMapping[]) => void;
  calcFields: CalcField[];
  onCalcFieldsChange: (c: CalcField[]) => void;
}

// ─── Converters ──────────────────────────────────────────────────────────────

function toFieldRows(fieldMappings: FieldMapping[], calcFields: CalcField[]): FieldRow[] {
  return [
    ...fieldMappings.map(
      (f): FieldRow => ({
        rowId: `f:${f.fieldName}`,
        isCalc: false,
        sortOrder: f.sortOrder,
        fieldName: f.fieldName,
        aliasName: f.alias || f.displayName,
        originalDisplayName: f.displayName,
        enabled: f.enabled,
        showInGrid: f.showInGrid,
        chartRole: f.chartRole,
        fieldRole: f.fieldRole,
        aggregation: f.aggregation,
        showRatio: f.showRatio,
        format: f.format,
        datasourceKey: f.datasourceKey,
        fieldType: f.fieldType,
      }),
    ),
    ...calcFields.map(
      (c): FieldRow => ({
        rowId: `c:${c.fieldName}`,
        isCalc: true,
        sortOrder: c.sortOrder,
        fieldName: c.fieldName,
        aliasName: c.displayName,
        originalDisplayName: c.displayName,
        enabled: true,
        showInGrid: c.showInGrid,
        chartRole: c.chartRole,
        formula: c.formula,
        calcType: c.fieldType,
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
        displayName: row.aliasName,
        formula: row.formula ?? '',
        fieldType: row.calcType ?? 'NUMBER',
        showInGrid: row.showInGrid,
        chartRole: row.chartRole,
        showRatio: false,
        format: '',
        sortOrder: idx,
      });
    } else {
      fieldMappings.push({
        datasourceKey: row.datasourceKey ?? '',
        fieldName: row.fieldName,
        displayName: row.originalDisplayName,
        fieldType: row.fieldType ?? '',
        fieldRole: row.fieldRole ?? '',
        alias: row.aliasName !== row.originalDisplayName ? row.aliasName : '',
        showInGrid: row.showInGrid,
        chartRole: row.chartRole,
        aggregation: row.aggregation ?? '',
        showRatio: row.showRatio ?? false,
        format: row.format ?? '',
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

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_ROLE_OPTIONS = [
  { value: '', label: '-' },
  { value: 'X_AXIS', label: 'X축' },
  { value: 'Y_AXIS', label: 'Y축' },
  { value: 'GROUP', label: '그룹' },
  { value: 'VALUE', label: '값' },
  { value: 'LABEL', label: '라벨' },
];

const AGGREGATION_OPTIONS = [
  { value: '', label: '-' },
  { value: 'SUM', label: 'SUM' },
  { value: 'AVG', label: 'AVG' },
  { value: 'COUNT', label: 'COUNT' },
  { value: 'MAX', label: 'MAX' },
  { value: 'MIN', label: 'MIN' },
];

const ROLE_COLOR: Record<string, string> = {
  DIMENSION: 'cyan',
  MEASURE: 'purple',
  TIMESTAMP: 'orange',
};

const TABLE_COMPONENTS = { body: { row: DraggableBodyRow } };

// ─── Component ────────────────────────────────────────────────────────────────

export default function StepFieldMapping({ selectedDatasourceKeys, fieldMappings, onFieldMappingsChange, calcFields, onCalcFieldsChange }: Props) {
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

  // selectedKey 변경 시 초기화 추적 리셋
  const initializedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    initializedKeyRef.current = null;
  }, [selectedKey]);

  // ── 필드 초기 로드/보강 (최초 1회/datasource 변경 시) ────────────────────
  useEffect(() => {
    if (!selectedKey || !datasourceDetail?.fields?.length) return;
    if (initializedKeyRef.current === selectedKey) return; // 이미 처리됨
    initializedKeyRef.current = selectedKey;

    const dsFieldMap = new Map(datasourceDetail.fields.map((f) => [f.fieldName, f]));

    if (fieldMappings.length === 0) {
      // 신규 생성: 전체 비활성 로드
      onFieldMappingsChange(
        datasourceDetail.fields.map((field, order) => ({
          datasourceKey: selectedKey,
          fieldName: field.fieldName,
          displayName: field.displayName,
          fieldType: field.fieldType,
          fieldRole: field.fieldRole,
          alias: '',
          showInGrid: true,
          chartRole: '',
          aggregation: '',
          showRatio: false,
          format: '',
          sortOrder: order,
          enabled: false,
        })),
      );
    } else {
      // 수정 모드: 저장된 필드에 fieldRole/fieldType 보강 + enabled: true 적용
      onFieldMappingsChange(
        fieldMappings.map((fm) => {
          const dsField = dsFieldMap.get(fm.fieldName);
          return {
            ...fm,
            enabled: true,
            fieldRole: dsField?.fieldRole ?? fm.fieldRole ?? '',
            fieldType: dsField?.fieldType ?? fm.fieldType ?? '',
          };
        }),
      );
    }
  }, [datasourceDetail, selectedKey]); // fieldMappings 의도적으로 제외

  // ── Derived rows ──────────────────────────────────────────────────────────
  const rows = useMemo(() => toFieldRows(fieldMappings, calcFields), [fieldMappings, calcFields]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // ── Row helpers ───────────────────────────────────────────────────────────
  const updateRow = useCallback(
    (rowId: string, changes: Partial<FieldRow>) => {
      const updated = rowsRef.current.map((r) => (r.rowId === rowId ? { ...r, ...changes } : r));
      const { fieldMappings: fm, calcFields: cf } = fromFieldRows(updated);
      onFieldMappingsChange(fm);
      onCalcFieldsChange(cf);
    },
    [onFieldMappingsChange, onCalcFieldsChange],
  );

  const handleSelectAll = useCallback(
    (enabled: boolean) => {
      const updated = rowsRef.current.map((r) => (r.isCalc ? r : { ...r, enabled }));
      const { fieldMappings: fm, calcFields: cf } = fromFieldRows(updated);
      onFieldMappingsChange(fm);
      onCalcFieldsChange(cf);
    },
    [onFieldMappingsChange, onCalcFieldsChange],
  );

  // ── 컬럼 가져오기 ─────────────────────────────────────────────────────────
  const handleImportReset = () => {
    if (!datasourceDetail?.fields?.length || !selectedKey) return;
    initializedKeyRef.current = selectedKey;
    onFieldMappingsChange(
      datasourceDetail.fields.map((field, order) => ({
        datasourceKey: selectedKey,
        fieldName: field.fieldName,
        displayName: field.displayName,
        fieldType: field.fieldType,
        fieldRole: field.fieldRole,
        alias: '',
        showInGrid: true,
        chartRole: '',
        aggregation: '',
        showRatio: false,
        format: '',
        sortOrder: order,
        enabled: false,
      })),
    );
    setImportModalOpen(false);
  };

  const handleImportKeep = () => {
    if (!datasourceDetail?.fields?.length || !selectedKey) return;
    const existingNames = new Set(fieldMappings.map((f) => f.fieldName));
    const newFields = datasourceDetail.fields
      .filter((f) => !existingNames.has(f.fieldName))
      .map((field, i) => ({
        datasourceKey: selectedKey,
        fieldName: field.fieldName,
        displayName: field.displayName,
        fieldType: field.fieldType,
        fieldRole: field.fieldRole,
        alias: '',
        showInGrid: true,
        chartRole: '',
        aggregation: '',
        showRatio: false,
        format: '',
        sortOrder: fieldMappings.length + i,
        enabled: false,
      }));
    if (newFields.length === 0) {
      setImportModalOpen(false);
      return;
    }
    onFieldMappingsChange([...fieldMappings, ...newFields]);
    setImportModalOpen(false);
  };

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
      const { fieldMappings: fm, calcFields: cf } = fromFieldRows(next);
      onFieldMappingsChange(fm);
      onCalcFieldsChange(cf);
    },
    [draggingId, onFieldMappingsChange, onCalcFieldsChange],
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

  // ── Calc modal ────────────────────────────────────────────────────────────
  const openAddCalcModal = () => {
    setCalcEditRowId(null);
    calcForm.setFieldsValue({ fieldType: 'NUMBER', showInGrid: true, showRatio: false, chartRole: '', fieldName: '', displayName: '', formula: '' });
    setValidationResult(null);
    setCalcModalOpen(true);
  };

  const openEditCalcModal = (row: FieldRow) => {
    setCalcEditRowId(row.rowId);
    calcForm.setFieldsValue({
      fieldName: row.fieldName,
      displayName: row.aliasName,
      formula: row.formula ?? '',
      fieldType: row.calcType ?? 'NUMBER',
      chartRole: row.chartRole,
      showInGrid: row.showInGrid,
      showRatio: false,
    });
    setValidationResult(null);
    setCalcModalOpen(true);
  };

  const handleCalcOk = () => {
    calcForm.validateFields().then((values) => {
      const current = rowsRef.current;
      let next: FieldRow[];
      if (calcEditRowId) {
        next = current.map((r) =>
          r.rowId === calcEditRowId
            ? {
                ...r,
                fieldName: values.fieldName as string,
                aliasName: (values.displayName as string) || (values.fieldName as string),
                originalDisplayName: (values.displayName as string) || (values.fieldName as string),
                formula: values.formula as string,
                calcType: values.fieldType as string,
                chartRole: (values.chartRole as string) ?? '',
                showInGrid: values.showInGrid as boolean,
              }
            : r,
        );
      } else {
        const newRow: FieldRow = {
          rowId: `c:${values.fieldName as string}`,
          isCalc: true,
          sortOrder: current.length,
          fieldName: values.fieldName as string,
          aliasName: (values.displayName as string) || (values.fieldName as string),
          originalDisplayName: (values.displayName as string) || (values.fieldName as string),
          enabled: true,
          showInGrid: (values.showInGrid as boolean) ?? true,
          chartRole: (values.chartRole as string) ?? '',
          formula: values.formula as string,
          calcType: (values.fieldType as string) ?? 'NUMBER',
        };
        next = [...current, newRow];
      }
      const { fieldMappings: fm, calcFields: cf } = fromFieldRows(next);
      onFieldMappingsChange(fm);
      onCalcFieldsChange(cf);
      setCalcModalOpen(false);
    });
  };

  const removeCalcRow = useCallback(
    (rowId: string) => {
      const updated = rowsRef.current.filter((r) => r.rowId !== rowId);
      const { fieldMappings: fm, calcFields: cf } = fromFieldRows(updated);
      onFieldMappingsChange(fm);
      onCalcFieldsChange(cf);
    },
    [onFieldMappingsChange, onCalcFieldsChange],
  );

  const handleValidate = () => {
    const formula = calcForm.getFieldValue('formula') as string;
    const available = rowsRef.current.filter((r) => !r.isCalc && r.enabled).map((r) => r.fieldName);
    validateMutation.mutate(
      { formula, availableFields: available },
      {
        onSuccess: (result) =>
          setValidationResult({
            valid: result.valid,
            message: result.valid ? '유효한 수식입니다' : result.errors.join(', '),
          }),
      },
    );
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const enabledCount = rows.filter((r) => r.enabled || r.isCalc).length;
  const yAxisCount = rows.filter((r) => (r.enabled || r.isCalc) && r.chartRole === 'Y_AXIS').length;
  const calcCount = rows.filter((r) => r.isCalc).length;

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: '',
      key: 'drag',
      width: 36,
      render: () => (
        <div className="flex justify-center text-gray-300 cursor-grab">
          <GripVertical size={14} />
        </div>
      ),
    },
    {
      title: <span className="text-[11px]">활성</span>,
      key: 'enabled',
      width: 52,
      align: 'center' as const,
      render: (_: unknown, record: FieldRow) =>
        record.isCalc ? (
          <Tag color="purple" className="text-[10px] !m-0">
            계산
          </Tag>
        ) : (
          <Checkbox checked={record.enabled} onChange={(e) => updateRow(record.rowId, { enabled: e.target.checked })} />
        ),
    },
    {
      title: '컬럼',
      key: 'fieldName',
      width: 200,
      render: (_: unknown, record: FieldRow) => (
        <div>
          <span className={`font-mono text-[12px] leading-tight ${record.isCalc ? 'text-purple-700' : 'text-gray-800'}`}>{record.fieldName}</span>
          <div className="mt-0.5">
            {!record.isCalc && record.fieldRole && (
              <Tag color={ROLE_COLOR[record.fieldRole] ?? 'default'} className="text-[10px] !m-0">
                {record.fieldRole}
              </Tag>
            )}
            {record.isCalc && record.formula && (
              <Tooltip title={record.formula}>
                <span className="text-[10px] text-purple-400 font-mono cursor-default">{record.formula.length > 22 ? record.formula.slice(0, 22) + '…' : record.formula}</span>
              </Tooltip>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '표시명',
      key: 'aliasName',
      render: (_: unknown, record: FieldRow) => (
        <Input size="small" value={record.aliasName} onChange={(e) => updateRow(record.rowId, { aliasName: e.target.value })} disabled={!record.isCalc && !record.enabled} />
      ),
    },
    {
      title: '그리드',
      key: 'showInGrid',
      width: 56,
      align: 'center' as const,
      render: (_: unknown, record: FieldRow) => (
        <Checkbox checked={record.showInGrid} onChange={(e) => updateRow(record.rowId, { showInGrid: e.target.checked })} disabled={!record.isCalc && !record.enabled} />
      ),
    },
    {
      title: '차트 역할',
      key: 'chartRole',
      width: 120,
      render: (_: unknown, record: FieldRow) => (
        <Select
          size="small"
          value={record.chartRole}
          onChange={(v) => updateRow(record.rowId, { chartRole: v })}
          options={CHART_ROLE_OPTIONS}
          style={{ width: '100%' }}
          disabled={!record.isCalc && !record.enabled}
        />
      ),
    },
    {
      title: '집계',
      key: 'aggregation',
      width: 96,
      render: (_: unknown, record: FieldRow) =>
        !record.isCalc && record.fieldRole === 'MEASURE' ? (
          <Select
            size="small"
            value={record.aggregation}
            onChange={(v) => updateRow(record.rowId, { aggregation: v })}
            options={AGGREGATION_OPTIONS}
            style={{ width: '100%' }}
            disabled={!record.enabled}
          />
        ) : (
          <span className="px-2 text-[12px] text-gray-300">—</span>
        ),
    },
    {
      title: '비율%',
      key: 'showRatio',
      width: 56,
      align: 'center' as const,
      render: (_: unknown, record: FieldRow) =>
        !record.isCalc && record.fieldRole === 'MEASURE' ? (
          <Checkbox checked={record.showRatio ?? false} onChange={(e) => updateRow(record.rowId, { showRatio: e.target.checked })} disabled={!record.enabled} />
        ) : null,
    },
    {
      title: '포맷',
      key: 'format',
      width: 100,
      render: (_: unknown, record: FieldRow) =>
        !record.isCalc ? (
          <Input size="small" value={record.format ?? ''} onChange={(e) => updateRow(record.rowId, { format: e.target.value })} placeholder="#,###" disabled={!record.enabled} />
        ) : (
          <span className="px-2 text-[12px] text-gray-300">—</span>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 68,
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-gray-900">필드 매핑</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">활성할 필드를 선택하고 역할·집계를 설정합니다. 행을 드래그해 순서를 변경할 수 있습니다.</p>
          {!isEmpty && (
            <div className="flex gap-2 mt-2">
              <Tag color="blue">
                활성: {enabledCount}/{rows.length}
              </Tag>
              {yAxisCount > 0 && <Tag color="green">Y축: {yAxisCount}</Tag>}
              {calcCount > 0 && <Tag color="purple">계산컬럼: {calcCount}</Tag>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <>
              <Button size="small" onClick={() => handleSelectAll(true)}>
                전체 선택
              </Button>
              <Button size="small" onClick={() => handleSelectAll(false)}>
                전체 해제
              </Button>
            </>
          )}
          <Button size="small" disabled={!selectedKey} onClick={() => setImportModalOpen(true)}>
            컬럼 가져오기
          </Button>
          <Button icon={<Plus size={14} />} onClick={openAddCalcModal} disabled={!selectedKey}>
            계산컬럼 추가
          </Button>
        </div>
      </div>

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
            rowClassName={(record: FieldRow) => (!record.isCalc && !record.enabled ? 'opacity-40' : '')}
          />
        </DragContext.Provider>
      )}

      {/* Calc modal */}
      <Modal
        title={calcEditRowId ? '계산 컬럼 수정' : '계산 컬럼 추가'}
        open={calcModalOpen}
        onOk={handleCalcOk}
        onCancel={() => setCalcModalOpen(false)}
        okText={calcEditRowId ? '수정' : '추가'}
        width={600}
        destroyOnHidden
      >
        <Form form={calcForm} layout="vertical" className="mt-4">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="fieldName" label="필드명" rules={[{ required: true, message: '필드명을 입력하세요' }]}>
              <Input placeholder="CONVERSION_RATE" className="font-mono" />
            </Form.Item>
            <Form.Item name="displayName" label="표시명">
              <Input placeholder="전환율" />
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
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="fieldType" label="데이터 타입">
              <Select
                options={[
                  { value: 'NUMBER', label: 'NUMBER' },
                  { value: 'STRING', label: 'STRING' },
                ]}
              />
            </Form.Item>
            <Form.Item name="chartRole" label="차트 역할">
              <Select options={CHART_ROLE_OPTIONS} />
            </Form.Item>
          </div>
          <div className="flex gap-6">
            <Form.Item name="showInGrid" valuePropName="checked" className="mb-0">
              <Checkbox>그리드 표시</Checkbox>
            </Form.Item>
            <Form.Item name="showRatio" valuePropName="checked" className="mb-0">
              <Checkbox>비율% 표시</Checkbox>
            </Form.Item>
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
    </div>
  );
}
