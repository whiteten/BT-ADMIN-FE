import { useNavigate } from 'react-router-dom';
import { Card } from 'antd';
import dayjs from 'dayjs';
import { Bot } from 'lucide-react';
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
    <div className="flex items-center gap-2 w-full">
      <div className="w-7 h-7 rounded-md bg-violet-500 flex items-center justify-center shrink-0">
        <Bot className="size-4 text-white" />
      </div>
      <span className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={handleClick}>
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
      className="hover:!border-[var(--color-bt-primary)] hover:cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex">
          <span className="w-[104px] shrink-0">설명</span>
          <span className="truncate">{agentDescription ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="w-[104px] shrink-0">Skills</span>
          <span>{skills?.length ?? 0}개</span>
        </div>
        <div className="flex">
          <span className="w-[104px] shrink-0">최종 수정</span>
          <span>{workTime ? dayjs(workTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
