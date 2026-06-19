import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Dropdown, type MenuProps, Tag, Tooltip } from 'antd';
import { toast } from '@/shared-util';
import { DASHBOARD_ICON_SVG, DEFAULT_DASHBOARD_ICON } from '../constants/dashboardIconConstants';
import { dashboardKeys, useDeleteDashboard } from '../hooks/useDashboardQueries';
import type { DashboardIconType, DashboardListItem } from '../types';
import { Highlight } from '@/components/custom/Highlight';
import { IconMoreVertical } from '@/components/custom/Icons';
import { cn } from '@/lib/utils';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface DashboardRowProps {
  dashboard: DashboardListItem;
  /** 검색어 — 제목 매치 글자 하이라이트(통합검색과 동일). 미전달 시 강조 없음. */
  query?: string;
}

// 도메인 뱃지(antd Tag) 색과 동일한 조합 — 아이콘칩 배경/글자/테두리. 미정의 도메인은 primary fallback.
const DOMAIN_ICON_COLOR: Record<string, { bg: string; fg: string; border: string }> = {
  IE: { bg: '#e6f4ff', fg: '#1677ff', border: '#91caff' },
  IC: { bg: '#f6ffed', fg: '#389e0d', border: '#b7eb8f' },
  IR: { bg: '#fff7e6', fg: '#d46b08', border: '#ffd591' },
};

/**
 * 대시보드 목록 행 — 좌측 필터 레일 + 행 리스트 레이아웃용 (보고서 ReportRow 와 동일 패턴).
 * 클릭 시 플레이(view) 진입. 편집/삭제는 우측 점3개 드롭다운.
 */
export default function DashboardRow({ dashboard, query }: DashboardRowProps) {
  const navigate = useNavigate();
  const modal = useModal();
  const queryClient = useQueryClient();
  const iconType: DashboardIconType = dashboard.iconType ?? DEFAULT_DASHBOARD_ICON;

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

  const widgetNames = dashboard.widgetNames ?? [];

  return (
    <div
      onClick={handleView}
      title={`${dashboard.dashboardName} 열기`}
      className="group flex items-center gap-3 px-5 py-2.5 border-b border-[#e9ebec] cursor-pointer transition-colors hover:bg-[#f5f8fc]"
    >
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border"
        style={{
          background: DOMAIN_ICON_COLOR[dashboard.domainCode]?.bg ?? 'var(--color-bt-primary-soft)',
          color: DOMAIN_ICON_COLOR[dashboard.domainCode]?.fg ?? 'var(--color-bt-primary)',
          borderColor: DOMAIN_ICON_COLOR[dashboard.domainCode]?.border ?? 'transparent',
        }}
      >
        {DASHBOARD_ICON_SVG[iconType]}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-semibold group-hover:!text-[var(--color-bt-primary)]">
            <Highlight text={dashboard.dashboardName} query={query ?? ''} />
          </span>
          {dashboard.menuRegistered ? (
            <Tag color="green" className="!mb-0 !mr-0 shrink-0 !px-1 !py-0 !text-[10px] !leading-4">
              메뉴 등록
            </Tag>
          ) : (
            <Tag color="orange" className="!mb-0 !mr-0 shrink-0 !px-1 !py-0 !text-[10px] !leading-4">
              초안
            </Tag>
          )}
        </div>
        <span className={cn('truncate text-xs', dashboard.description ? 'text-[var(--color-bt-fg-muted)]' : 'italic text-gray-300')}>{dashboard.description || '설명 없음'}</span>
        {widgetNames.length > 0 && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {widgetNames.slice(0, 3).map((name) => (
              <span key={name} className="inline-flex h-[18px] items-center rounded border border-[#e9ebec] bg-[#f3f5f7] px-1.5 text-[11px] text-[var(--color-bt-fg-muted)]">
                {name}
              </span>
            ))}
            {widgetNames.length > 3 && (
              <Tooltip
                title={
                  <div className="flex flex-col gap-0.5 py-0.5">
                    {widgetNames.slice(3).map((n) => (
                      <span key={n}>{n}</span>
                    ))}
                  </div>
                }
              >
                <span className="cursor-help text-[11px] text-[var(--color-bt-fg-muted)]">외 {widgetNames.length - 3}</span>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
        <Button
          type="text"
          size="small"
          icon={<IconMoreVertical className="block size-4" />}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 [&_.ant-btn-icon]:flex [&_.ant-btn-icon]:items-center [&_.ant-btn-icon]:justify-center"
        />
      </Dropdown>
    </div>
  );
}
