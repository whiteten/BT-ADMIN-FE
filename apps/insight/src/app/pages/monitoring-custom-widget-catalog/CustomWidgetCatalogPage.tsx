import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { type BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CustomWidgetCatalogPanel from '../../features/monitoring/components/CustomWidgetCatalogPanel';
import DashboardEditorHeader from '../../features/monitoring/components/DashboardEditorHeader';
import { useGetDashboard } from '../../features/monitoring/hooks/useDashboardQueries';
import { getMockDashboardDetail } from '../../features/monitoring/mocks/mockDashboards';
import type { CustomWidgetCatalogItem } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function CustomWidgetCatalogPage() {
  const { dashboardId: param } = useParams<{ dashboardId: string }>();
  const dashboardId = Number(param);
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  // 카탈로그에서 추가된 위젯들 (검토용 — BE 미구현, 메모리상으로만)
  const [addedWidgets, setAddedWidgets] = useState<CustomWidgetCatalogItem[]>([]);

  const { data: fetched, isLoading } = useGetDashboard({
    params: { dashboardId },
    queryOptions: { enabled: !!dashboardId, retry: false },
  });
  const dashboard = useMemo(() => fetched ?? getMockDashboardDetail(dashboardId), [fetched, dashboardId]);

  useEffect(() => {
    if (dashboard) {
      const items: BreadcrumbProps['items'] = [
        { title: '인사이트' },
        { title: '모니터링' },
        { title: '대시보드', path: '/insight/monitoring/dashboards' },
        { title: dashboard.dashboardName, path: `/insight/monitoring/dashboards/${dashboardId}/edit` },
        { title: '+ 커스텀 위젯' },
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

  const handleAdd = (widget: CustomWidgetCatalogItem) => {
    setAddedWidgets((prev) => [...prev, widget]);
    // 실제 환경에서는 mutate로 BE 호출 → 캔버스에 추가
  };

  const handleClose = () => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit`);

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-bt-bg-canvas)]">
      <DashboardEditorHeader
        dashboard={dashboard}
        onSave={() => toast.success('대시보드가 저장되었습니다. (※ BE 미구현)')}
        onPreview={() => navigate(`/insight/monitoring/dashboards/${dashboardId}/view`)}
        onRename={(name) => toast.success(`이름이 "${name}"로 변경되었습니다. (※ BE 미구현)`)}
      />

      {/* 본문 — 좌 캔버스 placeholder + 우 카탈로그 패널 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌: 캔버스 (위젯 추가 시뮬레이션 — §7에서 본격 구현) */}
        <div className="flex-1 grid-pattern overflow-auto p-6">
          {addedWidgets.length === 0 ? (
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
              <p className="mt-1 text-[11px] text-[var(--color-bt-fg-muted)]">패널은 계속 열려 있어 여러 위젯을 연속으로 추가할 수 있습니다.</p>
            </div>
          ) : (
            <div>
              <div className="mb-3 text-[11px] text-[var(--color-bt-fg-muted)]">
                추가된 위젯 {addedWidgets.length}개 — 시안 §7 편집 모드에서 grid layout으로 배치됩니다 (다음 단계 구현)
              </div>
              <div className="grid grid-cols-3 gap-3">
                {addedWidgets.map((w, idx) => (
                  <div key={`${w.widgetTypeId}-${idx}`} className="rounded border-2 border-[var(--color-bt-primary)] bg-white shadow-sm p-3">
                    <div className="flex items-center gap-2 border-b border-[var(--color-bt-border)] pb-2 mb-2">
                      <span className="text-[12px] font-semibold truncate">{w.widgetName}</span>
                      <span className="ml-auto rounded bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5 mono text-[10px] font-bold text-[var(--color-bt-fg-muted)]">CUSTOM</span>
                    </div>
                    <p className="text-[10px] text-[var(--color-bt-fg-muted)] leading-snug line-clamp-3">{w.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 우: 카탈로그 패널 */}
        <CustomWidgetCatalogPanel domainCode={dashboard.domainCode} onAdd={handleAdd} onClose={handleClose} />
      </div>
    </div>
  );
}
