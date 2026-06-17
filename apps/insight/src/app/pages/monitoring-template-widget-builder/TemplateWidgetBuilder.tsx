import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Steps } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import Step1DatasetVisualization, { type Step1Value } from '../../features/monitoring/components/wizard/Step1DatasetVisualization';
import Step2DatasetConfig, { type Step2FieldOverride } from '../../features/monitoring/components/wizard/Step2DatasetConfig';
import Step3FieldMapping from '../../features/monitoring/components/wizard/Step3FieldMapping';
import Step4Preview from '../../features/monitoring/components/wizard/Step4Preview';
import { useGetMonitoringDatasets } from '../../features/monitoring/hooks/useDatasetQueries';
import { templateWidgetKeys, useCreateTemplateWidget, useGetTemplateWidget, useUpdateTemplateWidget } from '../../features/monitoring/hooks/useTemplateWidgetQueries';
import type { DomainCode, KpiDirection, TemplateWidgetMapping, VizType } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface BuilderForm {
  datasetId?: number;
  visualizations: VizType[];
  defaultViz?: VizType;
  fieldOverrides: Record<string, Step2FieldOverride>;
  mapping: TemplateWidgetMapping;
  widgetName: string;
  refreshInterval: number;
  cardKpiDirection?: KpiDirection;
  layoutW?: number;
  layoutH?: number;
}

const initialForm: BuilderForm = {
  visualizations: [],
  fieldOverrides: {},
  mapping: {},
  widgetName: '',
  refreshInterval: 3,
};

/**
 * 재사용 템플릿 위젯 빌더 — 등록/수정 공용. 대시보드와 무관한 독립 정의.
 * 단계: 데이터셋+시각화 → 데이터셋 구성 → 필드 매핑 → 미리보기.
 * 도메인은 선택한 데이터셋의 도메인을 따른다.
 */
export default function TemplateWidgetBuilder() {
  const { templateWidgetId: param } = useParams<{ templateWidgetId: string }>();
  const editId = param ? Number(param) : undefined;
  const isEdit = editId != null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<BuilderForm>(initialForm);
  const [hydrated, setHydrated] = useState(false);

  // 선택 데이터셋 → 도메인 해석 (저장 시 domainCode)
  const { data: datasets = [] } = useGetMonitoringDatasets();
  const selectedDomain: DomainCode | undefined = datasets.find((d) => d.datasetId === form.datasetId)?.domainCode;
  // Step1 데이터셋 필터 초기 도메인 (없으면 IC)
  const filterDomain: DomainCode = selectedDomain ?? 'IC';

  // 편집 모드 — 기존 정의 prefill
  const { data: detail, isLoading: isDetailLoading } = useGetTemplateWidget({
    params: { templateWidgetId: editId ?? 0 },
    queryOptions: { enabled: isEdit, retry: false },
  });

  useEffect(() => {
    if (isEdit && detail && !hydrated) {
      setForm({
        datasetId: detail.datasetId,
        visualizations: detail.visualizations,
        defaultViz: detail.defaultViz,
        fieldOverrides: (detail.fieldOverrides ?? {}) as Record<string, Step2FieldOverride>,
        mapping: detail.mapping ?? {},
        widgetName: detail.widgetName,
        refreshInterval: detail.refreshInterval ?? 3,
        cardKpiDirection: detail.cardKpiDirection,
        layoutW: detail.layoutW,
        layoutH: detail.layoutH,
      });
      setHydrated(true);
    }
  }, [isEdit, detail, hydrated]);

  useEffect(() => {
    setBreadcrumb([
      { title: '모니터링', path: '/insight/monitoring' },
      { title: '위젯 관리', path: '/insight/monitoring/widgets' },
      { title: isEdit ? '템플릿 위젯 수정' : '새 템플릿 위젯', path: '/insight/monitoring/widgets/template/new' },
    ]);
    return () => clearBreadcrumb();
  }, [isEdit, setBreadcrumb, clearBreadcrumb]);

  const { mutate: runCreate, isPending: isCreating } = useCreateTemplateWidget({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: templateWidgetKeys.list._def });
        toast.success('템플릿 위젯이 저장되었습니다.');
        navigate('/insight/monitoring/widgets');
      },
    },
  });
  const { mutate: runUpdate, isPending: isUpdating } = useUpdateTemplateWidget({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: templateWidgetKeys.list._def });
        if (editId) queryClient.invalidateQueries({ queryKey: templateWidgetKeys.detail(editId).queryKey });
        toast.success('템플릿 위젯이 수정되었습니다.');
        navigate('/insight/monitoring/widgets');
      },
    },
  });

  const updateStep1 = (v: Step1Value) =>
    setForm((f) => {
      const datasetChanged = f.datasetId !== v.datasetId;
      return {
        ...f,
        datasetId: v.datasetId,
        visualizations: v.visualizations,
        defaultViz: v.defaultViz,
        fieldOverrides: datasetChanged ? {} : f.fieldOverrides,
        mapping: datasetChanged ? {} : f.mapping,
      };
    });
  const updateStep2 = (next: Record<string, Step2FieldOverride>) => setForm((f) => ({ ...f, fieldOverrides: next }));
  const updateStep3 = (next: TemplateWidgetMapping) => setForm((f) => ({ ...f, mapping: next }));
  const updateStep4 = (patch: { widgetName?: string; refreshInterval?: number; layoutW?: number; layoutH?: number }) => setForm((f) => ({ ...f, ...patch }));

  const canNext = (): boolean => {
    if (currentStep === 0) return !!form.datasetId && form.visualizations.length > 0 && !!form.defaultViz;
    if (currentStep === 1) return Object.values(form.fieldOverrides).some((o) => o?.isVisible);
    if (currentStep === 2) {
      for (const viz of form.visualizations) {
        if (viz === 'GRID' && !form.mapping.GRID?.columns?.length) return false;
        if (viz === 'BAR' && (!form.mapping.BAR?.x || !form.mapping.BAR?.y?.length)) return false;
        if (viz === 'LINE' && (!form.mapping.LINE?.x || !form.mapping.LINE?.y?.length)) return false;
        if (viz === 'CARD' && !form.mapping.CARD?.measure) return false;
      }
      return true;
    }
    if (currentStep === 3) return form.widgetName.trim().length > 0;
    return true;
  };

  const handleCancel = () => navigate('/insight/monitoring/widgets');
  const handleBack = () => (currentStep === 0 ? handleCancel() : setCurrentStep((s) => s - 1));

  const handleSave = () => {
    if (!form.datasetId || !form.defaultViz) return;
    if (!selectedDomain) {
      toast.error('데이터셋의 도메인을 확인할 수 없습니다.');
      return;
    }
    const payload = {
      widgetName: form.widgetName.trim(),
      domainCode: selectedDomain,
      datasetId: form.datasetId,
      visualizations: form.visualizations,
      defaultViz: form.defaultViz,
      mapping: form.mapping as Record<string, unknown>,
      fieldOverrides: form.fieldOverrides as Record<string, unknown>,
      refreshInterval: form.refreshInterval,
      cardKpiDirection: form.cardKpiDirection,
      layoutW: form.layoutW,
      layoutH: form.layoutH,
    };
    if (isEdit && editId) runUpdate({ templateWidgetId: editId, data: payload });
    else runCreate(payload);
  };

  const handleNext = () => (currentStep < 3 ? setCurrentStep((s) => s + 1) : handleSave());

  if (isEdit && isDetailLoading && !detail) return <FallbackSpinner />;

  const saving = isCreating || isUpdating;

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <div className="flex items-center justify-center bg-white bt-shadow px-7 py-4">
        <Steps
          current={currentStep}
          size="small"
          className="!max-w-[720px]"
          items={[{ title: '데이터셋 + 시각화' }, { title: '데이터셋 구성' }, { title: '필드 매핑' }, { title: '미리보기' }]}
        />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {currentStep === 0 && (
          <Step1DatasetVisualization
            domainCode={filterDomain}
            value={{ datasetId: form.datasetId, visualizations: form.visualizations, defaultViz: form.defaultViz }}
            onChange={updateStep1}
          />
        )}
        {currentStep === 1 && form.datasetId && <Step2DatasetConfig datasetId={form.datasetId} fieldOverrides={form.fieldOverrides} onChange={updateStep2} />}
        {currentStep === 2 && form.datasetId && form.defaultViz && (
          <Step3FieldMapping
            datasetId={form.datasetId}
            fieldOverrides={form.fieldOverrides}
            visualizations={form.visualizations}
            defaultViz={form.defaultViz}
            mapping={form.mapping}
            onChange={updateStep3}
          />
        )}
        {currentStep === 3 && form.datasetId && form.defaultViz && (
          <Step4Preview
            datasetId={form.datasetId}
            fieldOverrides={form.fieldOverrides}
            visualizations={form.visualizations}
            defaultViz={form.defaultViz}
            mapping={form.mapping}
            widgetName={form.widgetName}
            refreshInterval={form.refreshInterval}
            layoutW={form.layoutW}
            layoutH={form.layoutH}
            onChange={updateStep4}
          />
        )}
      </div>

      <div className="flex items-center justify-between bg-white bt-shadow px-7 py-3">
        <Button onClick={handleCancel}>취소</Button>
        <div className="flex items-center gap-2">
          <Button icon={<ChevronLeft className="w-3.5 h-3.5" />} onClick={handleBack}>
            {currentStep === 0 ? '취소' : '이전'}
          </Button>
          {currentStep < 3 ? (
            <Button type="primary" disabled={!canNext()} onClick={handleNext}>
              다음 <ChevronRight className="w-3.5 h-3.5 inline" />
            </Button>
          ) : (
            <Button type="primary" disabled={!canNext()} loading={saving} onClick={handleSave}>
              {isEdit ? '수정 저장' : '위젯 저장'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
