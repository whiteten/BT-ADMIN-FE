import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBreadcrumbStore } from '@/shared-store';
import DashboardViewHeader from '../../features/monitoring/components/DashboardViewHeader';
import DashboardCanvas from '../../features/monitoring/components/canvas/DashboardCanvas';
import { useGetDashboard } from '../../features/monitoring/hooks/useDashboardQueries';
import { useDashboardSocket } from '../../features/monitoring/hooks/useDashboardSocket';
import { getMockDashboardDetail } from '../../features/monitoring/mocks/mockDashboards';
import { getMockWidgets } from '../../features/monitoring/mocks/mockWidgets';
import type { Widget } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

export default function DashboardView() {
  const { dashboardId: param } = useParams<{ dashboardId: string }>();
  const dashboardId = Number(param);
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const { data: fetched, isLoading } = useGetDashboard({
    params: { dashboardId },
    queryOptions: { enabled: !!dashboardId, retry: false },
  });
  const dashboard = useMemo(() => fetched ?? getMockDashboardDetail(dashboardId), [fetched, dashboardId]);

  // 위젯 — mock fallback
  const initialWidgets = useMemo<Widget[]>(() => {
    if (fetched?.widgets && fetched.widgets.length > 0) return fetched.widgets;
    return getMockWidgets(dashboardId);
  }, [fetched, dashboardId]);

  // 글로벌 옵션
  const [refreshThrottle, setRefreshThrottle] = useState<1 | 3 | 5 | 10 | 'PAUSED'>(3);

  // 실시간 WebSocket 연결 (useDashboardSocket — M17)
  const { connectionState } = useDashboardSocket({
    dashboardId,
    widgets: initialWidgets,
    refreshThrottle,
  });

  useEffect(() => {
    if (dashboard) {
      setBreadcrumb([{ title: '인사이트' }, { title: '모니터링' }, { title: '대시보드', path: '/insight/monitoring/dashboards' }, { title: ':dashboardName' }, { title: '보기' }], {
        dashboardName: dashboard.dashboardName,
      });
    }
    return () => clearBreadcrumb();
  }, [dashboard, setBreadcrumb, clearBreadcrumb]);

  if (isLoading && !dashboard) return <FallbackSpinner />;
  if (!dashboard) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-[14px] text-[var(--color-bt-fg-muted)]">
          대시보드를 찾을 수 없습니다.{' '}
          <button className="text-[var(--color-bt-primary)] underline" onClick={() => navigate('/insight/monitoring/dashboards')}>
            목록으로
          </button>
        </p>
      </div>
    );
  }

  const isEmpty = initialWidgets.length === 0;

  // Phase 1 — canEdit 항상 true (BE 권한 구현 후 dashboard:edit 체크)
  const canEdit = true;

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <DashboardViewHeader
        dashboard={dashboard}
        connectionState={connectionState}
        canEdit={canEdit}
        refreshThrottle={refreshThrottle}
        onChangeRefreshThrottle={setRefreshThrottle}
        onEdit={() => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit`)}
      />

      {/* 본문 — 위젯 없을 때 안내 / 있을 때 캔버스 (편집 비활성) */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--color-bt-bg-canvas)] gap-4">
          <NoData message="이 대시보드에 위젯이 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
          {canEdit && (
            <button
              type="button"
              onClick={() => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit`)}
              className="rounded bg-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-hover)] px-4 py-2 text-[12.5px] font-medium text-white"
            >
              편집 화면으로 이동
            </button>
          )}
        </div>
      ) : (
        <DashboardCanvas dashboardId={dashboardId} widgets={initialWidgets} editMode={false} />
      )}
    </div>
  );
}
