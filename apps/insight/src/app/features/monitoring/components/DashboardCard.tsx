import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Dropdown, type MenuProps, Tag } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import { DASHBOARD_ICON_SVG, DEFAULT_DASHBOARD_ICON } from '../constants/dashboardIconConstants';
import { DOMAIN_LABELS, DOMAIN_TAG_COLOR } from '../constants/monitoringConstants';
import { dashboardKeys, useDeleteDashboard } from '../hooks/useDashboardQueries';
import type { DashboardListItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface DashboardCardProps {
  dashboard: DashboardListItem;
}

/**
 * 대시보드 카드 — 통계 보고서(ReportCard) 와 동일한 데이터 구성·스타일.
 * Card 자체 클릭으로 진입 (항상 플레이/보기). 편집은 Dropdown 메뉴로.
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
  const handleEditInfo = () => navigate(`/insight/monitoring/dashboards/${dashboard.dashboardId}/edit-info`);
  const handleDelete = () =>
    modal.confirm.delete({
      onOk: () => deleteDashboard(dashboard.dashboardId),
    });

  const domainLabel = DOMAIN_LABELS[dashboard.domainCode] ?? dashboard.domainCode;

  const menuItems: MenuProps['items'] = [
    {
      key: 'view',
      label: '▶ 플레이',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        handleView();
      },
    },
    {
      key: 'edit',
      label: '화면 편집',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        handleEdit();
      },
    },
    {
      key: 'edit-info',
      label: '정보 편집',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        handleEditInfo();
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: '삭제',
      danger: true,
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        handleDelete();
      },
    },
  ];

  const cardTitle = (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)]">
        {DASHBOARD_ICON_SVG[dashboard.iconType ?? DEFAULT_DASHBOARD_ICON]}
      </span>
      <span className="cursor-pointer hover:!text-[var(--color-bt-primary)] truncate" onClick={handleView}>
        {dashboard.dashboardName}
      </span>
      <Tag color={dashboard.menuRegistered ? 'green' : 'orange'} className="!mb-0 !mr-0 !text-[10px] !px-1 !py-0 !leading-4 shrink-0">
        {dashboard.menuRegistered ? '메뉴 등록' : '초안'}
      </Tag>
    </div>
  );

  const cardExtra = (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <Button type="text" size="small" icon={<IconMoreVertical />} onClick={(e) => e.stopPropagation()} />
    </Dropdown>
  );

  return (
    <Card
      title={cardTitle}
      extra={cardExtra}
      styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px' } }}
      className="hover:!border-[var(--color-bt-primary)] cursor-pointer"
      onClick={handleView}
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex items-center">
          <span className="w-[80px] shrink-0 text-sm">도메인</span>
          <Tag color={DOMAIN_TAG_COLOR[dashboard.domainCode]}>
            {dashboard.domainCode} · {domainLabel}
          </Tag>
        </div>
        <div className="flex items-center">
          <span className="w-[80px] shrink-0 text-sm">위젯</span>
          <span className="text-sm truncate" title={dashboard.widgetNames?.join(', ')}>
            {dashboard.widgetNames && dashboard.widgetNames.length > 0
              ? dashboard.widgetNames.length > 1
                ? `${dashboard.widgetNames[0]} 외 ${dashboard.widgetNames.length - 1}개`
                : dashboard.widgetNames[0]
              : '-'}
          </span>
        </div>
        {dashboard.description && (
          <div className="flex items-center">
            <span className="w-[80px] shrink-0 text-sm">설명</span>
            <span className="text-sm line-clamp-1">{dashboard.description}</span>
          </div>
        )}
        <div className="flex items-center justify-end pt-1">
          <span className="text-xs text-gray-400 tabular-nums">{dashboard.updatedAt ? dayjs(dashboard.updatedAt).format('YYYY.MM.DD') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
