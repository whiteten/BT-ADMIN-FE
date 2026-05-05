import { Badge, Card } from 'antd';
import dayjs from 'dayjs';
import { Globe, Server } from 'lucide-react';
import type { McpItem } from '../types';

interface McpCardProps {
  mcp: McpItem;
  onClick?: (mcp: McpItem) => void;
}

const statusMap: Record<string, { color: 'success' | 'default' | 'error'; label: string }> = {
  active: { color: 'success', label: '활성' },
  inactive: { color: 'default', label: '비활성' },
  error: { color: 'error', label: '오류' },
};

export default function McpCard({ mcp, onClick }: McpCardProps) {
  const status = statusMap[mcp.status ?? 'inactive'] ?? statusMap.inactive;
  const description = mcp.description?.replace(/^\n+/, '').trim() ?? '';

  const handleClick = () => onClick?.(mcp);

  const title = (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center shrink-0">
        <Server className="size-4 text-white" />
      </div>
      <span className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={handleClick}>
        {mcp.serverName}
      </span>
      <Badge status={status.color} text={status.label} className="ml-auto text-xs" />
    </div>
  );

  return (
    <Card
      title={title}
      styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px', minHeight: '140px' } }}
      className="hover:!border-[var(--color-bt-primary)] hover:cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex items-center gap-2">
          <Globe className="size-3.5 shrink-0 text-gray-400" />
          <span className="truncate text-xs text-gray-500">{mcp.url}</span>
        </div>
        <div className="flex">
          <span className="w-[80px] shrink-0">설명</span>
          <span className="truncate">{description.length > 0 ? description : '-'}</span>
        </div>
        <div className="flex">
          <span className="w-[80px] shrink-0">최종 수정</span>
          <span>{mcp.workTime ? dayjs(mcp.workTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
