import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, Tag } from 'antd';
import { toast } from '@/shared-util';
import { DOMAIN_LABELS } from '../constants/monitoringConstants';
import { dashboardKeys, useDeleteDashboard } from '../hooks/useDashboardQueries';
import type { DashboardListItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface DashboardCardProps {
  dashboard: DashboardListItem;
}

/**
 * 대시보드 카드 — AgentCard / RoleCard 와 동일 패턴.
 * Card 자체 클릭으로 진입 (메뉴 등록 → 보기 · 초안 → 편집).
 */
export default function DashboardCard({ dashboard }: DashboardCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();

  const { mutate: deleteDashboard } = useDeleteDashboard({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: dashboardKeys.list._def });
        toast.success('대시보드가 삭제되었습니다.');
      },
      onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
    },
  });

  const handleView = () => navigate(`/insight/monitoring/dashboards/${dashboard.dashboardId}/view`);
  const handleEdit = () => navigate(`/insight/monitoring/dashboards/${dashboard.dashboardId}/edit`);
  // 기본은 항상 플레이(view) 진입. 편집은 Dropdown 메뉴 또는 view 화면의 [편집] 버튼으로.
  const handleCardClick = handleView;
  const handleDelete = () =>
    modal.confirm.delete({
      onOk: () => deleteDashboard(dashboard.dashboardId),
    });

  const domainLabel = DOMAIN_LABELS[dashboard.domainCode];

  const title = (
    <span
      className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]"
      onClick={(e) => {
        e.stopPropagation();
        handleCardClick();
      }}
    >
      {dashboard.dashboardName}
    </span>
  );

  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem className="hover:cursor-pointer" onClick={handleView}>
          ▶ 플레이
        </DropdownMenuItem>
        <DropdownMenuItem className="hover:cursor-pointer" onClick={handleEdit}>
          편집
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="hover:cursor-pointer text-[var(--color-bt-danger)] focus:text-[var(--color-bt-danger)]" onClick={handleDelete}>
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card
      title={title}
      extra={extra}
      hoverable
      styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px' } }}
      className="hover:!border-[var(--color-bt-primary)] hover:cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex items-center">
          <span className="w-[90px] text-gray-500">도메인</span>
          <Tag color="blue" className="font-mono text-xs">
            {dashboard.domainCode} · {domainLabel}
          </Tag>
        </div>
        <div className="flex items-center">
          <span className="w-[90px] text-gray-500">상태</span>
          {dashboard.menuRegistered ? <Tag color="green">메뉴 등록</Tag> : <Tag color="orange">초안</Tag>}
        </div>
        <div className="flex">
          <span className="w-[90px] text-gray-500 shrink-0">설명</span>
          <span className="flex-1 truncate text-gray-700" title={dashboard.description ?? undefined}>
            {dashboard.description || <span className="text-gray-300">-</span>}
          </span>
        </div>
      </div>
    </Card>
  );
}
