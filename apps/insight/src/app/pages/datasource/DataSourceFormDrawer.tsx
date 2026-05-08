import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, Input, Row, Select, Table, Tag, Tooltip } from 'antd';
import { Download, Info, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { datasourceQueryKeys, useCreateDatasource, useLoadSchema, useUpdateDatasource } from '../../features/datasource/hooks/useDatasourceQueries';
import type { DataSourceFieldItem, DataSourceItem, DataSourceRequest, SchemaLoadResponse } from '../../features/datasource/types/datasource.types';

/**
 * DataSourceFormDrawer ref 타입
 * @property open - 드로어를 여는 함수. item이 없으면 등록 모드, 있으면 수정 모드
 * @property close - 드로어를 닫는 함수
 */
export interface DataSourceFormDrawerRef {
  open: (item?: DataSourceItem) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const PRODUCT_OPTIONS = ['FCA', 'IC', 'IR', 'IE', 'AI', 'COMMON'];

const FIELD_TYPE_OPTIONS = [
  { value: 'NUMBER', label: 'NUMBER' },
  { value: 'STRING', label: 'STRING' },
  { value: 'DATETIME', label: 'DATETIME' },
];

const FIELD_ROLE_OPTIONS = [
  { value: 'DIMENSION', label: 'DIMENSION' },
  { value: 'MEASURE', label: 'MEASURE' },
  { value: 'TIMESTAMP', label: 'TIMESTAMP' },
];

type FieldDraft = Omit<DataSourceFieldItem, 'id' | 'datasourceKey'>;

/**
 * 데이터소스 등록/수정 Drawer (v3.1)
 * - DB View 단일 소스 (sourceType 제거)
 * - dbViewPrefix 기반으로 스키마 로드
 */
const DataSourceFormDrawer = forwardRef<DataSourceFormDrawerRef, Props>(({ onSuccess }, ref) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<DataSourceItem | null>(null);
  const [fields, setFields] = useState<FieldDraft[]>([]);

  const isEditMode = !!editItem;

  useImperativeHandle(ref, () => ({
    open: (item?: DataSourceItem) => {
      if (item) {
        setEditItem(item);
        setFields(
          item.fields.map((f) => ({
            fieldName: f.fieldName,
            displayName: f.displayName,
            fieldType: f.fieldType,
            fieldRole: f.fieldRole,
            formatterType: f.formatterType,
            formatterOptions: f.formatterOptions,
            isVisible: f.isVisible,
            sortOrder: f.sortOrder,
            description: f.description,
          })),
        );
      } else {
        setEditItem(null);
        setFields([]);
      }
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  }));

  useEffect(() => {
    if (!isOpen) return;
    if (editItem) {
      form.setFieldsValue({
        datasourceKey: editItem.datasourceKey,
        datasourceName: editItem.datasourceName,
        productCode: editItem.productCode,
        dbViewPrefix: editItem.dbViewPrefix,
        description: editItem.description,
      });
    }
    return () => {
      form.resetFields();
    };
  }, [editItem, form, isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: datasourceQueryKeys.getList._def });
  };

  const createMutation = useCreateDatasource({
    mutationOptions: {
      onSuccess: () => {
        invalidateList();
        toast.success('데이터소스가 등록되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const updateMutation = useUpdateDatasource({
    mutationOptions: {
      onSuccess: () => {
        invalidateList();
        toast.success('데이터소스가 수정되었습니다.');
        handleClose();
        onSuccess();
      },
    },
  });

  const loadSchemaMutation = useLoadSchema({
    mutationOptions: {
      onSuccess: (data) => {
        const result = data as SchemaLoadResponse;
        const loaded: FieldDraft[] = result.fields.map((f, idx) => ({
          fieldName: f.fieldName,
          displayName: f.displayName,
          fieldType: f.fieldType,
          fieldRole: f.fieldRole,
          formatterType: f.formatterType,
          formatterOptions: f.formatterOptions,
          isVisible: f.isVisible,
          sortOrder: f.sortOrder ?? idx,
          description: f.description,
        }));
        setFields(loaded);
        toast.success(`${loaded.length}개 필드를 불러왔습니다.`);
      },
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleLoadSchema = () => {
    const datasourceKey = form.getFieldValue('datasourceKey') as string;
    if (!datasourceKey) {
      toast.warning('데이터소스 키를 먼저 입력하세요.');
      return;
    }
    loadSchemaMutation.mutate({ datasourceKey });
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof FieldDraft, value: unknown) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value } as FieldDraft;
    setFields(updated);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const request: DataSourceRequest = {
        datasourceName: values.datasourceName,
        productCode: values.productCode,
        dbViewPrefix: values.dbViewPrefix,
        description: values.description,
      };

      if (isEditMode && editItem) {
        updateMutation.mutate({
          params: { datasourceKey: editItem.datasourceKey },
          data: request,
        });
      } else {
        createMutation.mutate(request);
      }
    });
  };

  const fieldColumns = [
    {
      title: '필드명',
      dataIndex: 'fieldName',
      width: 140,
      render: (_: string, __: FieldDraft, index: number) => (
        <Input size="small" value={fields[index].fieldName} onChange={(e) => handleFieldChange(index, 'fieldName', e.target.value)} style={{ fontFamily: 'monospace' }} />
      ),
    },
    {
      title: '표시명',
      dataIndex: 'displayName',
      width: 140,
      render: (_: string, __: FieldDraft, index: number) => (
        <Input size="small" value={fields[index].displayName} onChange={(e) => handleFieldChange(index, 'displayName', e.target.value)} />
      ),
    },
    {
      title: '데이터타입',
      dataIndex: 'fieldType',
      width: 120,
      render: (_: string, __: FieldDraft, index: number) => (
        <Select size="small" value={fields[index].fieldType} onChange={(v) => handleFieldChange(index, 'fieldType', v)} options={FIELD_TYPE_OPTIONS} style={{ width: '100%' }} />
      ),
    },
    {
      title: '역할',
      dataIndex: 'fieldRole',
      width: 130,
      render: (_: string, __: FieldDraft, index: number) => (
        <Select size="small" value={fields[index].fieldRole} onChange={(v) => handleFieldChange(index, 'fieldRole', v)} options={FIELD_ROLE_OPTIONS} style={{ width: '100%' }} />
      ),
    },
    {
      title: '설명',
      dataIndex: 'description',
      render: (_: string, __: FieldDraft, index: number) => (
        <Input size="small" value={fields[index].description || ''} onChange={(e) => handleFieldChange(index, 'description', e.target.value)} />
      ),
    },
    {
      title: '',
      width: 40,
      render: (_: unknown, __: FieldDraft, index: number) => (
        <button type="button" onClick={() => handleRemoveField(index)}>
          <Trash2 size={14} className="text-red-500 hover:cursor-pointer" />
        </button>
      ),
    },
  ];

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose} disabled={isLoading}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleSubmit} loading={isLoading} disabled={isLoading}>
        {isEditMode ? '수정' : '저장'}
      </Button>
    </div>
  );

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title={isEditMode ? '데이터소스 수정' : '새 데이터소스 등록'}
      closable={{ placement: 'end' }}
      size={720}
      footer={footer}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="datasourceKey" label="데이터소스 키" rules={[{ required: true, message: '데이터소스 키를 입력하세요.' }]}>
              <Input placeholder="fca.bot-service-stat" style={{ fontFamily: 'monospace' }} disabled={isEditMode} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="datasourceName" label="데이터소스명" rules={[{ required: true, message: '데이터소스명을 입력하세요.' }]}>
              <Input placeholder="봇서비스 통계" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="productCode" label="제품군" rules={[{ required: true, message: '제품군을 선택하세요.' }]}>
              <Select placeholder="제품군 선택" options={PRODUCT_OPTIONS.map((p) => ({ value: p, label: p }))} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="dbViewPrefix" label="DB View Prefix" rules={[{ required: true, message: 'DB View Prefix를 입력하세요.' }]}>
              <Input placeholder="VW_STAT_IR_BOT_SERVICE" style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          </Col>
        </Row>

        <Button icon={<Download size={14} />} onClick={handleLoadSchema} loading={loadSchemaMutation.isPending} className="mb-4">
          스키마 불러오기
        </Button>

        <Row>
          <Col span={24}>
            <Form.Item name="description" label="설명">
              <Input.TextArea rows={2} placeholder="데이터소스 설명" />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      {/* Field Schema Viewer */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">필드 스키마</span>
            <Tag>{fields.length}개</Tag>
            <Tooltip title="DB View에서 자동으로 추출된 스키마입니다">
              <Info size={14} className="text-gray-400" />
            </Tooltip>
          </div>
        </div>

        <Table
          dataSource={fields}
          columns={fieldColumns}
          rowKey={(_, index) => String(index)}
          pagination={false}
          size="small"
          bordered
          locale={{ emptyText: '스키마 불러오기를 클릭하세요' }}
        />
      </div>
    </Drawer>
  );
});

DataSourceFormDrawer.displayName = 'DataSourceFormDrawer';

export default DataSourceFormDrawer;
