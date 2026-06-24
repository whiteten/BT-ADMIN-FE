import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Card, Form, Input, InputNumber, Select, Switch } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import {
  ERROR_POLICY_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  TRANSFORM_TYPE_OPTIONS,
} from '../../features/ingestion/constants/ingestionConstants';
import {
  ingestionQueryKeys,
  useCreateIngestMapping,
  useGetIngestMapping,
  useGetTargetFields,
  useUpdateIngestMapping,
} from '../../features/ingestion/hooks/useIngestionQueries';
import type { IngestMappingSaveDatas } from '../../features/ingestion/types';

interface ColumnFormRow {
  targetField?: string;
  sourceIndex?: number;
  sourceName?: string;
  transformType?: string;
  required?: boolean;
  defaultValue?: string;
}

interface MappingFormValues {
  mappingName?: string;
  sourceType?: string;
  delimiter?: string;
  errorPolicy?: string;
  hasHeader?: boolean;
  useYn?: boolean;
  fileDir?: string;
  description?: string;
  columns?: ColumnFormRow[];
}

const DEFAULT_VALUES: MappingFormValues = {
  sourceType: 'FILE',
  delimiter: ',',
  errorPolicy: 'STOP',
  hasHeader: true,
  useYn: true,
  columns: [],
};

export default function IngestionMappingEdit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mappingId: mappingIdParam } = useParams();
  const isEdit = !!mappingIdParam;
  const mappingId = Number(mappingIdParam);

  const [form] = Form.useForm<MappingFormValues>();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const { data: targetFields = [] } = useGetTargetFields();
  const { data: mapping } = useGetIngestMapping({
    params: { mappingId },
    queryOptions: { enabled: isEdit },
  });
  const { mutate: createMapping, isPending: isCreating } = useCreateIngestMapping();
  const { mutate: updateMapping, isPending: isUpdating } = useUpdateIngestMapping();

  useEffect(() => {
    const items: BreadcrumbProps['items'] = [
      { title: '적재', path: '/campaign/ingestion' },
      { title: '매핑 설정', path: '/campaign/ingestion/mapping/list' },
      { title: isEdit ? '매핑 수정' : '매핑 추가' },
    ];
    setBreadcrumb(items);
    return () => clearBreadcrumb();
  }, [isEdit, setBreadcrumb, clearBreadcrumb]);

  // 수정 모드: 조회 결과를 폼에 주입
  useEffect(() => {
    if (isEdit && mapping) {
      form.setFieldsValue({
        mappingName: mapping.mappingName,
        sourceType: mapping.sourceType ?? 'FILE',
        delimiter: mapping.delimiter ?? ',',
        errorPolicy: mapping.errorPolicy ?? 'STOP',
        hasHeader: mapping.hasHeaderYn === 'Y',
        useYn: mapping.useYn !== 'N',
        fileDir: mapping.fileDir,
        description: mapping.description,
        columns: (mapping.columns ?? []).map((c) => ({
          targetField: c.targetField,
          sourceIndex: c.sourceIndex,
          sourceName: c.sourceName,
          transformType: c.transformType ?? 'NONE',
          required: c.requiredYn === 'Y',
          defaultValue: c.defaultValue,
        })),
      });
    }
  }, [isEdit, mapping, form]);

  const targetFieldOptions = targetFields.map((f) => ({
    label: `${f.label} (${f.code})${f.fixed ? ' ★고정' : ''}`,
    value: f.code,
  }));

  const handleSubmit = (values: MappingFormValues) => {
    const datas: IngestMappingSaveDatas = {
      mappingName: values.mappingName ?? '',
      sourceType: values.sourceType,
      delimiter: values.delimiter,
      errorPolicy: values.errorPolicy,
      hasHeaderYn: values.hasHeader ? 'Y' : 'N',
      useYn: values.useYn ? 'Y' : 'N',
      fileDir: values.fileDir,
      description: values.description,
      columns: (values.columns ?? []).map((c, i) => ({
        targetField: c.targetField ?? '',
        sourceIndex: c.sourceIndex ?? 0,
        sourceName: c.sourceName,
        transformType: c.transformType ?? 'NONE',
        requiredYn: c.required ? 'Y' : 'N',
        defaultValue: c.defaultValue,
        sortOrder: i + 1,
      })),
    };

    if (!datas.columns.length) {
      toast.warning('컬럼 매핑을 1개 이상 추가하세요.');
      return;
    }

    const onSuccess = () => {
      toast.success(isEdit ? '매핑이 수정되었습니다.' : '매핑이 등록되었습니다.');
      queryClient.invalidateQueries({ queryKey: ingestionQueryKeys.mappingList.queryKey });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ingestionQueryKeys.mapping(mappingId).queryKey });
      }
      navigate('/campaign/ingestion/mapping/list');
    };
    const onError = () => toast.error('저장에 실패했습니다.');

    if (isEdit) {
      updateMapping({ mappingId, datas }, { onSuccess, onError });
    } else {
      createMapping(datas, { onSuccess, onError });
    }
  };

  const handleSubmitFailed = () => toast.error('입력값을 확인하세요.');

  return (
    <div className="flex flex-col gap-4 w-full h-full overflow-y-auto">
      <Form<MappingFormValues>
        form={form}
        layout="vertical"
        initialValues={DEFAULT_VALUES}
        onFinish={handleSubmit}
        onFinishFailed={handleSubmitFailed}
        className="flex flex-col gap-4"
      >
        <Card title="기본 정보" className="bt-shadow">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item label="매핑명" name="mappingName" rules={[{ required: true, message: '매핑명을 입력하세요.' }]}>
              <Input placeholder="예: 고객사A 캠페인 대상자" />
            </Form.Item>
            <Form.Item label="수신방식" name="sourceType">
              <Select options={[...SOURCE_TYPE_OPTIONS]} />
            </Form.Item>
            <Form.Item label="구분자" name="delimiter" tooltip="탭은 \t 로 입력">
              <Input placeholder="," className="max-w-[120px]" />
            </Form.Item>
            <Form.Item label="오류정책" name="errorPolicy">
              <Select options={[...ERROR_POLICY_OPTIONS]} />
            </Form.Item>
            <Form.Item label="첫 줄 헤더" name="hasHeader" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="사용여부" name="useYn" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="파일 폴더(스케줄러용)" name="fileDir">
              <Input placeholder="/data/inbound/custA" />
            </Form.Item>
            <Form.Item label="설명" name="description">
              <Input placeholder="설명(선택)" />
            </Form.Item>
          </div>
        </Card>

        <Card
          title="컬럼 매핑 (원본 위치 → 우리 표준 필드)"
          className="bt-shadow"
          extra={<span className="text-xs text-[#868e96]">★고정 5개 + 확장 15개(EXT_01~15) 중 선택</span>}
        >
          {/* 헤더 라벨 */}
          <div className="flex items-center gap-2 px-1 pb-2 text-xs font-medium text-[#868e96]">
            <span className="w-[220px]">우리 표준 필드</span>
            <span className="w-[90px]">원본 위치</span>
            <span className="w-[150px]">원본 항목명</span>
            <span className="w-[160px]">변환</span>
            <span className="w-[70px]">필수</span>
            <span className="w-[150px]">기본값</span>
            <span className="w-[40px]" />
          </div>

          <Form.List name="columns">
            {(fields, { add, remove }) => (
              <div className="flex flex-col gap-2">
                {fields.map((field) => (
                  <div key={field.key} className="flex items-start gap-2">
                    <Form.Item
                      name={[field.name, 'targetField']}
                      rules={[{ required: true, message: '필드 선택' }]}
                      className="!mb-0 w-[220px]"
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="우리 필드"
                        options={targetFieldOptions}
                        popupMatchSelectWidth={false}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'sourceIndex']}
                      rules={[{ required: true, message: '위치' }]}
                      className="!mb-0 w-[90px]"
                    >
                      <InputNumber min={0} className="w-full" placeholder="0" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'sourceName']} className="!mb-0 w-[150px]">
                      <Input placeholder="예: 연락처" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'transformType']} className="!mb-0 w-[160px]">
                      <Select options={[...TRANSFORM_TYPE_OPTIONS]} placeholder="변환" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'required']} valuePropName="checked" className="!mb-0 w-[70px]">
                      <Switch size="small" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'defaultValue']} className="!mb-0 w-[150px]">
                      <Input placeholder="기본값(선택)" />
                    </Form.Item>
                    <Button
                      danger
                      type="text"
                      icon={<Trash2 className="size-4" />}
                      className="w-[40px]"
                      onClick={() => remove(field.name)}
                    />
                  </div>
                ))}
                <Button type="dashed" icon={<Plus className="size-4" />} onClick={() => add({ transformType: 'NONE', required: false })}>
                  컬럼 매핑 추가
                </Button>
              </div>
            )}
          </Form.List>
        </Card>

        <div className="flex items-center justify-end gap-2 pb-4">
          <Button onClick={() => navigate('/campaign/ingestion/mapping/list')}>취소</Button>
          <Button type="primary" htmlType="submit" loading={isCreating || isUpdating}>
            저장
          </Button>
        </div>
      </Form>
    </div>
  );
}
