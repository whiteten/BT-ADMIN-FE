import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DashboardEditorHeader from '../../features/monitoring/components/DashboardEditorHeader';
import DashboardCanvas from '../../features/monitoring/components/canvas/DashboardCanvas';
import EmptyCanvas from '../../features/monitoring/components/canvas/EmptyCanvas';
import { useGetDashboard } from '../../features/monitoring/hooks/useDashboardQueries';
import { getMockDashboardDetail } from '../../features/monitoring/mocks/mockDashboards';
import { getMockWidgets } from '../../features/monitoring/mocks/mockWidgets';
import type { Widget } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function DashboardEditor() {
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

  // 위젯 — mock 데이터로 시작. 사용자가 추가/삭제/이동 가능
  const initialWidgets = useMemo(() => {
    if (fetched?.widgets && fetched.widgets.length > 0) return fetched.widgets;
    return getMockWidgets(dashboardId);
  }, [fetched, dashboardId]);

  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);

  useEffect(() => {
    setWidgets(initialWidgets);
  }, [initialWidgets]);

  useEffect(() => {
    if (dashboard) {
      setBreadcrumb([{ title: '인사이트' }, { title: '모니터링' }, { title: '대시보드', path: '/insight/monitoring/dashboards' }, { title: ':dashboardName' }], {
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

  const handleSave = () => toast.success(`대시보드가 저장되었습니다. (위젯 ${widgets.length}개 · ※ BE 미구현)`);
  const handlePreview = () => navigate(`/insight/monitoring/dashboards/${dashboardId}/view`);
  const handleRename = (newName: string) => toast.success(`이름이 "${newName}"로 변경되었습니다. (※ BE 미구현)`);

  const isEmpty = widgets.length === 0;

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <DashboardEditorHeader dashboard={dashboard} onSave={handleSave} onPreview={handlePreview} onRename={handleRename} />

      {/* 빈 상태(§3) vs 위젯 배치(§7) 분기 */}
      {isEmpty ? <EmptyCanvas dashboardId={dashboardId} /> : <DashboardCanvas dashboardId={dashboardId} widgets={widgets} editMode={true} onWidgetsChange={setWidgets} />}
    </div>
  );
}
