import { Badge, Card } from 'antd';
import dayjs from 'dayjs';
import { Clock, Globe, Server } from 'lucide-react';
import type { McpItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface McpCardProps {
  mcp: McpItem;
  onClick?: (mcp: McpItem) => void;
  onDetail?: (mcp: McpItem) => void;
  onDelete?: (mcp: McpItem) => void;
}

const statusMap: Record<string, { color: 'success' | 'default' | 'error'; label: string }> = {
  active: { color: 'success', label: '활성' },
  inactive: { color: 'default', label: '비활성' },
  error: { color: 'error', label: '오류' },
};

export default function McpCard({ mcp, onClick, onDetail, onDelete }: McpCardProps) {
  const status = statusMap[mcp.status ?? 'inactive'] ?? statusMap.inactive;
  const description = mcp.description?.replace(/^\n+/, '').trim() ?? '';

  const handleClick = () => onClick?.(mcp);
  // 다른 카드(AgentCard) 와 동일 패턴 — 상세보기 / 삭제 ... 메뉴
  const detail = onDetail ?? onClick;

  const title = (
    <div className="flex items-center gap-2.5 w-full">
      <div className="w-8 h-8 rounded-lg bg-[#EAF2FB] text-[var(--color-bt-primary)] flex items-center justify-center shrink-0">
        <Server className="size-[18px]" />
      </div>
      <span className="min-w-0 truncate hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={handleClick}>
        {mcp.serverName}
      </span>
      <Badge status={status.color} text={status.label} className="ml-auto text-xs" />
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
          {detail && (
            <DropdownMenuItem onClick={() => detail(mcp)} className="hover:cursor-pointer">
              상세보기
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem onClick={() => onDelete(mcp)} className="hover:cursor-pointer">
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
      styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px', minHeight: '140px' } }}
      className="transition-all duration-200 hover:-translate-y-0.5 hover:!border-[var(--color-bt-primary)] hover:shadow-[0px_6px_16px_0px_#38414A1f] hover:cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-2.5 text-[#495057]">
          <div className="flex items-center gap-2">
            <Globe className="size-3.5 shrink-0 text-gray-400" />
            <span className="truncate text-xs text-gray-500">{mcp.url}</span>
          </div>
          <div className="flex">
            <span className="w-[80px] shrink-0 text-[#888B9A]">설명</span>
            <span className="min-w-0 flex-1 truncate">{description.length > 0 ? description : '-'}</span>
          </div>
        </div>
        <div className="mt-auto flex items-center gap-1.5 border-t border-[#F1F3F5] pt-3 text-xs text-[#888B9A]">
          <Clock className="size-3.5 shrink-0" />
          <span>최종 수정 {mcp.workTime ? dayjs(mcp.workTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
