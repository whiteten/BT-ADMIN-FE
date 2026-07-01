import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button } from 'antd';
import { ChevronLeft } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CustomWidgetCatalogPanel from '../../features/monitoring/components/CustomWidgetCatalogPanel';
import DashboardCanvas from '../../features/monitoring/components/canvas/DashboardCanvas';
import EmptyCanvas from '../../features/monitoring/components/canvas/EmptyCanvas';
import { dashboardKeys, useCreateWidget, useGetDashboard } from '../../features/monitoring/hooks/useDashboardQueries';
import type { CustomWidgetCatalogItem, Widget } from '../../features/monitoring/types';
import { autoPackPosition } from '../../features/monitoring/utils/autoPackPosition';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

/**
 * 커스텀 위젯 카탈로그 페이지.
 * 왼쪽에는 현재 대시보드 현황(ReadOnly)을, 오른쪽에는 카탈로그 패널을 배치.
 */
export default function CustomWidgetCatalogPage() {
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

  const existingWidgets = useMemo<Widget[]>(() => (dashboard?.widgets ?? []) as Widget[], [dashboard]);

  const { mutate: createWidget, isPending: isCreating } = useCreateWidget({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId).queryKey });
        queryClient.invalidateQueries({ queryKey: dashboardKeys.widgets(dashboardId).queryKey });
        toast.success('위젯이 추가되었습니다.');
        navigate(`/insight/monitoring/dashboards/${dashboardId}/edit`);
      },
      onError: () => toast.error('위젯 추가 중 오류가 발생했습니다.'),
    },
  });

  useEffect(() => {
    if (dashboard) {
      const items: BreadcrumbProps['items'] = [
        { title: '모니터링', path: '/insight/monitoring' },
        { title: '대시보드', path: '/insight/monitoring/dashboards' },
        { title: dashboard.dashboardName, path: `/insight/monitoring/dashboards/${dashboardId}/edit` },
        { title: '+ 커스텀 위젯', path: `/insight/monitoring/dashboards/${dashboardId}/edit/widget/create/custom` },
      ];
      setBreadcrumb(items);
    }
    return () => clearBreadcrumb();
  }, [dashboard, dashboardId, setBreadcrumb, clearBreadcrumb]);

  // ESC로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(`/insight/monitoring/dashboards/${dashboardId}/edit`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, dashboardId]);

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

  const handleAdd = (widget: CustomWidgetCatalogItem, size?: { w: number; h: number }) => {
    if (isCreating) return;
    createWidget({
      dashboardId,
      data: {
        kind: 'CUSTOM',
        widgetName: widget.widgetName,
        widgetTypeId: widget.widgetTypeId,
        options: widget.defaultOptions ?? {},
        position: autoPackPosition(existingWidgets, widget, size),
      },
    });
  };

  const handleClose = () => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit`);

  const isEmpty = existingWidgets.length === 0;

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      {/* 헤더 — FCA 스타일 */}
      <div className="flex gap-2 w-full h-[58px] min-h-[58px] items-center shrink-0 bg-white bt-shadow px-5">
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button icon={<ChevronLeft className="w-3.5 h-3.5" />} onClick={handleClose}>
              편집으로
            </Button>
            <span className="ml-1 text-sm font-medium text-[#495057]">{dashboard.dashboardName}</span>
            <span className="text-xs text-[#868e96]">· 커스텀 위젯 추가</span>
          </div>
        </div>
      </div>

      {/* 본문 — 좌: 현재 대시보드 위젯들(읽기 전용) / 우: 카탈로그 패널 */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden p-4">
          {isEmpty ? (
            <EmptyCanvas onLayoutSelect={() => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit`)} />
          ) : (
            <DashboardCanvas dashboardId={dashboardId} widgets={existingWidgets} editMode={false} />
          )}
        </div>

        <CustomWidgetCatalogPanel onAdd={handleAdd} onClose={handleClose} />
      </div>
    </div>
  );
}
