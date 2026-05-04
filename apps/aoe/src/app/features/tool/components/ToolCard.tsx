import { Card } from 'antd';
import dayjs from 'dayjs';
import { Wrench } from 'lucide-react';
import type { ToolItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type ToolCardProps = ToolItem & {
  groupId: string;
  onEdit?: (tool: ToolItem) => void;
};

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-50 text-blue-700 border-blue-200',
  PUT: 'bg-orange-50 text-orange-700 border-orange-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
  PATCH: 'bg-purple-50 text-purple-700 border-purple-200',
};

function MethodBadge({ method }: { method?: string }) {
  const m = method?.toUpperCase() ?? 'GET';
  const style = METHOD_STYLES[m] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold shrink-0 ${style}`}>{m}</span>;
}

export default function ToolCard({ toolId, toolName, toolUrl, method, description, workTime, groupId, onEdit }: ToolCardProps) {
  const tool: ToolItem = { toolId, toolName, toolUrl, method, description, workTime, groupId };

  const title = (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center shrink-0">
        <Wrench className="size-4 text-white" />
      </div>
      <span
        className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.(tool);
        }}
      >
        {toolName}
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
        <DropdownMenuItem onClick={() => onEdit?.(tool)} className="hover:cursor-pointer">
          수정
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
      onClick={() => onEdit?.(tool)}
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex items-center">
          <span className="w-[104px] shrink-0">Method</span>
          <MethodBadge method={method} />
        </div>
        <div className="flex">
          <span className="w-[104px] shrink-0">URL</span>
          <span className="truncate text-xs text-gray-500">{toolUrl}</span>
        </div>
        <div className="flex">
          <span className="w-[104px] shrink-0">설명</span>
          <span className="truncate">{description ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="w-[104px] shrink-0">최종 수정</span>
          <span>{workTime ? dayjs(workTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
