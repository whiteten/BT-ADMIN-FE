import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import LookupCatalogDropdown from './LookupCatalogDropdown';
import { LOOKUP_MISS_POLICY_OPTIONS } from '../../constants/monitoringConstants';
import type { DatasetField, DatasetLookup, DatasetLookupField, FieldDataType, LookupCatalogItem } from '../../types';
import { IconTrash } from '@/components/custom/Icons';

export interface LookupEditDrawerRef {
  /** editingIndex 가 주어지면 편집, 없으면 신규 등록 */
  open: (params?: { initial?: DatasetLookup; editingIndex?: number }) => void;
  close: () => void;
}

interface LookupEditDrawerProps {
  /** 데이터셋의 기본 필드 (소스 후보 STRING/NUMBER 필터링용) */
  baseFields: DatasetField[];
  /** 기존 룩업 정의 — 같은 소스 필드 중복 차단 (편집 모드 자기 자신은 예외) */
  existingLookups: DatasetLookup[];
  /** 저장 콜백 — index 가 있으면 편집(replace), 없으면 신규 추가 */
  onOk: (lookup: DatasetLookup, editingIndex?: number) => void;
}

interface FormValues {
  sourceField: string;
  lookupCatalogId: number;
  catalogDisplayName?: string;
  catalogTableName?: string;
  keyColumn: string;
  joinType: 'LEFT' | 'INNER';
  cacheTtlSec: number;
  missPolicy: 'PASSTHROUGH' | 'EMPTY' | 'UNKNOWN';
  fields: DatasetLookupField[];
  lookupId?: number;
  datasetId?: number;
}

const DATA_TYPE_OPTIONS: Array<{ value: FieldDataType; label: string }> = [
  { value: 'STRING', label: 'STRING' },
  { value: 'NUMBER', label: 'NUMBER' },
  { value: 'DATE', label: 'DATE' },
  { value: 'DATETIME', label: 'DATETIME' },
  { value: 'TIME', label: 'TIME' },
  { value: 'BOOLEAN', label: 'BOOLEAN' },
];

const DEFAULT_VALUES: FormValues = {
  sourceField: '',
  lookupCatalogId: 0,
  keyColumn: '',
  joinType: 'LEFT',
  cacheTtlSec: 300,
  missPolicy: 'PASSTHROUGH',
  fields: [],
};

/**
 * 코드 룩업 추가/편집 Drawer — manager 모듈 표준 패턴(MenuCreateDrawer 등) 기반.
 * <p>
 * 부모 컴포넌트는 ref 로 open/close 호출. 저장은 onOk 콜백 위임 — 부모가 lookups 배열 갱신.
 */
const LookupEditDrawer = forwardRef<LookupEditDrawerRef, LookupEditDrawerProps>(({ baseFields, existingLookups, onOk }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | undefined>(undefined);
  const [form] = Form.useForm<FormValues>();

  const watchJoinType = Form.useWatch('joinType', form);
  const watchSourceField = Form.useWatch('sourceField', form);
  const watchLookupCatalogId = Form.useWatch('lookupCatalogId', form);
  const watchFields = Form.useWatch('fields', form);

  const sourceCandidates = useMemo(
    () =>
      baseFields
        .filter((f) => !f.isVirtual)
        .filter((f) => f.isVisible)
        .filter((f) => f.dataType === 'STRING' || f.dataType === 'NUMBER'),
    [baseFields],
  );

  const usedSourceFields = useMemo(() => new Set(existingLookups.filter((_, i) => i !== editingIndex).map((l) => l.sourceField)), [existingLookups, editingIndex]);

  const sourceOptions = useMemo(
    () =>
      sourceCandidates
        .filter((f) => f.fieldName === watchSourceField || !usedSourceFields.has(f.fieldName))
        .map((f) => ({ value: f.fieldName, label: `${f.fieldName} · ${f.displayName}` })),
    [sourceCandidates, usedSourceFields, watchSourceField],
  );

  useImperativeHandle(ref, () => ({
    open: (params) => {
      const initial = params?.initial;
      setEditingIndex(params?.editingIndex);
      form.resetFields();
      if (initial) {
        form.setFieldsValue({
          sourceField: initial.sourceField,
          lookupCatalogId: initial.lookupCatalogId,
          catalogDisplayName: initial.catalogDisplayName,
          catalogTableName: initial.catalogTableName,
          keyColumn: initial.keyColumn,
          joinType: initial.joinType,
          cacheTtlSec: initial.cacheTtlSec ?? 300,
          missPolicy: initial.missPolicy ?? 'PASSTHROUGH',
          fields: initial.fields,
          lookupId: initial.lookupId,
          datasetId: initial.datasetId,
        });
      } else {
        // 신규: 첫 사용 가능한 소스 필드 자동 선택
        const firstAvailable = sourceCandidates.find((f) => !usedSourceFields.has(f.fieldName));
        form.setFieldsValue({ ...DEFAULT_VALUES, sourceField: firstAvailable?.fieldName ?? '' });
      }
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  }));

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSelectCatalog = (catalog: LookupCatalogItem) => {
    form.setFieldsValue({
      lookupCatalogId: catalog.lookupCatalogId,
      catalogDisplayName: catalog.displayName,
      catalogTableName: catalog.tableName,
      keyColumn: catalog.recommendedKey,
      fields: catalog.recommendedValues.map((col, j) => ({
        masterColumn: col,
        outputFieldName: col,
        dataType: 'STRING' as FieldDataType,
        orderNo: j,
      })),
    });
  };

  const updateField = (fieldIdx: number, patch: Partial<DatasetLookupField>) => {
    const current = (form.getFieldValue('fields') as DatasetLookupField[]) ?? [];
    form.setFieldsValue({ fields: current.map((f, j) => (j === fieldIdx ? { ...f, ...patch } : f)) });
  };

  const removeField = (fieldIdx: number) => {
    const current = (form.getFieldValue('fields') as DatasetLookupField[]) ?? [];
    form.setFieldsValue({
      fields: current.filter((_, j) => j !== fieldIdx).map((f, j) => ({ ...f, orderNo: j })),
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!values.fields || values.fields.length === 0) {
        form.setFields([{ name: 'lookupCatalogId', errors: ['값 컬럼이 1개 이상 필요합니다. 마스터 테이블을 선택하세요.'] }]);
        return;
      }
      const payload: DatasetLookup = {
        datasetId: values.datasetId ?? 0,
        lookupId: values.lookupId,
        lookupCatalogId: values.lookupCatalogId,
        catalogDisplayName: values.catalogDisplayName,
        catalogTableName: values.catalogTableName,
        sourceField: values.sourceField,
        keyColumn: values.keyColumn,
        joinType: values.joinType,
        cacheTtlSec: values.cacheTtlSec,
        missPolicy: values.missPolicy,
        fields: values.fields,
      };
      onOk(payload, editingIndex);
      setIsOpen(false);
    } catch {
      // form validation errors — 그대로 노출
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button onClick={handleClose}>취소</Button>
      <Button type="primary" onClick={handleSubmit}>
        저장
      </Button>
    </div>
  );

  const valueColumns: ColumnsType<DatasetLookupField & { __idx: number }> = [
    {
      title: '마스터 컬럼',
      dataIndex: 'masterColumn',
      width: 160,
      render: (v: string) => <span className="font-mono font-semibold">{v}</span>,
    },
    {
      title: '출력 필드명 (가상)',
      dataIndex: 'outputFieldName',
      render: (_: string, record) => (
        <Input value={record.outputFieldName} onChange={(e) => updateField(record.__idx, { outputFieldName: e.target.value })} className="font-mono" />
      ),
    },
    {
      title: '표시명',
      dataIndex: 'displayName',
      render: (_: string, record) => (
        <Input value={record.displayName ?? ''} onChange={(e) => updateField(record.__idx, { displayName: e.target.value })} placeholder="(생략 시 출력명 사용)" />
      ),
    },
    {
      title: '데이터 타입',
      dataIndex: 'dataType',
      width: 130,
      render: (_: string, record) => (
        <Select value={record.dataType} onChange={(v) => updateField(record.__idx, { dataType: v })} options={DATA_TYPE_OPTIONS} style={{ width: '100%' }} />
      ),
    },
    {
      title: '',
      key: 'action',
      width: 48,
      align: 'center',
      render: (_: unknown, record) => (
        <button type="button" onClick={() => removeField(record.__idx)} title="이 가상 필드 제거">
          <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
        </button>
      ),
    },
  ];

  const tableRows = (watchFields ?? []).map((f, idx) => ({ ...f, __idx: idx }));

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title={editingIndex !== undefined ? '코드 룩업 편집' : '코드 룩업 추가'}
      closable={{ placement: 'end' }}
      size="large"
      footer={footer}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={DEFAULT_VALUES}>
        <Form.Item name="lookupId" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="datasetId" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="catalogDisplayName" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="catalogTableName" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="fields" hidden>
          <Input />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="소스 필드" name="sourceField" rules={[{ required: true, message: '소스 필드를 선택해주세요' }]}>
              <Select placeholder="데이터셋의 코드 컬럼 선택" options={sourceOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="마스터 테이블"
              name="lookupCatalogId"
              rules={[
                {
                  validator: (_r, value) => (value && value > 0 ? Promise.resolve() : Promise.reject(new Error('마스터 테이블을 선택해주세요'))),
                },
              ]}
            >
              <LookupCatalogDropdown value={watchLookupCatalogId} onChange={handleSelectCatalog} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="키 컬럼 (마스터)" name="keyColumn" rules={[{ required: true, message: '키 컬럼을 입력해주세요' }]}>
              <Input placeholder="예: DEPT_CODE" className="font-mono" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="조인 타입" name="joinType" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'LEFT', label: 'LEFT (미스도 포함)' },
                  { value: 'INNER', label: 'INNER (미스 drop)' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="캐시 TTL (초)" name="cacheTtlSec" rules={[{ required: true }]}>
              <InputNumber min={1} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="미스 처리 (LEFT 조인 전용)" name="missPolicy">
          <Select options={LOOKUP_MISS_POLICY_OPTIONS} disabled={watchJoinType === 'INNER'} />
        </Form.Item>

        <Form.Item label={`값 컬럼 → 가상 필드 (${tableRows.length}개)`} extra="마스터 테이블을 선택하면 권장 값 컬럼이 자동으로 채워집니다.">
          <Table<DatasetLookupField & { __idx: number }>
            size="small"
            rowKey={(r) => `${r.__idx}`}
            columns={valueColumns}
            dataSource={tableRows}
            pagination={false}
            bordered
            locale={{ emptyText: '값 컬럼 없음' }}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

LookupEditDrawer.displayName = 'LookupEditDrawer';

export default LookupEditDrawer;
