import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CustomWidgetCatalogPanel from '../../features/monitoring/components/CustomWidgetCatalogPanel';
import DashboardEditorHeader from '../../features/monitoring/components/DashboardEditorHeader';
import { dashboardKeys, useCreateWidget, useGetDashboard } from '../../features/monitoring/hooks/useDashboardQueries';
import type { CustomWidgetCatalogItem } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

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

  // 카탈로그에서 위젯 선택 → BE 생성 호출 → 성공 시 편집 화면으로 복귀.
  // 좌측 placeholder는 더 이상 사용 안 함 (실 DB 위젯은 편집 화면의 캔버스에서 렌더).
  const handleAdd = (widget: CustomWidgetCatalogItem) => {
    if (isCreating) return;
    createWidget({
      dashboardId,
      data: {
        kind: 'CUSTOM',
        widgetName: widget.widgetName,
        widgetTypeId: widget.widgetTypeId,
        options: widget.defaultOptions ?? {},
        position: { row: 0, col: 0, w: widget.minW ?? 4, h: widget.minH ?? 4 },
      },
    });
  };

  const handleClose = () => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit`);

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <DashboardEditorHeader dashboard={dashboard} onPreview={() => navigate(`/insight/monitoring/dashboards/${dashboardId}/view`)} />

      {/* 본문 — 좌: 안내 / 우: 카탈로그 패널 */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 grid-pattern overflow-auto p-6">
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <svg viewBox="0 0 48 48" className="mb-3 h-12 w-12 fill-none stroke-current text-[var(--color-bt-fg-muted)]" strokeWidth="1.5">
              <rect x="6" y="6" width="16" height="16" rx="2" />
              <rect x="26" y="6" width="16" height="10" rx="2" />
              <rect x="26" y="20" width="16" height="16" rx="2" />
              <rect x="6" y="26" width="16" height="10" rx="2" />
            </svg>
            <p className="text-[13px] text-[var(--color-bt-fg-muted)]">
              <strong>우측 카탈로그</strong>에서 위젯을 골라 [추가] 버튼을 누르세요.
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-bt-fg-muted)]">추가하면 편집 화면으로 돌아가 캔버스에 즉시 표시됩니다.</p>
          </div>
        </div>

        <CustomWidgetCatalogPanel domainCode={dashboard.domainCode} onAdd={handleAdd} onClose={handleClose} />
      </div>
    </div>
  );
}
