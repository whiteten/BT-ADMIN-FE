import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import ReportViewCanvas from '../../features/canvas/components/ReportViewCanvas';
import { useExitReportOnScopeChange } from '../../features/report/hooks/useExitReportOnScopeChange';
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
  // 운영자 모드 목록에서 선택한 스코프 테넌트 — 뷰어 테넌트 조건 프리셋 (`?tenantId=`)
  const presetTenantId = searchParams.get('tenantId');
  return <ReportViewBody key={`${reportId}:${presetTenantId ?? ''}`} reportId={Number(reportId)} presetTenantId={presetTenantId} />;
}

function ReportViewBody({ reportId, presetTenantId }: { reportId: number; presetTenantId: string | null }) {
  // 화면 안에서 운영자 모드/대행 테넌트가 바뀌면 reportId 가 새 컨텍스트에서 무효 — 목록 복귀
  useExitReportOnScopeChange();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { setReport, setPanels, setCalcFields, setSearchBindings, setFieldDisplays, reset } = useReportEditorStore();
  const commitFilter = useReportViewStore((s) => s.commitFilter);
  const setViewTenantId = useReportViewStore((s) => s.setTenantId);
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

  // 뷰 진입 시 1회 자동 조회 — 새로고침/네비게이션 상관없이 항상 동일하게 동작.
  // 운영자 모드는 테넌트 검색조건 선택이 선행돼야 하므로 기본은 자동 조회를 걸지 않되,
  // 목록에서 스코프 테넌트를 갖고 들어온 경우(?tenantId=)는 그 값으로 프리셋 후 즉시 조회.
  // (프리셋은 GlobalFilter 의 hydrate(자식 effect, 먼저 실행)가 tenantId 를 비운 뒤 적용돼야 함)
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  useEffect(() => {
    if (!reportFull || autoQueriedRef.current === reportId) return;
    if (operatorMode && !presetTenantId) return; // 프리셋 없는 운영자 진입 — 수동 선택 대기
    autoQueriedRef.current = reportId;
    if (operatorMode && presetTenantId) setViewTenantId(presetTenantId);
    commitFilter();
  }, [reportFull, reportId, commitFilter, operatorMode, presetTenantId, setViewTenantId]);

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
