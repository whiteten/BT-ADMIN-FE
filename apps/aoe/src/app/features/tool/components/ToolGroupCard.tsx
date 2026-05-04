import { Card } from 'antd';
import dayjs from 'dayjs';
import { FolderOpen } from 'lucide-react';
import type { ToolGroup } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type ToolGroupCardProps = ToolGroup & {
  onOpen?: (group: ToolGroup) => void;
  onDelete?: (group: ToolGroup) => void;
};

export default function ToolGroupCard({ groupId, groupName, description, toolCount, workTime, onOpen, onDelete }: ToolGroupCardProps) {
  const group: ToolGroup = { groupId, groupName, description, toolCount, workTime };

  const title = (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center shrink-0">
        <FolderOpen className="size-4 text-white" />
      </div>
      <span
        className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]"
        onClick={(e) => {
          e.stopPropagation();
          onOpen?.(group);
        }}
      >
        {groupName}
      </span>
    </div>
  );

  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark" align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onDelete?.(group)} className="hover:cursor-pointer">
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card
      title={title}
      extra={extra}
      styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px', minHeight: '148px' } }}
      className="hover:!border-[var(--color-bt-primary)] hover:cursor-pointer"
      onClick={() => onOpen?.(group)}
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex">
          <span className="w-[104px] shrink-0">설명</span>
          <span className="truncate">{description ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="w-[104px] shrink-0">도구</span>
          <span>{toolCount ?? 0}개</span>
        </div>
        <div className="flex">
          <span className="w-[104px] shrink-0">최종 수정</span>
          <span>{workTime ? dayjs(workTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
