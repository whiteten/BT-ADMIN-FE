import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DashboardHeader from '../../features/monitoring/components/DashboardHeader';
import DashboardCanvas from '../../features/monitoring/components/canvas/DashboardCanvas';
import EmptyCanvas from '../../features/monitoring/components/canvas/EmptyCanvas';
import { dashboardKeys, useDeleteWidget, useGetDashboard, useUpdateDashboard, useUpdateLayout } from '../../features/monitoring/hooks/useDashboardQueries';
import { useDashboardSocket } from '../../features/monitoring/hooks/useDashboardSocket';
import type { Widget } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

type Mode = 'view' | 'edit';

/**
 * 모니터링 대시보드 — View + Edit 통합 페이지.
 *
 * - View 모드(기본): ▶ 모니터링 시작 버튼이 캔버스 위에 오버레이로 노출되며, 누르면 WS 가 연결되어 실시간 데이터가 흐른다.
 *   다시 누르면 일시정지(WS 유지, 화면 갱신 정지)가 아닌 정지 → 카운트 초기화.
 * - Edit 모드: 헤더 [편집] 버튼으로 진입. WS 는 끊고 드래그/리사이즈/위젯 추가 활성. [저장]/[취소] 로 종료.
 * - `/edit` 라우트로 직접 진입한 경우(`location.state.initialMode === 'edit'`) 첫 마운트에서 바로 edit 모드.
 */
export default function DashboardView() {
  const { dashboardId: param } = useParams<{ dashboardId: string }>();
  const dashboardId = Number(param);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  // URL 마지막 세그먼트(/view 또는 /edit) + location.state.initialMode 로 진입 모드 결정
  // 위젯 위저드에서 돌아오는 경로(`/edit`)는 자연스럽게 edit 모드 유지
  const explicitInitialMode = (location.state as { initialMode?: Mode } | null)?.initialMode;
  const pathIsEdit = location.pathname.endsWith('/edit');
  const initialMode: Mode = explicitInitialMode ?? (pathIsEdit ? 'edit' : 'view');
  const [mode, setMode] = useState<Mode>(initialMode);

  const { data: dashboard, isLoading } = useGetDashboard({
    params: { dashboardId },
    queryOptions: { enabled: !!dashboardId, retry: false },
  });

  const initialWidgets = useMemo<Widget[]>(() => (dashboard?.widgets ?? []) as Widget[], [dashboard]);
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);

  useEffect(() => {
    setWidgets(initialWidgets);
  }, [initialWidgets]);

  // 모드에 따라 breadcrumb 마지막 segment 가 달라진다.
  //   view: … / 대시보드 / :dashboardName / 보기
  //   edit: … / 대시보드 / :dashboardName(→ /edit)
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

  // ── View 모드 — 모니터링 시작 여부 + 갱신 간격 ────────────────────
  const [monitoringStarted, setMonitoringStarted] = useState(false);
  const [refreshThrottle, setRefreshThrottle] = useState<1 | 3 | 5 | 10 | 'PAUSED'>(3);

  // 편집 모드로 진입하면 모니터링 중단
  useEffect(() => {
    if (mode === 'edit') setMonitoringStarted(false);
  }, [mode]);

  const { connectionState, widgetData } = useDashboardSocket({
    dashboardId,
    widgets,
    refreshThrottle,
    enabled: mode === 'view' && monitoringStarted,
  });

  // ── Mutations (Edit 모드용) ──────────────────────────────────
  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId).queryKey });
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

  // ── 로딩 / 미존재 ─────────────────────────────────────────────
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

  // ── 핸들러 ─────────────────────────────────────────────────────
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
    setWidgets(initialWidgets); // 미저장 변경 되돌리기
    setMode('view');
  };

  const handleRename = (next: string) => updateDashboard({ dashboardId, data: { dashboardName: next } });

  const handleWidgetsChange = (next: Widget[]) => {
    const removed = widgets.filter((prev) => !next.some((n) => n.widgetId === prev.widgetId));
    removed.forEach((w) => deleteWidget(w.widgetId));
    setWidgets(next);
  };

  const isEmpty = widgets.length === 0;
  const canEdit = true; // Phase 1 — BE 권한 구현 후 dashboard:edit 체크

  // ── 렌더 ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <DashboardHeader
        dashboard={dashboard}
        mode={mode}
        canEdit={canEdit}
        // View 모드
        monitoringStarted={monitoringStarted}
        connectionState={connectionState}
        refreshThrottle={refreshThrottle}
        onChangeRefreshThrottle={setRefreshThrottle}
        onToggleMonitoring={() => setMonitoringStarted((v) => !v)}
        onEnterEdit={() => setMode('edit')}
        // Edit 모드
        onRename={handleRename}
        onSave={handleSave}
        isSaving={isSaving}
        onCancel={handleCancel}
      />

      {/* 본문 — 모드별 분기 */}
      {mode === 'edit' ? (
        isEmpty ? (
          <EmptyCanvas dashboardId={dashboardId} />
        ) : (
          <DashboardCanvas dashboardId={dashboardId} widgets={widgets} editMode={true} onWidgetsChange={handleWidgetsChange} />
        )
      ) : isEmpty ? (
        <EmptyViewState canEdit={canEdit} onEnterEdit={() => setMode('edit')} />
      ) : (
        <DashboardCanvas dashboardId={dashboardId} widgets={widgets} editMode={false} widgetData={widgetData} onRequestPause={() => setMonitoringStarted(false)} />
      )}
    </div>
  );
}

// ─── View 모드 — 위젯 없을 때 안내 ────────────────────────────────
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
