import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Empty, Spin, Table, type TableProps } from 'antd';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { mcpQueryKeys, useGetMcpList, useGetMcpTools } from '../hooks/useMcpQueries';
import type { McpApiItem } from '../types';

const columns: TableProps<McpApiItem>['columns'] = [
  {
    title: 'API 이름',
    dataIndex: 'toolName',
    key: 'toolName',
    width: '30%',
    render: (toolName: string) => <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{toolName}</code>,
  },
  {
    title: '설명',
    dataIndex: 'description',
    key: 'description',
    render: (description?: string) => {
      const cleaned = description?.replace(/^\n+/, '').trim();
      return cleaned ? <span className="whitespace-pre-line">{cleaned}</span> : <span className="text-gray-400 italic">설명 없음</span>;
    },
  },
];

export default function McpApiList() {
  const { mcpId } = useParams();
  const queryClient = useQueryClient();
  const { data: mcpList = [] } = useGetMcpList();
  const mcp = mcpList.find((m) => m.mcpId === mcpId);
  const serverName = mcp?.serverName ?? '';

  const { data: apiList = [], isFetching } = useGetMcpTools({ params: { serverName } });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: mcpQueryKeys.getMcpTools({ serverName }).queryKey });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">등록된 API 목록</h3>
        <Button icon={<RefreshCw className="size-3.5" />} onClick={handleRefresh} disabled={isFetching || !serverName}>
          새로고침
        </Button>
      </div>

      <p className="text-sm text-gray-500">이 MCP 서버에 등록된 API 목록입니다. 서버 이름이 "{serverName || '-'}"인 API만 표시됩니다.</p>

      {isFetching ? (
        <div className="py-12 text-center">
          <Spin />
          <p className="mt-2 text-sm text-gray-500">API 목록을 불러오는 중...</p>
        </div>
      ) : apiList.length > 0 ? (
        <Table<McpApiItem> rowKey={(record) => `${record.serverName}-${record.toolName}`} columns={columns} dataSource={apiList} pagination={false} size="small" />
      ) : (
        <div className="py-12 text-center border border-gray-200 rounded-md bg-gray-50">
          <Empty description="등록된 API가 없습니다." />
          <p className="text-sm text-gray-400 mt-1">이 서버에 등록된 API가 없거나 서버 이름이 일치하지 않습니다.</p>
        </div>
      )}

      <div className="bg-amber-50 p-4 rounded-md border border-amber-100">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-2 shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-amber-800">API 관리 안내</h4>
            <p className="text-xs text-amber-700 mt-1">API 추가 및 수정은 MCP 서버에서 가능합니다. 여기서는 현재 서버에 등록된 API 목록만 확인할 수 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
