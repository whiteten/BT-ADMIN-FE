import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Form, Input, InputNumber, Radio, Select, Steps } from 'antd';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { toast } from '@/shared-util';
import StepCalcAndSearch, { type CalcField, type SearchBind } from './steps/StepCalcAndSearch';
import StepDataSource from './steps/StepDataSource';
import StepFieldMapping, { type FieldMapping } from './steps/StepFieldMapping';
import StepPreview from './steps/StepPreview';
import StepVisualization from './steps/StepVisualization';
import { useCreateWidget, useGetWidgetDetail, useUpdateWidget } from '../../../features/stat/hooks/useStatQueries';
import type { WidgetRequest } from '../../../features/stat/types/widget';
import PageHeader from '@/components/custom/PageHeader';

interface JoinCondition {
  leftDatasourceKey: string;
  leftFieldName: string;
  rightDatasourceKey: string;
  rightFieldName: string;
  joinType: string;
  sortOrder: number;
}

const STEPS = [{ title: '기본 정보' }, { title: '데이터소스' }, { title: '필드 매핑' }, { title: '계산필드 / 검색조건' }, { title: '시각화 설정' }, { title: '미리보기' }];

const CATEGORY_OPTIONS = [
  { value: 'FCA', label: 'FCA (ForCus-AI)' },
  { value: 'IC', label: 'IC (CTI)' },
  { value: 'IR', label: 'IR (IVR)' },
  { value: 'IE', label: 'IE (교환기)' },
  { value: 'AI', label: 'AI (AIRS)' },
  { value: 'COMMON', label: '공통' },
];

export default function WidgetBuilderPage() {
  const navigate = useNavigate();
  const { widgetId } = useParams<{ widgetId: string }>();
  const isEdit = !!widgetId;
  const breadcrumb = [{ label: '통계' }, { label: '위젯 관리', path: '/insight/stat/widget' }, { label: isEdit ? '위젯 수정' : '새 위젯' }];

  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [selectedDatasourceKeys, setSelectedDatasourceKeys] = useState<string[]>([]);
  const [joinConditions, setJoinConditions] = useState<JoinCondition[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [calcFields, setCalcFields] = useState<CalcField[]>([]);
  const [searchBindings, setSearchBindings] = useState<SearchBind[]>([]);

  const createMutation = useCreateWidget({});
  const updateMutation = useUpdateWidget({});

  const { data: widgetData } = useGetWidgetDetail({
    params: isEdit ? { widgetId: Number(widgetId) } : undefined,
    queryOptions: { enabled: isEdit },
  });

  useEffect(() => {
    if (widgetData) {
      form.setFieldsValue({
        widgetType: widgetData.widgetType,
        widgetName: widgetData.widgetName,
        description: widgetData.description,
        category: widgetData.category,
        icon: widgetData.icon,
        visualization: widgetData.visualization,
        refreshMode: widgetData.refreshMode,
        refreshInterval: widgetData.refreshInterval,
        defaultW: widgetData.defaultW,
        defaultH: widgetData.defaultH,
      });
    }
  }, [widgetData, form]);

  const handleNext = () => {
    if (currentStep === 0) {
      form.validateFields(['widgetName', 'category', 'refreshMode']).then(() => setCurrentStep(currentStep + 1));
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSave = () => {
    const values = form.getFieldsValue(true);
    const request: WidgetRequest = {
      widgetType: values.widgetType || 'DATA',
      widgetName: values.widgetName,
      description: values.description,
      category: values.category,
      icon: values.icon,
      visualization: values.visualization,
      refreshMode: values.refreshMode,
      refreshInterval: values.refreshInterval,
      defaultW: values.defaultW || 4,
      defaultH: values.defaultH || 3,
      dataSources: selectedDatasourceKeys.map((key, idx) => ({ datasourceKey: key, sortOrder: idx })),
      fieldMappings: fieldMappings
        .filter((f) => f.enabled)
        .map((f, idx) => ({
          datasourceKey: f.datasourceKey,
          fieldName: f.fieldName,
          alias: f.alias || undefined,
          showInGrid: f.showInGrid,
          chartRole: f.chartRole || undefined,
          sortOrder: idx,
          aggregation: f.aggregation || undefined,
          showRatio: f.showRatio || undefined,
        })),
      joinConditions: joinConditions.map((j) => ({ ...j })),
      calculatedFields: calcFields
        .filter((c) => c.fieldName && c.formula)
        .map((c, idx) => ({
          fieldName: c.fieldName,
          displayName: c.displayName,
          formula: c.formula,
          fieldType: c.fieldType,
          showInGrid: c.showInGrid,
          chartRole: c.chartRole || undefined,
          showRatio: c.showRatio || undefined,
          sortOrder: idx,
        })),
      searchBindings: searchBindings
        .filter((s) => s.conditionId != null)
        .map((s, idx) => ({
          conditionId: s.conditionId!,
          bindDatasourceKey: s.bindDatasourceKey,
          bindFieldName: s.bindFieldName,
          sortOrder: idx,
        })),
    };

    const onSuccess = () => {
      toast.success(isEdit ? '위젯이 수정되었습니다.' : '위젯이 생성되었습니다.');
      navigate('/insight/stat/widget');
    };
    const onError = () => toast.error(isEdit ? '위젯 수정에 실패했습니다.' : '위젯 생성에 실패했습니다.');

    if (isEdit) {
      updateMutation.mutate({ params: { widgetId: Number(widgetId) }, data: request }, { onSuccess, onError });
    } else {
      createMutation.mutate(request, { onSuccess, onError });
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="flex flex-col gap-4 w-full h-full bg-white bt-shadow p-5">
        <Steps current={currentStep} items={STEPS} size="small" />

        <div className="flex-1 overflow-auto">
          <Form form={form} layout="vertical" initialValues={{ widgetType: 'DATA', refreshMode: 'MANUAL', defaultW: 4, defaultH: 3 }}>
            {currentStep === 0 && (
              <div className="max-w-2xl">
                <Form.Item name="widgetName" label="위젯명" rules={[{ required: true, message: '위젯명을 입력하세요' }]}>
                  <Input placeholder="봇서비스 일별 추이" />
                </Form.Item>
                <Form.Item name="description" label="설명">
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item name="category" label="카테고리" rules={[{ required: true, message: '카테고리를 선택하세요' }]}>
                  <Select placeholder="카테고리 선택" options={CATEGORY_OPTIONS} />
                </Form.Item>
                <Form.Item name="icon" label="아이콘">
                  <Input placeholder="chart-bar" />
                </Form.Item>
                <Form.Item name="refreshMode" label="갱신 방식" rules={[{ required: true }]}>
                  <Radio.Group buttonStyle="solid">
                    <Radio.Button value="AUTO">자동</Radio.Button>
                    <Radio.Button value="MANUAL">수동</Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <Form.Item noStyle dependencies={['refreshMode']}>
                  {({ getFieldValue }) =>
                    getFieldValue('refreshMode') === 'AUTO' && (
                      <Form.Item name="refreshInterval" label="갱신 주기 (초)">
                        <InputNumber min={1} max={3600} placeholder="30" style={{ width: 150 }} />
                      </Form.Item>
                    )
                  }
                </Form.Item>
                <div className="grid grid-cols-2 gap-4">
                  <Form.Item name="defaultW" label="기본 너비 (칸)">
                    <InputNumber min={1} max={12} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="defaultH" label="기본 높이 (칸)">
                    <InputNumber min={1} max={12} style={{ width: '100%' }} />
                  </Form.Item>
                </div>
              </div>
            )}
            {currentStep === 1 && (
              <StepDataSource
                selectedKeys={selectedDatasourceKeys}
                onSelectedKeysChange={setSelectedDatasourceKeys}
                joinConditions={joinConditions}
                onJoinConditionsChange={setJoinConditions}
              />
            )}
            {currentStep === 2 && <StepFieldMapping selectedDatasourceKeys={selectedDatasourceKeys} fieldMappings={fieldMappings} onFieldMappingsChange={setFieldMappings} />}
            {currentStep === 3 && (
              <StepCalcAndSearch
                calcFields={calcFields}
                onCalcFieldsChange={setCalcFields}
                searchBindings={searchBindings}
                onSearchBindingsChange={setSearchBindings}
                selectedDatasourceKeys={selectedDatasourceKeys}
                availableFields={fieldMappings.filter((f) => f.enabled).map((f) => f.fieldName)}
              />
            )}
            {currentStep === 4 && <StepVisualization form={form} />}
            {currentStep === 5 && <StepPreview />}
          </Form>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button icon={<ArrowLeft size={14} />} onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep === 0}>
            이전
          </Button>
          <span className="text-sm text-gray-500">
            Step {currentStep + 1} / {STEPS.length}
          </span>
          {currentStep < STEPS.length - 1 ? (
            <Button type="primary" onClick={handleNext}>
              다음 <ArrowRight size={14} className="ml-1" />
            </Button>
          ) : (
            <Button type="primary" icon={<Save size={14} />} onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>
              저장
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
