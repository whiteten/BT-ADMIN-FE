import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'antd';
import { Plus } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { templateWidgetApi } from '../../features/monitoring/api/templateWidgetApi';
import DashboardHeader from '../../features/monitoring/components/DashboardHeader';
import DashboardCanvas from '../../features/monitoring/components/canvas/DashboardCanvas';
import EmptyCanvas from '../../features/monitoring/components/canvas/EmptyCanvas';
import LayoutPickerModal from '../../features/monitoring/components/canvas/LayoutPickerModal';
import WidgetLibraryModal from '../../features/monitoring/components/canvas/WidgetLibraryModal';
import { DrilldownProvider } from '../../features/monitoring/components/drilldown/DrilldownProvider';
import {
  dashboardKeys,
  useCreateWidget,
  useDeleteWidget,
  useGetCustomWidgetCatalog,
  useGetDashboard,
  useUpdateDashboard,
  useUpdateLayout,
} from '../../features/monitoring/hooks/useDashboardQueries';
import { useDashboardSocket } from '../../features/monitoring/hooks/useDashboardSocket';
import { useWidgetUserSettingsMap } from '../../features/monitoring/hooks/useWidgetSettingQueries';
import type { CustomWidgetCatalogItem, TemplateWidgetDefinitionListItem, TemplateWidgetMapping, Widget } from '../../features/monitoring/types';
import { autoPackPosition } from '../../features/monitoring/utils/autoPackPosition';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

type Mode = 'view' | 'edit';

/**
 * 모니터링 대시보드 — View + Edit 통합 페이지.
 */
export default function DashboardView() {
  const { dashboardId: param } = useParams<{ dashboardId: string }>();
  const [searchParams] = useSearchParams();
  // 메뉴 등록 경로(.../dashboards/view?dashboardId=N)는 path 파라미터가 없으므로 쿼리스트링도 함께 본다.
  const dashboardId = Number(param ?? searchParams.get('dashboardId') ?? '');
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const explicitInitialMode = (location.state as { initialMode?: Mode } | null)?.initialMode;
  const pathIsEdit = location.pathname.endsWith('/edit');
  const initialMode: Mode = explicitInitialMode ?? (pathIsEdit ? 'edit' : 'view');
  const [mode, setMode] = useState<Mode>(initialMode);

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLayoutPickerOpen, setIsLayoutPickerOpen] = useState(false);
  const [replacingWidgetId, setReplacingWidgetId] = useState<number | null>(null);

  const { data: dashboard, isLoading } = useGetDashboard({
    params: { dashboardId },
    queryOptions: { enabled: !!dashboardId, retry: false },
  });

  const initialWidgets = useMemo<Widget[]>(() => (dashboard?.widgets ?? []) as Widget[], [dashboard]);
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);

  // 커스텀 위젯 카탈로그 → widgetTypeId별 최소 크기 맵 (그리드 리사이즈 최소값 가드용).
  const { data: customCatalog } = useGetCustomWidgetCatalog();
  const customMinSize = useMemo<Record<string, { minW: number; minH: number }>>(() => {
    const map: Record<string, { minW: number; minH: number }> = {};
    for (const c of customCatalog ?? []) {
      map[c.widgetTypeId] = { minW: c.minW, minH: c.minH };
    }
    return map;
  }, [customCatalog]);

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

  const [monitoringStarted, setMonitoringStarted] = useState(initialMode === 'view');
  const [refreshThrottle, setRefreshThrottle] = useState<1 | 3 | 5 | 10 | 'PAUSED'>(3);

  const rootRef = useRef<HTMLDivElement>(null);

  // 화면 맞춤(fitToScreen) 토글은 제거됨 — 캔버스가 항상 12 row를 컨테이너 100%로 스케일링한다.
  // 별도 플래그·DB 컬럼 없음. 자세한 정책은 DashboardCanvas + utils/autoPackPosition 참조.

  /** OS/브라우저 수준의 전체 화면 토글 (선택 사항) */
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen?.().catch((e) => console.warn('fullscreen request failed', e));
    } else {
      document.exitFullscreen?.().catch((e) => console.warn('exit fullscreen failed', e));
    }
  };

  useEffect(() => {
    if (mode === 'edit') {
      setMonitoringStarted(false);
      // 편집 모드 진입 시 OS 전체화면은 가급적 해제 (필요 시)
      if (document.fullscreenElement) document.exitFullscreen?.().catch((e) => console.warn('exit fullscreen failed', e));
    } else {
      // 뷰 모드 진입 시 모니터링을 즉시 시작 (페이지 접근 즉시 폴링).
      setMonitoringStarted(true);
      setIsLibraryOpen(false);
      setIsLayoutPickerOpen(false);
      setReplacingWidgetId(null);
    }
  }, [mode]);

  const customWidgetIds = useMemo(() => widgets.filter((w) => w.kind === 'CUSTOM').map((w) => w.widgetId), [widgets]);
  const widgetUserSettings = useWidgetUserSettingsMap(customWidgetIds);

  const { connectionState, widgetData, subscribeAdhoc, unsubscribeAdhoc } = useDashboardSocket({
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

  const { mutate: updateLayout, isPending: isSavingLayout } = useUpdateLayout({
    mutationOptions: {
      onSuccess: () => {
        invalidateDetail();
      },
    },
  });

  const { mutate: updateDashboard, isPending: isSavingDashboard } = useUpdateDashboard({
    mutationOptions: {
      onSuccess: () => {
        invalidateDetail();
        queryClient.invalidateQueries({ queryKey: dashboardKeys.list._def });
      },
    },
  });

  const isSaving = isSavingLayout || isSavingDashboard;

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
        setIsLibraryOpen(false);
        setReplacingWidgetId(null);
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

    // 레이아웃(위젯 위치/크기)만 저장. 대시보드 속성은 별도 액션(이름 변경 등) 시 저장.
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

    toast.success('대시보드가 저장되었습니다.');
    setMode('view');
  };

  const handleCancel = () => {
    setWidgets(initialWidgets);
    setMode('view');
  };

  const handleRename = (next: string) => {
    updateDashboard({
      dashboardId,
      data: { dashboardName: next },
    });
    toast.success('이름이 변경되었습니다.');
  };

  const handleWidgetsChange = (next: Widget[]) => {
    const removed = widgets.filter((prev) => prev.widgetId > 0 && !next.some((n) => n.widgetId === prev.widgetId));
    removed.forEach((w) => deleteWidget(w.widgetId));
    setWidgets(next);
  };

  // 저장된 템플릿 위젯 정의를 골라 대시보드 인스턴스(kind=TEMPLATE)로 배치.
  const handleAddTemplate = async (def: TemplateWidgetDefinitionListItem) => {
    if (isCreating) return;
    // 매핑은 상세에만 있으므로 선택 시 상세를 조회해 인스턴스로 복제.
    const detail = await templateWidgetApi.getDetail(def.templateWidgetId);

    const targetWidget = replacingWidgetId ? widgets.find((w) => w.widgetId === replacingWidgetId) : null;
    const defaultW = detail.layoutW ?? 6;
    const defaultH = detail.layoutH ?? 6;
    const basePosition = targetWidget ? targetWidget.position : { row: 0, col: 0, w: defaultW, h: defaultH };
    const position = {
      ...basePosition,
      w: Math.max(basePosition.w, detail.layoutW ?? 1),
      h: Math.max(basePosition.h, detail.layoutH ?? 1),
    };

    createWidget({
      dashboardId,
      data: {
        kind: 'TEMPLATE',
        widgetName: detail.widgetName,
        datasetId: detail.datasetId,
        visualizations: detail.visualizations,
        defaultViz: detail.defaultViz,
        mapping: (detail.mapping ?? {}) as TemplateWidgetMapping,
        refreshInterval: detail.refreshInterval ?? 3,
        position,
      },
    });

    if (replacingWidgetId) {
      setWidgets((prev) => prev.filter((w) => w.widgetId !== replacingWidgetId));
    }
  };

  const handleAddCustom = (catalogItem: CustomWidgetCatalogItem) => {
    if (isCreating) return;

    const targetWidget = replacingWidgetId ? widgets.find((w) => w.widgetId === replacingWidgetId) : null;
    const basePosition = targetWidget ? targetWidget.position : { row: 0, col: 0, w: catalogItem.minW ?? 4, h: catalogItem.minH ?? 4 };
    // 패널을 위젯 최소 크기(MIN_W/MIN_H)보다 작게 그린 경우 최소 크기로 자동 보정.
    const position = {
      ...basePosition,
      w: Math.max(basePosition.w, catalogItem.minW ?? 1),
      h: Math.max(basePosition.h, catalogItem.minH ?? 1),
    };

    createWidget({
      dashboardId,
      data: {
        kind: 'CUSTOM',
        widgetName: catalogItem.widgetName,
        widgetTypeId: catalogItem.widgetTypeId,
        options: catalogItem.defaultOptions ?? {},
        position,
      },
    });

    if (replacingWidgetId) {
      setWidgets((prev) => prev.filter((w) => w.widgetId !== replacingWidgetId));
    }
  };

  const handleLayoutSelect = (rows: number, cols: number) => {
    if (rows === 0 && cols === 0) {
      setIsLayoutPickerOpen(true);
      return;
    }
    const nextWidgets: Widget[] = [];
    const itemW = 12 / cols;
    const itemH = 12 / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        nextWidgets.push({
          widgetId: -(Date.now() + r * 10 + c),
          dashboardId,
          widgetName: `영역 ${r * cols + c + 1}`,
          kind: 'PLACEHOLDER',
          position: {
            row: r * itemH,
            col: c * itemW,
            w: itemW,
            h: itemH,
          },
        });
      }
    }
    setWidgets(nextWidgets);
  };

  const handleAddSlotSelect = (w: number, h: number) => {
    // 12 row 안에 빈 자리가 있으면 거기에, 없으면 row 12+ (화면 밖)로 누적 — 컨테이너 overflow-y-auto로 스크롤 가능.
    const vacant = autoPackPosition(widgets, { minW: 1, minH: 1 }, { w, h });
    const newId = -Date.now();
    setWidgets((prev) => [
      ...prev,
      {
        widgetId: newId,
        dashboardId,
        widgetName: '새 영역',
        kind: 'PLACEHOLDER',
        position: vacant,
      },
    ]);
  };

  const handleAddWidgetAt = (widgetId: number) => {
    setReplacingWidgetId(widgetId);
    setIsLibraryOpen(true);
  };

  const isEmpty = widgets.length === 0;
  const canEdit = true;

  return (
    <DrilldownProvider subscribeAdhoc={subscribeAdhoc} unsubscribeAdhoc={unsubscribeAdhoc} widgetData={widgetData}>
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
          onRename={handleRename}
          onSave={handleSave}
          isSaving={isSaving}
          onCancel={handleCancel}
          onAddSlot={() => setIsLayoutPickerOpen(true)}
        />

        {mode === 'edit' ? (
          <DashboardCanvas
            dashboardId={dashboardId}
            widgets={widgets}
            editMode={true}
            onWidgetsChange={handleWidgetsChange}
            onAddWidgetAt={handleAddWidgetAt}
            customMinSize={customMinSize}
            widgetUserSettings={widgetUserSettings}
          >
            {isEmpty && (
              <div className="mt-4 flex flex-col gap-4">
                <EmptyCanvas onLayoutSelect={handleLayoutSelect} />
              </div>
            )}
          </DashboardCanvas>
        ) : isEmpty ? (
          <EmptyViewState canEdit={canEdit} onEnterEdit={() => setMode('edit')} />
        ) : (
          <DashboardCanvas
            dashboardId={dashboardId}
            widgets={widgets}
            editMode={false}
            widgetData={widgetData}
            onRequestPause={() => setMonitoringStarted(false)}
            customMinSize={customMinSize}
            widgetUserSettings={widgetUserSettings}
          />
        )}

        <WidgetLibraryModal open={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onAddTemplate={handleAddTemplate} onAddCustom={handleAddCustom} />
        <LayoutPickerModal open={isLayoutPickerOpen} onClose={() => setIsLayoutPickerOpen(false)} onSelect={handleAddSlotSelect} />
      </div>
    </DrilldownProvider>
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
