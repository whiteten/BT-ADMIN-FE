import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Dropdown, type MenuProps, Tag } from 'antd';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { REPORT_ICON_SVG } from '../constants/reportIconConstants';
import { reportKeys, useDeleteReport, useSetReportSystemFlag } from '../hooks/useReportQueries';
import type { ReportIconType, ReportListItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { cn } from '@/lib/utils';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface ReportRowProps {
  report: ReportListItem;
}

// 도메인 뱃지(antd Tag) 색과 동일한 조합 — 아이콘칩 배경/글자/테두리. 미정의 도메인은 primary fallback.
const DOMAIN_ICON_COLOR: Record<string, { bg: string; fg: string; border: string }> = {
  IE: { bg: '#e6f4ff', fg: '#1677ff', border: '#91caff' },
  IC: { bg: '#f6ffed', fg: '#389e0d', border: '#b7eb8f' },
  IR: { bg: '#fff7e6', fg: '#d46b08', border: '#ffd591' },
};

/**
 * 보고서 목록 행 — 좌측 필터 레일 + 행 리스트 레이아웃용.
 * 권한(편집/삭제/시스템 승격)·네비게이션 로직은 ReportCard 와 동일 정책을 따른다.
 */
export default function ReportRow({ report }: ReportRowProps) {
  const navigate = useNavigate();
  const modal = useModal();
  const queryClient = useQueryClient();
  const iconType: ReportIconType = report.iconType ?? 'system';

  // 등록자(소유자) 본인만 편집/삭제 가능. 시스템 장표는 모두 readonly — 시스템 관리자만 편집/삭제/승격.
  const myUserId = useAuthStore((s) => s.userInfo?.userId);
  const isSystemAdmin = useAuthStore((s) => s.userInfo?.isSystemAdmin ?? false);
  const isOwner = myUserId != null && String(report.ownerUserId) === String(myUserId);
  const canModify = isSystemAdmin || (isOwner && !report.isSystem);

  const { mutate: deleteReport } = useDeleteReport({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: reportKeys.list._def });
        toast.success('보고서가 삭제되었습니다.');
        navigate('/insight/statistics/reports');
      },
      onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
    },
  });

  const { mutate: setSystemFlag } = useSetReportSystemFlag({
    mutationOptions: {
      onSuccess: (_, { toSystem }) => {
        queryClient.invalidateQueries({ queryKey: reportKeys.list._def });
        toast.success(toSystem ? '시스템 장표로 승격되었습니다.' : '시스템 장표 승격이 해제되었습니다.');
      },
      onError: () => toast.error('처리 중 오류가 발생했습니다.'),
    },
  });

  const handleView = () => navigate(`/insight/statistics/reports/view?reportId=${report.reportId}`);
  const handleEdit = () => navigate(`/insight/statistics/reports/${report.reportId}/edit`);
  const handleDelete = () => {
    modal.confirm.delete({
      onOk: () => deleteReport(report.reportId),
      options: { content: '보고서에 등록된 패널이 모두 함께 삭제됩니다. 그래도 삭제하시겠습니까?' },
    });
  };
  const handleToggleSystem = () => {
    const toSystem = !report.isSystem;
    modal.confirm.execute({
      onOk: () => setSystemFlag({ reportId: report.reportId, toSystem }),
      options: {
        title: toSystem ? '시스템 장표 승격' : '시스템 장표 승격 해제',
        content: toSystem
          ? '시스템 장표로 승격하면 모든 사용자에게 노출되며, 수정/삭제는 관리자만 가능합니다. 계속하시겠습니까?'
          : '승격을 해제하면 등록자 소유의 일반 장표로 복귀합니다. 계속하시겠습니까?',
      },
    });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'view',
      label: '보기',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        handleView();
      },
    },
    ...(canModify
      ? ([
          {
            key: 'edit',
            label: '편집',
            onClick: ({ domEvent }) => {
              domEvent.stopPropagation();
              handleEdit();
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
        ] as NonNullable<MenuProps['items']>)
      : []),
    ...(isSystemAdmin
      ? ([
          { type: 'divider' },
          {
            key: 'toggle-system',
            label: report.isSystem ? '시스템 승격 해제' : '시스템 장표로 승격',
            onClick: ({ domEvent }) => {
              domEvent.stopPropagation();
              handleToggleSystem();
            },
          },
        ] as NonNullable<MenuProps['items']>)
      : []),
  ];

  const datasetNames = report.datasetNames ?? [];

  return (
    <div
      onClick={handleView}
      title={`${report.title} 열기`}
      className="group flex items-center gap-3 px-5 py-2.5 border-b border-[#e9ebec] cursor-pointer transition-colors hover:bg-[#f5f8fc]"
    >
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border"
        style={{
          background: DOMAIN_ICON_COLOR[report.domain]?.bg ?? 'var(--color-bt-primary-soft)',
          color: DOMAIN_ICON_COLOR[report.domain]?.fg ?? 'var(--color-bt-primary)',
          borderColor: DOMAIN_ICON_COLOR[report.domain]?.border ?? 'transparent',
        }}
      >
        {REPORT_ICON_SVG[iconType]}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-semibold group-hover:!text-[var(--color-bt-primary)]">{report.title}</span>
          {report.isSystem && (
            <Tag color="purple" className="!mb-0 !mr-0 shrink-0 !px-1 !py-0 !text-[10px] !leading-4">
              시스템
            </Tag>
          )}
        </div>
        <span className={cn('truncate text-xs', report.description ? 'text-[var(--color-bt-fg-muted)]' : 'italic text-gray-300')}>{report.description || '설명 없음'}</span>
        {datasetNames.length > 0 && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {datasetNames.slice(0, 3).map((name) => (
              <span key={name} className="inline-flex h-[18px] items-center rounded border border-[#e9ebec] bg-[#f3f5f7] px-1.5 text-[11px] text-[var(--color-bt-fg-muted)]">
                {name}
              </span>
            ))}
            {datasetNames.length > 3 && <span className="text-[11px] text-[var(--color-bt-fg-muted)]">외 {datasetNames.length - 3}</span>}
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
