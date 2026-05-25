import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { type BreadcrumbProps, Button, Steps } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import Step1DatasetVisualization, { type Step1Value } from '../../features/monitoring/components/wizard/Step1DatasetVisualization';
import Step2DatasetConfig, { type Step2FieldOverride } from '../../features/monitoring/components/wizard/Step2DatasetConfig';
import Step3FieldMapping from '../../features/monitoring/components/wizard/Step3FieldMapping';
import Step4Preview from '../../features/monitoring/components/wizard/Step4Preview';
import { useGetDashboard } from '../../features/monitoring/hooks/useDashboardQueries';
import { getMockDashboardDetail } from '../../features/monitoring/mocks/mockDashboards';
import type { KpiDirection, TemplateWidgetMapping, VizType } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// 마법사 전체 폼 상태
export interface TemplateWizardForm {
  // Step 1
  datasetId?: number;
  visualizations: VizType[];
  defaultViz?: VizType;
  // Step 2 — 위젯 단 필드 override
  fieldOverrides: Record<string, Step2FieldOverride>;
  // Step 3
  mapping: TemplateWidgetMapping;
  // Step 4
  widgetName: string;
  refreshInterval: number;
  cardKpiDirection?: KpiDirection;
}

const initialForm: TemplateWizardForm = {
  visualizations: [],
  fieldOverrides: {},
  mapping: {},
  widgetName: '',
  refreshInterval: 3,
};

export default function TemplateWidgetWizard() {
  const { dashboardId: param } = useParams<{ dashboardId: string }>();
  const dashboardId = Number(param);
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<TemplateWizardForm>(initialForm);

  // 대시보드 정보 (도메인 컨텍스트)
  const { data: fetched } = useGetDashboard({
    params: { dashboardId },
    queryOptions: { enabled: !!dashboardId, retry: false },
  });
  const dashboard = fetched ?? getMockDashboardDetail(dashboardId);

  useEffect(() => {
    if (dashboard) {
      setBreadcrumb(
        [
          { title: '인사이트' },
          { title: '모니터링' },
          { title: '대시보드', path: '/insight/monitoring/dashboards' },
          { title: ':dashboardName', path: `/insight/monitoring/dashboards/${dashboardId}/edit` },
          { title: '새 템플릿 위젯' },
        ],
        { dashboardName: dashboard.dashboardName },
      );
    }
    return () => clearBreadcrumb();
  }, [dashboard, dashboardId, setBreadcrumb, clearBreadcrumb]);

  if (!dashboard) return <FallbackSpinner />;

  const updateStep1 = (v: Step1Value) => {
    setForm((f) => {
      const datasetChanged = f.datasetId !== v.datasetId;
      return {
        ...f,
        datasetId: v.datasetId,
        visualizations: v.visualizations,
        defaultViz: v.defaultViz,
        // 데이터셋 변경 시 Step 2·3 reset
        fieldOverrides: datasetChanged ? {} : f.fieldOverrides,
        mapping: datasetChanged ? {} : f.mapping,
      };
    });
  };

  const updateStep2 = (next: Record<string, Step2FieldOverride>) => {
    setForm((f) => ({ ...f, fieldOverrides: next }));
  };

  const updateStep3 = (next: TemplateWidgetMapping) => {
    setForm((f) => ({ ...f, mapping: next }));
  };

  const updateStep4 = (patch: { widgetName?: string; refreshInterval?: number }) => {
    setForm((f) => ({ ...f, ...patch }));
  };

  // Step별 진행 가능 여부
  const canNext = (): boolean => {
    if (currentStep === 0) {
      return !!form.datasetId && form.visualizations.length > 0 && !!form.defaultViz;
    }
    if (currentStep === 1) {
      // 최소 1개 필드 노출
      return Object.values(form.fieldOverrides).some((o) => o?.isVisible);
    }
    if (currentStep === 2) {
      // 선택한 시각화 모두 최소한의 매핑 완료
      for (const viz of form.visualizations) {
        if (viz === 'GRID') {
          if (!form.mapping.GRID?.columns?.length) return false;
        } else if (viz === 'BAR') {
          if (!form.mapping.BAR?.x || !form.mapping.BAR?.y?.length) return false;
        } else if (viz === 'LINE') {
          if (!form.mapping.LINE?.x || !form.mapping.LINE?.y?.length) return false;
        } else if (viz === 'CARD') {
          if (!form.mapping.CARD?.measure) return false;
        }
      }
      return true;
    }
    if (currentStep === 3) {
      // 위젯명 입력 필수
      return form.widgetName.trim().length > 0;
    }
    return true;
  };

  const handleCancel = () => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit`);
  const handleBack = () => {
    if (currentStep === 0) handleCancel();
    else setCurrentStep((s) => s - 1);
  };
  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((s) => s + 1);
    } else {
      handleSave();
    }
  };
  const handleSave = () => {
    toast.success('위젯이 저장되었습니다. (※ BE 미구현 — UI 동작만)');
    navigate(`/insight/monitoring/dashboards/${dashboardId}/edit`);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      {/* Stepper */}
      <div className="flex items-center justify-center bg-white bt-shadow px-7 py-4">
        <Steps
          current={currentStep}
          size="small"
          className="!max-w-[720px]"
          items={[{ title: '데이터셋 + 시각화' }, { title: '데이터셋 구성' }, { title: '필드 매핑' }, { title: '미리보기' }]}
        />
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {currentStep === 0 && (
          <Step1DatasetVisualization
            domainCode={dashboard.domainCode}
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
            onChange={updateStep4}
          />
        )}
      </div>

      {/* Footer */}
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
            <Button type="primary" disabled={!canNext()} onClick={handleSave}>
              위젯 저장
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
