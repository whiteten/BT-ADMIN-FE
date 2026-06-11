import { Card } from 'antd';
import dayjs from 'dayjs';
import type { CampaignListItem } from '../types/campaign';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type CampaignCardProps = CampaignListItem & {
  onDetail?: (campaignId: string) => void;
  onDelete?: (campaignId: string) => void;
};

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');

export default function CampaignCard({ campaignId, campaignName, startDateTime, endDateTime, inUse, priority, workDateTime, onDetail, onDelete }: CampaignCardProps) {
  const title = (
    <span className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={() => onDetail?.(campaignId)}>
      {campaignName}
    </span>
  );

  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark" align="end">
        <DropdownMenuItem onClick={() => onDetail?.(campaignId)} className="hover:cursor-pointer">
          상세보기
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete?.(campaignId)} className="hover:cursor-pointer">
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card
      title={title}
      styles={{ header: { paddingRight: '0 20px 0 20px' }, body: { padding: '20px', paddingTop: '16px' } }}
      extra={extra}
      className="hover:!border-[var(--color-bt-primary)]"
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex">
          <span className="w-[104px]">캠페인ID</span>
          <span>{campaignId}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">캠페인</span>
          <span>{campaignName}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">시작일시</span>
          <span>{formatDateTime(startDateTime)}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">종료일시</span>
          <span>{formatDateTime(endDateTime)}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">사용여부</span>
          <span>{inUse ? '사용' : '미사용'}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">우선순위</span>
          <span>{priority}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">작업일시</span>
          <span>{formatDateTime(workDateTime)}</span>
        </div>
      </div>
    </Card>
  );
}
