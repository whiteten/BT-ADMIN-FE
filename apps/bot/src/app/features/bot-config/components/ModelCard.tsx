import { Card } from 'antd';
import type { ModelListItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type ModelCardProps = ModelListItem & {
  onDetail?: (modelId: string) => void;
  onDelete?: (modelId: string) => void;
};

export default function ModelCard({ modelId, modelName, trainStatus, trainTime, intentCount, entityCount, onDetail, onDelete }: ModelCardProps) {
  const title = (
    <span className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={() => onDetail?.(modelId)}>
      {modelName}
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
        <DropdownMenuItem onClick={() => onDetail?.(modelId)} className="hover:cursor-pointer">
          상세보기
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete?.(modelId)} className="hover:cursor-pointer">
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
          <span className="w-[104px]">상태</span>
          {trainStatus === '0' && (
            <Badge variant="secondary" className="text-[13px] font-medium text-[#495057] bg-[#E9EBEC] px-[8px] py-[2px]">
              미학습
            </Badge>
          )}
          {trainStatus === '1' && (
            <Badge variant="secondary" className="text-[13px] font-medium text-[#1F79D4] bg-[#1F79D41A] px-[8px] py-[2px]">
              학습중
            </Badge>
          )}
          {trainStatus === '2' && (
            <Badge variant="secondary" className="text-[13px] font-medium text-[#0AB39C] bg-[#0AB39C1A] px-[8px] py-[2px]">
              학습완료
            </Badge>
          )}
        </div>
        <div className="flex">
          <span className="w-[104px]">의도</span>
          <span className="mr-2">{intentCount ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">개체</span>
          <span className="mr-2">{entityCount ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">학습날짜</span>
          <span className="mr-2">{trainTime ?? '-'}</span>
        </div>
      </div>
    </Card>
  );
}
