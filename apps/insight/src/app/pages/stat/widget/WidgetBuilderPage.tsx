import { Fragment, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Form, InputNumber, Radio, Select } from 'antd';
import { Check, ChevronRight } from 'lucide-react';
import { toast } from '@/shared-util';
import StepDataSource from './steps/StepDataSource';
import StepFieldMapping, { type CalcField, type FieldMapping, type SearchBind } from './steps/StepFieldMapping';
import StepVisualizeAndPreview from './steps/StepVisualizeAndPreview';
import type { WidgetTemplate } from '../../../features/stat/constants/widgetTemplates';
import { useCreateWidget, useGetWidgetDetail, useUpdateWidget } from '../../../features/stat/hooks/useStatQueries';
import type { WidgetRequest } from '../../../features/stat/types/widget';

interface StepDef {
  key: string;
  title: string;
  icon: string;
}

const STEPS: StepDef[] = [
  { key: 'datasource', title: '데이터소스', icon: '⬡' },
  { key: 'fieldmapping', title: '필드 설정', icon: '⊞' },
  { key: 'visualize', title: '시각화', icon: '◈' },
];

const CATEGORY_OPTIONS = [
  { value: 'FCA', label: 'FCA (ForCus-AI)' },
  { value: 'IC', label: 'IC (CTI)' },
  { value: 'IR', label: 'IR (IVR)' },
  { value: 'IE', label: 'IE (교환기)' },
  { value: 'AI', label: 'AI (AIRS)' },
  { value: 'COMMON', label: '공통' },
];

interface StepNavProps {
  activeStep: number;
  completedSteps: Set<number>;
  summaries: (string | null)[];
  onStepClick: (i: number) => void;
}

function StepNav({ activeStep, completedSteps, summaries, onStepClick }: StepNavProps) {
  return (
    <div className="flex items-start border-b bg-white px-10 pt-5 pb-0 select-none">
      {STEPS.map((step, i) => {
        const isActive = i === activeStep;
        const isDone = completedSteps.has(i);
        return (
          <Fragment key={step.key}>
            <button className="group flex flex-col items-center gap-1.5 flex-shrink-0 pb-4 relative" style={{ minWidth: 88 }} onClick={() => onStepClick(i)}>
              <div
                className={[
                  'h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-200',
                  isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200',
                  isActive ? 'shadow-[0_0_0_4px_rgba(37,99,235,0.12)]' : '',
                ].join(' ')}
              >
                {isDone ? <Check size={12} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className={['text-[11px] font-semibold whitespace-nowrap transition-colors', isDone ? 'text-emerald-600' : isActive ? 'text-blue-600' : 'text-gray-400'].join(' ')}
              >
                {step.title}
              </span>
              {summaries[i] && !isActive && (
                <span className="absolute top-[46px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 font-normal">
                  {summaries[i]}
                </span>
              )}
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
            {i < STEPS.length - 1 && (
              <div className={['flex-1 h-[2px] mt-3.5 mx-1.5 rounded-full transition-colors duration-300 min-w-[16px]', isDone ? 'bg-emerald-300' : 'bg-gray-200'].join(' ')} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export default function WidgetBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { widgetId } = useParams<{ widgetId: string }>();
  const isEdit = !!widgetId;

  // 템플릿 진입 시 동기 초기화 (useEffect + setFieldsValue 는 Select 업데이트 불안정)
  const initialTemplate = (location.state as { template?: WidgetTemplate } | null)?.template ?? null;

  const [form] = Form.useForm();
  const [reportTitle, setReportTitle] = useState(initialTemplate?.name ?? '');
  const [isDirty, setIsDirty] = useState(false);
  const isSubmittingRef = useRef(false);

  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const [selectedDatasourceKeys, setSelectedDatasourceKeys] = useState<string[]>(initialTemplate ? [initialTemplate.datasourceKey] : []);
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
    if (!widgetData) return;
    setReportTitle(widgetData.widgetName);
    form.setFieldsValue({
      category: widgetData.category,
      icon: widgetData.icon,
      visualization: widgetData.visualization,
      refreshMode: widgetData.refreshMode,
      refreshInterval: widgetData.refreshInterval,
      defaultW: widgetData.defaultW,
      defaultH: widgetData.defaultH,
    });
    if (widgetData.dataSources?.length) {
      setSelectedDatasourceKeys(widgetData.dataSources.map((d) => d.datasourceKey));
      setFieldMappings(widgetData.fieldMappings as unknown as FieldMapping[]);
      setCalcFields(widgetData.calculatedFields as unknown as CalcField[]);
      setSearchBindings(widgetData.searchBindings as unknown as SearchBind[]);
      setCompletedSteps(new Set([0, 1]));
    }
  }, [widgetData, form]);

  const goToStep = (i: number) => {
    if (activeStep !== i) {
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(activeStep);
        return next;
      });
    }
    setActiveStep(i);
  };

  // Phase 1: validation gate
  const handleNext = () => {
    if (activeStep === 0 && selectedDatasourceKeys.length === 0) {
      toast.error('데이터소스를 선택해야 다음 단계로 이동할 수 있습니다.');
      return;
    }
    if (activeStep === 1) {
      const enabled = fieldMappings.filter((f) => f.enabled);
      if (enabled.length === 0 && calcFields.length === 0) {
        toast.error('활성화된 필드가 1개 이상 필요합니다.');
        return;
      }
      const allActive = [...enabled, ...calcFields.map((c) => ({ selectYn: c.selectYn, valueYn: c.valueYn }))];
      if (!allActive.some((f) => f.selectYn) || !allActive.some((f) => f.valueYn)) {
        toast.error('차원(선택) 컬럼과 값 컬럼을 각각 1개 이상 설정해야 합니다.');
        return;
      }
    }
    goToStep(Math.min(STEPS.length - 1, activeStep + 1));
  };

  const handlePrev = () => setActiveStep((p) => Math.max(0, p - 1));

  // Phase 1: browser close/refresh warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSave = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    if (!reportTitle.trim()) {
      toast.error('보고서명을 입력하세요.');
      isSubmittingRef.current = false;
      return;
    }
    form
      .validateFields(['category'])
      .then(() => {
        const values = form.getFieldsValue(true);
        const request: WidgetRequest = {
          widgetType: 'DATA',
          widgetName: reportTitle,
          description: values.description,
          category: values.category,
          icon: values.icon,
          visualization: values.visualization,
          refreshMode: values.refreshMode ?? 'MANUAL',
          refreshInterval: values.refreshInterval,
          defaultW: values.defaultW ?? 4,
          defaultH: values.defaultH ?? 3,
          dataSources: selectedDatasourceKeys.map((key, idx) => ({ datasourceKey: key, sortOrder: idx })),
          fieldMappings: fieldMappings
            .filter((f) => f.enabled)
            .map((f, idx) => ({
              datasourceKey: f.datasourceKey,
              fieldName: f.fieldName,
              alias: f.alias ?? undefined,
              groupHeaderName: f.groupHeaderName ?? undefined,
              showInGrid: f.selectYn || f.groupYn || f.valueYn,
              sortOrder: idx,
              groupYn: f.groupYn,
              selectYn: f.selectYn,
              valueYn: f.valueYn,
              whereYn: f.whereYn,
              pivotYn: f.pivotYn,
              compareYn: f.compareYn,
              footerHideYn: f.footerHideYn,
              refColYn: f.refColYn,
              agg: f.agg !== 'Unselected' ? f.agg : undefined,
              format: f.format !== 'Unselected' ? f.format : undefined,
              filter: f.filter !== 'Unselected' ? f.filter : undefined,
            })),
          calculatedFields: calcFields
            .filter((c) => c.fieldName && c.formula)
            .map((c, idx) => ({
              fieldName: c.fieldName,
              displayName: c.displayName,
              alias: c.alias ?? undefined,
              groupHeaderName: c.groupHeaderName ?? undefined,
              formula: c.formula,
              fieldType: c.fieldType,
              showInGrid: c.selectYn || c.groupYn || c.valueYn,
              sortOrder: idx,
              groupYn: c.groupYn,
              selectYn: c.selectYn,
              valueYn: c.valueYn,
              whereYn: c.whereYn,
              footerHideYn: c.footerHideYn,
              refColYn: c.refColYn,
              agg: c.agg !== 'Unselected' ? c.agg : undefined,
              format: c.format !== 'Unselected' ? c.format : undefined,
              filter: c.filter !== 'Unselected' ? c.filter : undefined,
            })),
          searchBindings: searchBindings
            .filter((s) => s.conditionId != null)
            .map((s, idx) => ({
              conditionId: s.conditionId as number,
              bindDatasourceKey: s.bindDatasourceKey,
              bindFieldName: s.bindFieldName,
              sortOrder: idx,
            })),
        };

        const onSuccess = () => {
          isSubmittingRef.current = false;
          toast.success(isEdit ? '보고서가 수정되었습니다.' : '보고서가 생성되었습니다.');
          setIsDirty(false);
          navigate('/insight/stat/widget');
        };
        const onError = () => {
          isSubmittingRef.current = false;
          toast.error(isEdit ? '보고서 수정에 실패했습니다.' : '보고서 생성에 실패했습니다.');
        };

        if (isEdit) {
          updateMutation.mutate({ params: { widgetId: Number(widgetId) }, data: request }, { onSuccess, onError });
        } else {
          createMutation.mutate(request, { onSuccess, onError });
        }
      })
      .catch(() => {
        isSubmittingRef.current = false;
      });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const activeFieldCount = fieldMappings.filter((f) => f.enabled).length;
  const vizValue = form.getFieldValue('visualization') as string | undefined;

  const stepSummaries: (string | null)[] = [
    selectedDatasourceKeys.length > 0 ? selectedDatasourceKeys[0] : null,
    activeFieldCount > 0 ? `${activeFieldCount}개 활성` + (calcFields.length > 0 ? ` +${calcFields.length}계산` : '') : null,
    vizValue ?? null,
  ];

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        refreshMode: 'MANUAL',
        defaultW: initialTemplate?.defaultW ?? 4,
        defaultH: initialTemplate?.defaultH ?? 3,
        category: initialTemplate?.category,
        visualization: initialTemplate?.defaultVisualization,
      }}
      className="flex flex-col w-full h-full overflow-hidden"
    >
      {/* Header */}
      <header className="flex flex-shrink-0 items-center gap-4 border-b bg-white px-5 py-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button type="button" onClick={() => navigate('/insight/stat/widget')} className="flex-shrink-0 text-[12px] text-gray-400 hover:text-gray-700 transition-colors">
            보고서 목록
          </button>
          <ChevronRight size={12} className="flex-shrink-0 text-gray-300" />
          <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 transition-colors focus-within:border-blue-400 focus-within:bg-white">
            <span className="flex-shrink-0 text-[11px] font-medium text-gray-400">보고서명</span>
            <input
              value={reportTitle}
              onChange={(e) => {
                setReportTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder="제목을 입력하세요"
              className="w-48 bg-transparent text-[14px] font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          {isDirty && (
            <span className="flex-shrink-0 inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              미저장
            </span>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          <Form.Item name="category" noStyle rules={[{ required: true, message: '카테고리를 선택하세요' }]}>
            <Select placeholder="카테고리 선택" options={CATEGORY_OPTIONS} size="small" style={{ width: 160 }} onChange={() => setIsDirty(true)} />
          </Form.Item>

          <div className="h-4 w-px bg-gray-200" />

          <div className="flex items-center gap-1.5">
            <Form.Item name="refreshMode" noStyle>
              <Radio.Group buttonStyle="solid" size="small" onChange={() => setIsDirty(true)}>
                <Radio.Button value="AUTO">자동</Radio.Button>
                <Radio.Button value="MANUAL">수동</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </div>

          <div className="flex items-center gap-1">
            <Form.Item name="defaultW" noStyle>
              <InputNumber min={1} max={12} size="small" style={{ width: 64 }} addonAfter="W" onChange={() => setIsDirty(true)} />
            </Form.Item>
            <Form.Item name="defaultH" noStyle>
              <InputNumber min={1} max={12} size="small" style={{ width: 64 }} addonAfter="H" onChange={() => setIsDirty(true)} />
            </Form.Item>
          </div>

          <div className="h-4 w-px bg-gray-200" />

          <Button size="small" loading={isPending} disabled={isPending || !isDirty} onClick={handleSave}>
            임시저장
          </Button>
        </div>
      </header>

      {/* Step navigator */}
      <StepNav activeStep={activeStep} completedSteps={completedSteps} summaries={stepSummaries} onStepClick={goToStep} />

      {/* Step content */}
      <div className="flex-1 overflow-auto bg-gray-50/60 p-5">
        <div className="bg-white rounded-lg bt-shadow min-h-full flex flex-col">
          <div className="flex-1 p-6">
            {activeStep === 0 && (
              <StepDataSource
                selectedKeys={selectedDatasourceKeys}
                onSelectedKeysChange={(keys) => {
                  setSelectedDatasourceKeys(keys);
                  setFieldMappings([]);
                  setIsDirty(true);
                }}
              />
            )}
            {activeStep === 1 && (
              <StepFieldMapping
                selectedDatasourceKeys={selectedDatasourceKeys}
                fieldMappings={fieldMappings}
                onFieldMappingsChange={(m) => {
                  setFieldMappings(m);
                  setIsDirty(true);
                }}
                calcFields={calcFields}
                onCalcFieldsChange={(c) => {
                  setCalcFields(c);
                  setIsDirty(true);
                }}
                searchBindings={searchBindings}
                onSearchBindingsChange={(s) => {
                  setSearchBindings(s);
                  setIsDirty(true);
                }}
              />
            )}
            {activeStep === 2 && <StepVisualizeAndPreview form={form} datasourceKey={selectedDatasourceKeys[0]} fieldMappings={fieldMappings} />}
          </div>

          {/* Footer */}
          <div className="flex flex-shrink-0 items-center justify-between border-t px-6 py-3 bg-gray-50/50 rounded-b-lg">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeStep === 0}
              className="text-[12px] font-medium text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← 이전
            </button>
            <span className="text-[11px] text-gray-400">
              {activeStep + 1} / {STEPS.length}
            </span>
            {activeStep < STEPS.length - 1 ? (
              <Button size="small" type="primary" onClick={handleNext}>
                다음 →
              </Button>
            ) : (
              <Button size="small" type="primary" loading={isPending} onClick={handleSave}>
                저장 완료
              </Button>
            )}
          </div>
        </div>
      </div>
    </Form>
  );
}
