import { Card } from 'antd';
import dayjs from 'dayjs';
import { Clock, Wrench } from 'lucide-react';
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
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
        <Wrench className="size-[18px]" />
      </div>
      <span
        className="truncate hover:cursor-pointer hover:!text-[var(--color-bt-primary)]"
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
      className="transition-all duration-200 hover:-translate-y-0.5 hover:!border-[var(--color-bt-primary)] hover:shadow-[0px_6px_16px_0px_#38414A1f] hover:cursor-pointer"
      onClick={() => onEdit?.(tool)}
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-2.5 text-[#495057]">
          <div className="flex items-center">
            <span className="w-[104px] shrink-0 text-[#888B9A]">Method</span>
            <MethodBadge method={method} />
          </div>
          <div className="flex">
            <span className="w-[104px] shrink-0 text-[#888B9A]">URL</span>
            <span className="min-w-0 flex-1 truncate text-xs text-gray-500">{toolUrl}</span>
          </div>
          <div className="flex">
            <span className="w-[104px] shrink-0 text-[#888B9A]">설명</span>
            <span className="min-w-0 flex-1 truncate">{description ?? '-'}</span>
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
