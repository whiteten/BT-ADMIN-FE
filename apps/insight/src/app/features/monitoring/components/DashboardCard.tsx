import { useNavigate } from 'react-router-dom';
import { Card } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import { DOMAIN_COLOR_CLASS, DOMAIN_LABELS } from '../constants/monitoringConstants';
import { useDeleteDashboard } from '../hooks/useDashboardQueries';
import type { DashboardListItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface DashboardCardProps {
  dashboard: DashboardListItem;
}

export default function DashboardCard({ dashboard }: DashboardCardProps) {
  const navigate = useNavigate();
  const modal = useModal();

  const { mutate: deleteDashboard } = useDeleteDashboard({
    mutationOptions: {
      onSuccess: () => toast.success('대시보드가 삭제되었습니다.'),
      onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
    },
  });

  const handleView = () => navigate(`/insight/monitoring/dashboards/${dashboard.dashboardId}/view`);
  const handleEdit = () => navigate(`/insight/monitoring/dashboards/${dashboard.dashboardId}/edit`);
  const handleDelete = () =>
    modal.confirm.delete({
      onOk: () => deleteDashboard(dashboard.dashboardId),
    });

  const totalWidgets = dashboard.templateWidgetCount + dashboard.customWidgetCount;

  const cardTitle = (
    <div className="flex items-center gap-2 min-w-0">
      {/* 도메인 뱃지 */}
      <span className={`shrink-0 rounded px-1.5 py-0.5 mono text-[10px] font-bold ${DOMAIN_COLOR_CLASS[dashboard.domainCode]}`}>{dashboard.domainCode}</span>

      {/* 상태 뱃지 */}
      {dashboard.menuRegistered ? (
        <span className="shrink-0 rounded bg-[var(--color-bt-success-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-bt-success)]">메뉴 등록</span>
      ) : (
        <span className="shrink-0 rounded bg-[var(--color-bt-warn-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-bt-warn)]">초안</span>
      )}

      {/* 실시간 인디케이터 — 메뉴 등록된 대시보드만 */}
      {dashboard.menuRegistered && (
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[var(--color-bt-fg-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-bt-success)] pulse-dot" />
          실시간
        </span>
      )}
    </div>
  );

  const cardExtra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleView();
          }}
        >
          보기
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit();
          }}
        >
          편집
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-[var(--color-bt-danger)] focus:text-[var(--color-bt-danger)]"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
        >
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card
      size="small"
      hoverable
      title={cardTitle}
      extra={cardExtra}
      className="!border-[var(--color-bt-border)] hover:!border-[var(--color-bt-primary)] transition-colors"
      styles={{ body: { padding: 0 } }}
    >
      <div className="flex flex-col gap-2 px-4 py-3 cursor-pointer" onClick={dashboard.menuRegistered ? handleView : handleEdit}>
        {/* 이름 */}
        <div className="text-[14px] font-semibold text-[var(--color-bt-fg)] truncate">{dashboard.dashboardName}</div>

        {/* 위젯 카운트 */}
        <p className="text-[10.5px] text-[var(--color-bt-fg-muted)] leading-snug">
          {totalWidgets > 0 ? (
            <>
              템플릿 {dashboard.templateWidgetCount} · 커스텀 {dashboard.customWidgetCount} <span className="font-semibold text-[var(--color-bt-fg)]">= 위젯 {totalWidgets}개</span>
            </>
          ) : (
            <span className="italic">위젯 없음 — 클릭해 추가</span>
          )}
        </p>

        {/* 메타 푸터 */}
        <div className="flex items-center justify-between text-[10px] text-[var(--color-bt-fg-muted)]">
          <span className="mono">
            {dashboard.layoutWidth}W × {dashboard.layoutHeight}H
          </span>
          <span>{dayjs(dashboard.updatedAt).format('YYYY-MM-DD')}</span>
        </div>
      </div>

      {/* 열기 버튼 */}
      <div className="border-t border-[var(--color-bt-border)] px-3 py-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (dashboard.menuRegistered) handleView();
            else handleEdit();
          }}
          className="w-full rounded bg-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-hover)] text-white text-[12px] font-medium py-1.5 transition-colors"
        >
          {dashboard.menuRegistered ? '열기' : '편집 계속'}
        </button>
      </div>
    </Card>
  );
}
