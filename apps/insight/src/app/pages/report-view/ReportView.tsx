import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBreadcrumbStore } from '@/shared-store';
import ReportViewCanvas from '../../features/canvas/components/ReportViewCanvas';
import { useReportEditorStore } from '../../features/report/hooks/useReportEditorStore';
import { useGetReport } from '../../features/report/hooks/useReportQueries';
import { useReportViewStore } from '../../features/report/hooks/useReportViewStore';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

/**
 * 통합 통계 보고서 보기.
 *
 * reportId 는 path 파라미터가 아닌 `?reportId=` 쿼리스트링으로 받는다(queryString 메뉴 분기 패턴).
 * 같은 path(`/insight/statistics/reports/view`)를 여러 메뉴가 reportId 만 바꿔 공유하므로,
 * 메뉴 전환 시 queryString 만 변하고 컴포넌트는 unmount 되지 않는다. → reportId 를 key 로 박아
 * ReportViewBody 를 강제 remount 해 editor/view 스토어가 깨끗이 재초기화되도록 한다.
 */
export default function ReportView() {
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('reportId') ?? '';
  return <ReportViewBody key={reportId} reportId={Number(reportId)} />;
}

function ReportViewBody({ reportId }: { reportId: number }) {
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
      setBreadcrumb(
        [
          { title: '통계', path: '/insight/statistics' },
          { title: '보고서 관리', path: '/insight/statistics/reports' },
          { title: ':reportTitle', path: `/insight/statistics/reports/view?reportId=${reportId}` },
        ],
        {
          reportTitle: reportFull.title,
        },
      );
    }
    return () => clearBreadcrumb();
  }, [reportFull, reportId, setBreadcrumb, clearBreadcrumb]);

  if (!reportId) {
    return (
      <div className="flex w-full h-full items-center justify-center">
        <p className="text-sm text-[var(--color-bt-fg-muted)]">보고서가 지정되지 않았습니다. (reportId 쿼리 누락)</p>
      </div>
    );
  }

  if (isLoading || !reportFull) return <FallbackSpinner />;

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <ReportViewCanvas reportId={reportId} report={reportFull} />
    </div>
  );
}
