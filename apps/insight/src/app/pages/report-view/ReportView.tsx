import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumbStore } from '@/shared-store';
import ReportViewCanvas from '../../features/canvas/components/ReportViewCanvas';
import { useReportEditorStore } from '../../features/report/hooks/useReportEditorStore';
import { useGetReport } from '../../features/report/hooks/useReportQueries';
import { useReportViewStore } from '../../features/report/hooks/useReportViewStore';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function ReportView() {
  const { reportId: reportIdParam } = useParams<{ reportId: string }>();
  const reportId = Number(reportIdParam);
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { setReport, setPanels, setCalcFields, setSearchBindings, setFieldDisplays, reset } = useReportEditorStore();
  const commitFilter = useReportViewStore((s) => s.commitFilter);
  const resetViewFilter = useReportViewStore((s) => s.resetFilter);
  const autoQueriedRef = useRef<number | null>(null);

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

  // 뷰 진입 시 1회 자동 조회 — 새로고침/네비게이션 상관없이 항상 동일하게 동작
  useEffect(() => {
    if (reportFull && autoQueriedRef.current !== reportId) {
      autoQueriedRef.current = reportId;
      commitFilter();
    }
  }, [reportFull, reportId, commitFilter]);

  // 이탈 시 editor·view 스토어 모두 초기화 (queryTrigger 잔존으로 인한 비일관 동작 방지)
  useEffect(() => {
    return () => {
      reset();
      resetViewFilter();
    };
  }, [reset, resetViewFilter]);

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
