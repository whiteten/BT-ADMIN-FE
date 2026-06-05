import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Dropdown, type MenuProps, Tag } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import { DOMAIN_LABELS, DOMAIN_TAG_COLOR, REPORT_ICON_SVG } from '../constants/reportIconConstants';
import { reportKeys, useDeleteReport } from '../hooks/useReportQueries';
import type { ReportIconType, ReportListItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface ReportCardProps {
  report: ReportListItem;
}

export default function ReportCard({ report }: ReportCardProps) {
  const navigate = useNavigate();
  const modal = useModal();
  const queryClient = useQueryClient();
  const iconType: ReportIconType = report.iconType ?? 'system';

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

  const handleView = () => navigate(`/insight/statistics/reports/view?reportId=${report.reportId}`);
  const handleEdit = () => navigate(`/insight/statistics/reports/${report.reportId}/edit`);
  const handleDelete = () => {
    modal.confirm.delete({
      onOk: () => deleteReport(report.reportId),
      options: {
        content: '보고서에 등록된 패널이 모두 함께 삭제됩니다. 그래도 삭제하시겠습니까?',
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
  ];

  const cardTitle = (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)]">
        {REPORT_ICON_SVG[iconType]}
      </span>
      <span className="cursor-pointer hover:!text-[var(--color-bt-primary)] truncate" onClick={handleView}>
        {report.title}
      </span>
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
          <Tag color={DOMAIN_TAG_COLOR[report.domain]}>
            {report.domain} · {DOMAIN_LABELS[report.domain] ?? report.domain}
          </Tag>
        </div>
        <div className="flex items-center">
          <span className="w-[80px] shrink-0 text-sm">데이터뷰</span>
          <span className="font-mono text-sm truncate">{report.datasetId}</span>
        </div>
        {report.description && (
          <div className="flex items-center">
            <span className="w-[80px] shrink-0 text-sm">설명</span>
            <span className="text-sm line-clamp-1">{report.description}</span>
          </div>
        )}
        <div className="flex items-center justify-end pt-1">
          <span className="text-xs text-gray-400 tabular-nums">{report.updatedAt ? dayjs(report.updatedAt).format('YYYY.MM.DD') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
