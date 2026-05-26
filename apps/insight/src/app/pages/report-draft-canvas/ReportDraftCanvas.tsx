import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Tag } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CanvasLayout from '../../features/canvas/components/CanvasLayout';
import { reportApi } from '../../features/report/api/reportApi';
import { DOMAIN_LABELS, DOMAIN_TAG_COLOR } from '../../features/report/constants/reportIconConstants';
import { useReportEditorStore } from '../../features/report/hooks/useReportEditorStore';
import type { DomainCode, ReportIconType } from '../../features/report/types';

interface WizardState {
  title: string;
  domain: DomainCode;
  datasourceKey: string;
  iconType?: ReportIconType;
}

export default function ReportDraftCanvas() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as WizardState | null;

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { panels, reset } = useReportEditorStore();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    reset();
    setBreadcrumb([
      { title: '인사이트' },
      { title: '보고서', path: '/insight/statistics/reports' },
      { title: '새 보고서', path: '/insight/statistics/reports/new' },
      { title: '캔버스', path: '/insight/statistics/reports/new/canvas' },
    ]);
    return () => {
      clearBreadcrumb();
      reset();
    };
  }, [reset, setBreadcrumb, clearBreadcrumb]);

  if (!state?.title || !state?.domain || !state?.datasourceKey) {
    return <Navigate to="/insight/statistics/reports/new" replace />;
  }

  const handleCancel = () => navigate('/insight/statistics/reports/new', { replace: true });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newReport = await reportApi.createReport({
        title: state.title,
        domain: state.domain,
        datasourceKey: state.datasourceKey,
        iconType: state.iconType,
      });
      for (const panel of panels) {
        await reportApi.createPanel(newReport.reportId, {
          panelType: panel.panelType,
          title: panel.title,
          layout: panel.layout,
          chartOptions: panel.chartOptions,
          fieldMap: panel.fieldMap,
        });
      }
      toast.success('보고서가 생성되었습니다.');
      navigate(`/insight/statistics/reports/${newReport.reportId}/edit`, { replace: true });
    } catch {
      toast.error('보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base font-semibold truncate">{state.title}</span>
          <Tag color={DOMAIN_TAG_COLOR[state.domain]} className="!mb-0 shrink-0">
            {state.domain} · {DOMAIN_LABELS[state.domain] ?? state.domain}
          </Tag>
          <Tag color="warning" className="!mb-0 shrink-0">
            초안
          </Tag>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={handleCancel} disabled={isSaving}>
            취소
          </Button>
          <Button type="primary" onClick={handleSave} loading={isSaving}>
            저장
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <CanvasLayout reportId={0} mode="edit" isDraft datasourceKey={state.datasourceKey} />
      </div>
    </div>
  );
}
