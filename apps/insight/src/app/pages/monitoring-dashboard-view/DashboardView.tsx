import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DashboardHeader from '../../features/monitoring/components/DashboardHeader';
import DashboardCanvas from '../../features/monitoring/components/canvas/DashboardCanvas';
import EmptyCanvas from '../../features/monitoring/components/canvas/EmptyCanvas';
import WidgetCatalogDrawer from '../../features/monitoring/components/canvas/WidgetCatalogDrawer';
import { dashboardKeys, useCreateWidget, useDeleteWidget, useGetDashboard, useUpdateDashboard, useUpdateLayout } from '../../features/monitoring/hooks/useDashboardQueries';
import { useDashboardSocket } from '../../features/monitoring/hooks/useDashboardSocket';
import { useWidgetUserSettingsMap } from '../../features/monitoring/hooks/useWidgetSettingQueries';
import type { CustomWidgetCatalogItem, Widget } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

type Mode = 'view' | 'edit';

/**
 * 모니터링 대시보드 — View + Edit 통합 페이지.
 */
export default function DashboardView() {
  const { dashboardId: param } = useParams<{ dashboardId: string }>();
  const dashboardId = Number(param);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const explicitInitialMode = (location.state as { initialMode?: Mode } | null)?.initialMode;
  const pathIsEdit = location.pathname.endsWith('/edit');
  const initialMode: Mode = explicitInitialMode ?? (pathIsEdit ? 'edit' : 'view');
  const [mode, setMode] = useState<Mode>(initialMode);

  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const { data: dashboard, isLoading } = useGetDashboard({
    params: { dashboardId },
    queryOptions: { enabled: !!dashboardId, retry: false },
  });

  const initialWidgets = useMemo<Widget[]>(() => (dashboard?.widgets ?? []) as Widget[], [dashboard]);
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);

  useEffect(() => {
    setWidgets(initialWidgets);
  }, [initialWidgets]);

  useEffect(() => {
    if (!dashboard) return;
    const base = [
      { title: '모니터링', path: '/insight/monitoring' },
      { title: '대시보드', path: '/insight/monitoring/dashboards' },
    ];
    const trail =
      mode === 'edit'
        ? [{ title: ':dashboardName', path: `/insight/monitoring/dashboards/${dashboardId}/edit` }]
        : [{ title: ':dashboardName' }, { title: '보기', path: `/insight/monitoring/dashboards/${dashboardId}/view` }];
    setBreadcrumb([...base, ...trail], { dashboardName: dashboard.dashboardName });
    return () => clearBreadcrumb();
  }, [dashboard, dashboardId, mode, setBreadcrumb, clearBreadcrumb]);

  const [monitoringStarted, setMonitoringStarted] = useState(false);
  const [refreshThrottle, setRefreshThrottle] = useState<1 | 3 | 5 | 10 | 'PAUSED'>(3);

  const rootRef = useRef<HTMLDivElement>(null);
  const [fitToScreen, setFitToScreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setFitToScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFit = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen?.().catch((e) => console.warn('fullscreen request failed', e));
    } else {
      document.exitFullscreen?.().catch((e) => console.warn('exit fullscreen failed', e));
    }
  };

  useEffect(() => {
    if (mode === 'edit') {
      setMonitoringStarted(false);
      setIsCatalogOpen(true);
      if (document.fullscreenElement) document.exitFullscreen?.().catch((e) => console.warn('exit fullscreen failed', e));
    } else {
      setIsCatalogOpen(false);
    }
  }, [mode]);

  const customWidgetIds = useMemo(() => widgets.filter((w) => w.kind === 'CUSTOM').map((w) => w.widgetId), [widgets]);
  const widgetUserSettings = useWidgetUserSettingsMap(customWidgetIds);

  const { connectionState, widgetData } = useDashboardSocket({
    dashboardId,
    widgets,
    refreshThrottle,
    widgetUserSettings,
    enabled: mode === 'view' && monitoringStarted,
  });

  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId).queryKey });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.widgets(dashboardId).queryKey });
  };

  const { mutate: updateLayout, isPending: isSaving } = useUpdateLayout({
    mutationOptions: {
      onSuccess: () => {
        invalidateDetail();
        toast.success('대시보드가 저장되었습니다.');
        setMode('view');
      },
    },
  });

  const { mutate: updateDashboard } = useUpdateDashboard({
    mutationOptions: {
      onSuccess: () => {
        invalidateDetail();
        queryClient.invalidateQueries({ queryKey: dashboardKeys.list._def });
        toast.success('이름이 변경되었습니다.');
      },
    },
  });

  const { mutate: deleteWidget } = useDeleteWidget({
    mutationOptions: {
      onSuccess: () => {
        invalidateDetail();
        toast.success('위젯이 삭제되었습니다.');
      },
    },
  });

  const { mutate: createWidget, isPending: isCreating } = useCreateWidget({
    mutationOptions: {
      onSuccess: () => {
        invalidateDetail();
        toast.success('위젯이 추가되었습니다.');
      },
      onError: () => toast.error('위젯 추가 중 오류가 발생했습니다.'),
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

  const handleCancel = () => {
    setWidgets(initialWidgets);
    setMode('view');
  };

  const handleRename = (next: string) => updateDashboard({ dashboardId, data: { dashboardName: next } });

  const handleWidgetsChange = (next: Widget[]) => {
    const removed = widgets.filter((prev) => !next.some((n) => n.widgetId === prev.widgetId));
    removed.forEach((w) => deleteWidget(w.widgetId));
    setWidgets(next);
  };

  const handleAddTemplate = () => {
    navigate(`/insight/monitoring/dashboards/${dashboardId}/edit/widget/create/template`, { state: { initialMode: 'edit' } });
  };

  const handleAddCustom = (catalogItem: CustomWidgetCatalogItem) => {
    if (isCreating) return;
    createWidget({
      dashboardId,
      data: {
        kind: 'CUSTOM',
        widgetName: catalogItem.widgetName,
        widgetTypeId: catalogItem.widgetTypeId,
        options: catalogItem.defaultOptions ?? {},
        position: { row: 0, col: 0, w: catalogItem.minW ?? 4, h: catalogItem.minH ?? 4 },
      },
    });
  };

  const isEmpty = widgets.length === 0;
  const canEdit = true;

  return (
    <div ref={rootRef} className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <DashboardHeader
        dashboard={dashboard}
        mode={mode}
        canEdit={canEdit}
        monitoringStarted={monitoringStarted}
        connectionState={connectionState}
        refreshThrottle={refreshThrottle}
        onChangeRefreshThrottle={setRefreshThrottle}
        onToggleMonitoring={() => setMonitoringStarted((v) => !v)}
        onEnterEdit={() => setMode('edit')}
        fitToScreen={fitToScreen}
        onToggleFit={handleToggleFit}
        onRename={handleRename}
        onSave={handleSave}
        isSaving={isSaving}
        onCancel={handleCancel}
        onOpenCatalog={() => setIsCatalogOpen(true)}
      />

      {mode === 'edit' ? (
        isEmpty ? (
          <EmptyCanvas onAddTemplate={handleAddTemplate} onAddCustom={() => setIsCatalogOpen(true)} />
        ) : (
          <DashboardCanvas dashboardId={dashboardId} widgets={widgets} editMode={true} onWidgetsChange={handleWidgetsChange} />
        )
      ) : isEmpty ? (
        <EmptyViewState canEdit={canEdit} onEnterEdit={() => setMode('edit')} />
      ) : (
        <DashboardCanvas
          dashboardId={dashboardId}
          widgets={widgets}
          editMode={false}
          widgetData={widgetData}
          onRequestPause={() => setMonitoringStarted(false)}
          fitToScreen={fitToScreen}
        />
      )}

      <WidgetCatalogDrawer open={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} onAddTemplate={handleAddTemplate} onAddCustom={handleAddCustom} />
    </div>
  );
}

function EmptyViewState({ canEdit, onEnterEdit }: { canEdit: boolean; onEnterEdit: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
      <svg viewBox="0 0 48 48" className="h-12 w-12 fill-none stroke-current text-[var(--color-bt-fg-muted)]" strokeWidth="1.5">
        <rect x="6" y="6" width="16" height="16" rx="2" />
        <rect x="26" y="6" width="16" height="10" rx="2" />
        <rect x="26" y="20" width="16" height="16" rx="2" />
        <rect x="6" y="26" width="16" height="10" rx="2" />
      </svg>
      <div className="text-center">
        <div className="text-[14px] font-semibold text-[var(--color-bt-fg)]">이 대시보드에 위젯이 없습니다</div>
        <p className="mt-1 text-[11.5px] text-[var(--color-bt-fg-muted)]">편집 모드로 들어가 위젯을 추가하세요.</p>
      </div>
      {canEdit && (
        <Button type="primary" onClick={onEnterEdit}>
          편집 모드로 전환
        </Button>
      )}
    </div>
  );
}
