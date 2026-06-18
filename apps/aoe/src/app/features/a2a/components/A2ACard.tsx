import { useNavigate } from 'react-router-dom';
import { Card } from 'antd';
import dayjs from 'dayjs';
import { Bot, Clock } from 'lucide-react';
import type { A2AItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type A2ACardProps = A2AItem & {
  onDetail?: (a2aId: string) => void;
  onDelete?: (a2a: A2AItem) => void;
};

export default function A2ACard(props: A2ACardProps) {
  const { a2aId, agentName, agentDescription, skills, workTime, onDetail, onDelete } = props;
  const navigate = useNavigate();

  const handleClick = () => (onDetail ? onDetail(a2aId) : navigate(`../${a2aId}`));

  const title = (
    <div className="flex items-center gap-2.5 w-full">
      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
        <Bot className="size-[18px]" />
      </div>
      <span className="truncate hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={handleClick}>
        {agentName}
      </span>
    </div>
  );

  const extra =
    onDetail || onDelete ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
            <IconMoreVertical />
            <span className="sr-only">더보기</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="dark" align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={handleClick} className="hover:cursor-pointer">
            상세보기
          </DropdownMenuItem>
          {onDelete && (
            <DropdownMenuItem onClick={() => onDelete({ a2aId, agentName, agentDescription, skills, workTime } as A2AItem)} className="hover:cursor-pointer">
              삭제
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : undefined;

  return (
    <Card
      title={title}
      extra={extra}
      styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px', minHeight: '148px' } }}
      className="transition-all duration-200 hover:-translate-y-0.5 hover:!border-[var(--color-bt-primary)] hover:shadow-[0px_6px_16px_0px_#38414A1f] hover:cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-2.5 text-[#495057]">
          <div className="flex">
            <span className="w-[104px] shrink-0 text-[#888B9A]">설명</span>
            <span className="min-w-0 flex-1 truncate">{agentDescription || '-'}</span>
          </div>
          <div className="flex">
            <span className="w-[104px] shrink-0 text-[#888B9A]">Skills</span>
            <span>{skills?.length ?? 0}개</span>
          </div>
        </div>
        <div className="mt-auto flex items-center gap-1.5 border-t border-[#F1F3F5] pt-3 text-xs text-[#888B9A]">
          <Clock className="size-3.5 shrink-0" />
          <span>최종 수정 {workTime ? dayjs(workTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
