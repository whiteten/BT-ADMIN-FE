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
import { useCreateWidget, useGetWidgetDetail, useUpdateWidget } from '../../features/widget/hooks/useWidgetQueries';
import type { WidgetRequest } from '../../features/widget/types/widget.types';

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

const VISUALIZATION_OPTIONS = [
  { value: 'LINE', label: '라인 차트' },
  { value: 'BAR', label: '바 차트' },
  { value: 'PIE', label: '파이 차트' },
  { value: 'DONUT', label: '도넛 차트' },
  { value: 'GRID', label: '그리드 (테이블)' },
];

export default function WidgetBuilderPage() {
  const navigate = useNavigate();
  const { widgetId } = useParams<{ widgetId: string }>();
  const isEdit = !!widgetId;
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [selectedDatasourceKeys, setSelectedDatasourceKeys] = useState<string[]>([]);
  const [joinConditions, setJoinConditions] = useState<JoinCondition[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [calcFields, setCalcFields] = useState<CalcField[]>([]);
  const [searchBindings, setSearchBindings] = useState<SearchBind[]>([]);

  const createMutation = useCreateWidget();
  const updateMutation = useUpdateWidget();

  const { data: widgetData } = useGetWidgetDetail({
    params: isEdit ? { widgetId: Number(widgetId) } : undefined,
    queryOptions: { enabled: isEdit },
  });

  // 위젯 데이터 로드 후 폼에 세팅
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
      form.validateFields(['widgetName', 'category', 'refreshMode']).then(() => {
        setCurrentStep(currentStep + 1);
      });
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
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
          format: f.format || undefined,
          cardSlot: f.cardSlot || undefined,
          displayType: f.displayType || undefined,
          displayFormat: f.displayFormat || undefined,
          thresholdMinor: f.thresholdMinor ?? undefined,
          thresholdMajor: f.thresholdMajor ?? undefined,
          thresholdCritical: f.thresholdCritical ?? undefined,
        })),
      joinConditions: joinConditions.map((j) => ({
        leftDatasourceKey: j.leftDatasourceKey,
        leftFieldName: j.leftFieldName,
        rightDatasourceKey: j.rightDatasourceKey,
        rightFieldName: j.rightFieldName,
        joinType: j.joinType,
        sortOrder: j.sortOrder,
      })),
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
          format: c.format || undefined,
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

    if (isEdit) {
      updateMutation.mutate(
        { params: { widgetId: Number(widgetId) }, data: request },
        {
          onSuccess: () => {
            toast.success('위젯이 수정되었습니다.');
            navigate('/insight/widgets');
          },
          onError: () => toast.error('위젯 수정에 실패했습니다.'),
        },
      );
    } else {
      createMutation.mutate(request, {
        onSuccess: () => {
          toast.success('위젯이 생성되었습니다.');
          navigate('/insight/widgets');
        },
        onError: () => toast.error('위젯 생성에 실패했습니다.'),
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{isEdit ? '위젯 수정' : '새 위젯 생성'}</h2>
          <p className="text-sm text-gray-500 mt-1">데이터소스를 선택하고 필드를 매핑하여 위젯을 구성합니다</p>
        </div>
        <Button onClick={() => navigate('/insight/widgets')}>목록으로</Button>
      </div>

      {/* Step Indicator */}
      <div className="bg-white rounded-lg border p-4">
        <Steps current={currentStep} items={STEPS} size="small" />
      </div>

      {/* Step Content */}
      <div className="flex-1 bg-white rounded-lg border p-6 overflow-auto">
        <Form form={form} layout="vertical" initialValues={{ widgetType: 'DATA', refreshMode: 'MANUAL', defaultW: 4, defaultH: 3 }}>
          {/* Step 1: 기본 정보 */}
          {currentStep === 0 && (
            <div className="max-w-2xl">
              <Form.Item name="widgetType" label="위젯 유형">
                <Radio.Group buttonStyle="solid">
                  <Radio.Button value="DATA">DATA (데이터 기반)</Radio.Button>
                  <Radio.Button value="CUSTOM">CUSTOM (코드 기반)</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="widgetName" label="위젯명" rules={[{ required: true, message: '위젯명을 입력하세요' }]}>
                <Input placeholder="봇서비스 일별 추이" />
              </Form.Item>

              <Form.Item name="description" label="설명">
                <Input.TextArea rows={2} placeholder="위젯 설명" />
              </Form.Item>

              <Form.Item name="category" label="카테고리" rules={[{ required: true, message: '카테고리를 선택하세요' }]}>
                <Select placeholder="카테고리 선택" options={CATEGORY_OPTIONS} />
              </Form.Item>

              <Form.Item name="icon" label="아이콘">
                <Input placeholder="chart-bar" />
              </Form.Item>

              <Form.Item name="visualization" label="시각화 유형">
                <Select placeholder="시각화 유형 선택" options={VISUALIZATION_OPTIONS} allowClear />
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

          {/* Step 2: 데이터소스 선택 */}
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

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between bg-white rounded-lg border p-4">
        <Button icon={<ArrowLeft size={14} />} onClick={handlePrev} disabled={currentStep === 0}>
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
  );
}
