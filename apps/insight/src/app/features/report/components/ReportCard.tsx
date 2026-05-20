import { useNavigate } from 'react-router-dom';
import { Card, Tag } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import { DOMAIN_LABELS, REPORT_ICON_SVG } from '../constants/reportIconConstants';
import { useDeleteReport } from '../hooks/useReportQueries';
import type { DomainCode, ReportIconType, ReportListItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface ReportCardProps {
  report: ReportListItem;
}

const DOMAIN_TAG_COLOR: Record<DomainCode, string> = {
  IE: 'blue',
  IC: 'green',
  IR: 'orange',
};

export default function ReportCard({ report }: ReportCardProps) {
  const navigate = useNavigate();
  const modal = useModal();
  const iconType: ReportIconType = report.iconType ?? 'system';

  const { mutate: deleteReport } = useDeleteReport({
    mutationOptions: {
      onSuccess: () => toast.success('보고서가 삭제되었습니다.'),
      onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
    },
  });

  const handleView = () => navigate(`/insight/statistics/reports/${report.reportId}/view`);
  const handleEdit = () => navigate(`/insight/statistics/reports/${report.reportId}/edit`);
  const handleDelete = () => modal.confirm.delete({ onOk: () => deleteReport(report.reportId) });

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onClick={handleView}>
          보기
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleEdit}>
          편집
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleDelete}>
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
          <span className="font-mono text-sm truncate">{report.datasourceKey}</span>
        </div>
        {report.description && (
          <div className="flex items-center">
            <span className="w-[80px] shrink-0 text-sm">설명</span>
            <span className="text-sm line-clamp-1">{report.description}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          {report.isPublished ? <Tag color="success">메뉴 등록</Tag> : <Tag color="default">미등록</Tag>}
          <span className="text-xs text-gray-400 tabular-nums">{report.updatedAt ? dayjs(report.updatedAt).format('YYYY.MM.DD') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
