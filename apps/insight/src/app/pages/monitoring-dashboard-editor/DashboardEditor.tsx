import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DashboardEditorHeader from '../../features/monitoring/components/DashboardEditorHeader';
import DashboardCanvas from '../../features/monitoring/components/canvas/DashboardCanvas';
import EmptyCanvas from '../../features/monitoring/components/canvas/EmptyCanvas';
import { dashboardKeys, useDeleteWidget, useGetDashboard, useUpdateDashboard, useUpdateLayout } from '../../features/monitoring/hooks/useDashboardQueries';
import type { Widget } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function DashboardEditor() {
  const { dashboardId: param } = useParams<{ dashboardId: string }>();
  const dashboardId = Number(param);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const { data: dashboard, isLoading } = useGetDashboard({
    params: { dashboardId },
    queryOptions: { enabled: !!dashboardId, retry: false },
  });

  // BE 응답의 widgets 배열을 그대로 사용
  const initialWidgets = useMemo<Widget[]>(() => (dashboard?.widgets ?? []) as Widget[], [dashboard]);
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);

  useEffect(() => {
    setWidgets(initialWidgets);
  }, [initialWidgets]);

  useEffect(() => {
    if (dashboard) {
      setBreadcrumb(
        [
          { title: '모니터링', path: '/insight/monitoring' },
          { title: '대시보드', path: '/insight/monitoring/dashboards' },
          { title: ':dashboardName', path: `/insight/monitoring/dashboards/${dashboardId}/edit` },
        ],
        { dashboardName: dashboard.dashboardName },
      );
    }
    return () => clearBreadcrumb();
  }, [dashboard, dashboardId, setBreadcrumb, clearBreadcrumb]);

  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId).queryKey });
  };

  const { mutate: updateLayout, isPending: isSaving } = useUpdateLayout({
    mutationOptions: {
      onSuccess: () => {
        invalidateDetail();
        toast.success('대시보드가 저장되었습니다.');
      },
      onError: () => toast.error('저장 중 오류가 발생했습니다.'),
    },
  });

  const { mutate: updateDashboard } = useUpdateDashboard({
    mutationOptions: {
      onSuccess: () => {
        invalidateDetail();
        queryClient.invalidateQueries({ queryKey: dashboardKeys.list._def });
        toast.success('이름이 변경되었습니다.');
      },
      onError: () => toast.error('이름 변경 중 오류가 발생했습니다.'),
    },
  });

  const { mutate: deleteWidget } = useDeleteWidget({
    mutationOptions: {
      onSuccess: () => {
        invalidateDetail();
        toast.success('위젯이 삭제되었습니다.');
      },
      onError: () => toast.error('위젯 삭제 중 오류가 발생했습니다.'),
    },
  });

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

  const handleSave = () => {
    if (isSaving) return;
    updateLayout({
      dashboardId,
      items: widgets.map((w) => ({
        widgetId: w.widgetId,
        row: w.position.row,
        col: w.position.col,
        w: w.position.w,
        h: w.position.h,
      })),
    });
  };

  const handlePreview = () => navigate(`/insight/monitoring/dashboards/${dashboardId}/view`);

  const handleRename = (newName: string) => {
    updateDashboard({ dashboardId, data: { dashboardName: newName } });
  };

  // Canvas 에서 widget 배열이 변경되면(드래그/리사이즈/삭제) 호출.
  // 삭제 — diff 로 사라진 widgetId 찾아서 BE DELETE 호출. 그 외 변경은 local state 만 갱신.
  const handleWidgetsChange = (next: Widget[]) => {
    const removed = widgets.filter((prev) => !next.some((n) => n.widgetId === prev.widgetId));
    removed.forEach((w) => deleteWidget(w.widgetId));
    setWidgets(next);
  };

  const isEmpty = widgets.length === 0;

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <DashboardEditorHeader dashboard={dashboard} onSave={handleSave} onPreview={handlePreview} onRename={handleRename} />

      {isEmpty ? <EmptyCanvas dashboardId={dashboardId} /> : <DashboardCanvas dashboardId={dashboardId} widgets={widgets} editMode={true} onWidgetsChange={handleWidgetsChange} />}
    </div>
  );
}
