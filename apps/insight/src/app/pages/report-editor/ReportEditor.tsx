import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBreadcrumbStore } from '@/shared-store';
import ReportEditorCanvas from '../../features/canvas/components/ReportEditorCanvas';
import { useReportEditorStore } from '../../features/report/hooks/useReportEditorStore';
import { useGetReport } from '../../features/report/hooks/useReportQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function ReportEditor() {
  const { reportId: reportIdParam } = useParams<{ reportId: string }>();
  const reportId = Number(reportIdParam);
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { setReport, setPanels, setCalcFields, setSearchBindings, setFieldDisplays, reset } = useReportEditorStore();

  const { data: reportFull, isLoading } = useGetReport({
    params: { reportId },
    queryOptions: { enabled: !!reportId },
  });

  useEffect(() => {
    if (reportFull) {
      setReport(reportFull);
      setPanels(reportFull.panels);
      setCalcFields(reportFull.calcFields);
      setSearchBindings(reportFull.searchBindings);
      setFieldDisplays(reportFull.fieldDisplays);
    }
  }, [reportFull, setReport, setPanels, setCalcFields, setSearchBindings, setFieldDisplays]);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  useEffect(() => {
    if (reportFull) {
      setBreadcrumb(
        [{ title: '인사이트' }, { title: '보고서', path: '/insight/statistics/reports' }, { title: ':reportTitle', path: `/insight/statistics/reports/${reportId}/edit` }],
        { reportTitle: reportFull.title },
      );
    }
    return () => clearBreadcrumb();
  }, [reportFull, reportId, setBreadcrumb, clearBreadcrumb]);

  if (isLoading || !reportFull) return <FallbackSpinner />;

  return (
    <div className="flex flex-col w-full h-full bg-bt-bg-canvas">
      <ReportEditorCanvas reportId={reportId} onNavigateList={() => navigate('/insight/statistics/reports')} />
    </div>
  );
}
