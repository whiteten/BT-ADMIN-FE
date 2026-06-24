import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Dropdown, type MenuProps, Tag } from 'antd';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { REPORT_ICON_SVG } from '../constants/reportIconConstants';
import { reportKeys, useDeleteReport, useSetReportSystemFlag } from '../hooks/useReportQueries';
import type { ReportIconType, ReportListItem } from '../types';
import { Highlight } from '@/components/custom/Highlight';
import { IconMoreVertical } from '@/components/custom/Icons';
import { cn } from '@/lib/utils';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface ReportRowProps {
  report: ReportListItem;
  /** 검색어 — 제목 매치 글자 하이라이트(통합검색과 동일). 미전달 시 강조 없음. */
  query?: string;
  /** 메뉴(QuerySelector)에 등록된 보고서인지 — 등록본은 관리자만 삭제/공유 해제 가능(죽은 메뉴 참조 방지). */
  isMenuRegistered?: boolean;
}

/**
 * 보고서 목록 행 — 좌측 필터 레일 + 행 리스트 레이아웃용.
 * 권한(편집/삭제/화면 공유)·네비게이션 로직은 ReportCard 와 동일 정책을 따른다.
 */
export default function ReportRow({ report, query, isMenuRegistered = false }: ReportRowProps) {
  const navigate = useNavigate();
  const modal = useModal();
  const queryClient = useQueryClient();
  const iconType: ReportIconType = report.iconType ?? 'system';

  // 수정/삭제: 소유자 본인 또는 시스템 관리자(공유 여부 무관). 공유 토글: 소유자 또는 관리자.
  // 시드/시스템 장표는 소유자가 시스템 계정이라 일반 사용자에겐 자동으로 관리자 전용.
  const myUserId = useAuthStore((s) => s.userInfo?.userId);
  const isSystemAdmin = useAuthStore((s) => s.userInfo?.isSystemAdmin ?? false);
  const isOwner = myUserId != null && String(report.ownerUserId) === String(myUserId);
  const canModify = isSystemAdmin || isOwner;
  // 메뉴 등록본은 관리자만 삭제(죽은 메뉴 참조 방지)
  const canDelete = canModify && (isSystemAdmin || !isMenuRegistered);
  const canShare = isOwner || isSystemAdmin;

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
        toast.success(toSystem ? '화면을 공유했습니다.' : '화면 공유를 해제했습니다.');
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
        title: toSystem ? '화면 공유' : '화면 공유 해제',
        content: toSystem
          ? '공유하면 같은 테넌트의 모든 사용자가 이 보고서를 볼 수 있습니다. 수정·삭제는 소유자와 관리자만 가능합니다. 계속하시겠습니까?'
          : '공유를 해제하면 소유자 본인에게만 보이도록 되돌립니다. 계속하시겠습니까?',
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
        ] as NonNullable<MenuProps['items']>)
      : []),
    ...(canDelete
      ? ([
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
    ...(canShare
      ? ([
          { type: 'divider' },
          {
            key: 'toggle-system',
            label: report.isSystem ? '화면 공유 해제' : '화면 공유',
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
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-transparent"
        style={{ background: 'var(--color-bt-primary-soft)', color: 'var(--color-bt-primary)' }}
      >
        {REPORT_ICON_SVG[iconType]}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-semibold group-hover:!text-[var(--color-bt-primary)]">
            <Highlight text={report.title} query={query ?? ''} />
          </span>
          {report.isSystem && (
            <Tag color="purple" className="!mb-0 !mr-0 shrink-0 !px-1 !py-0 !text-[10px] !leading-4">
              공유
            </Tag>
          )}
        </div>
        <span className={cn('truncate text-xs', report.description ? 'text-[var(--color-bt-fg-muted)]' : 'italic text-gray-300')}>{report.description || '설명 없음'}</span>
        {/* 칩 영역은 항상 고정 높이로 예약 — 칩 유무에 따른 행 높이 들쭉날쭉 방지 */}
        <div className="mt-0.5 flex h-[18px] items-center gap-1 overflow-hidden">
          {datasetNames.slice(0, 3).map((name) => (
            <span key={name} className="inline-flex h-[18px] shrink-0 items-center rounded border border-[#e9ebec] bg-[#f3f5f7] px-1.5 text-[11px] text-[var(--color-bt-fg-muted)]">
              {name}
            </span>
          ))}
          {datasetNames.length > 3 && <span className="shrink-0 text-[11px] text-[var(--color-bt-fg-muted)]">외 {datasetNames.length - 3}</span>}
        </div>
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
