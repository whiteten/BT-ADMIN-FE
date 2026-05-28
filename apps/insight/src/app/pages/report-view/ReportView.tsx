import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumbStore } from '@/shared-store';
import ReportViewCanvas from '../../features/canvas/components/ReportViewCanvas';
import { useReportEditorStore } from '../../features/report/hooks/useReportEditorStore';
import { useGetReport } from '../../features/report/hooks/useReportQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function ReportView() {
  const { reportId: reportIdParam } = useParams<{ reportId: string }>();
  const reportId = Number(reportIdParam);
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
      setBreadcrumb([{ title: '보고서', path: '/insight/statistics/reports' }, { title: ':reportTitle' }], { reportTitle: reportFull.title });
    }
    return () => clearBreadcrumb();
  }, [reportFull, reportId, setBreadcrumb, clearBreadcrumb]);

  if (isLoading || !reportFull) return <FallbackSpinner />;

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <ReportViewCanvas reportId={reportId} report={reportFull} />
    </div>
  );
}
