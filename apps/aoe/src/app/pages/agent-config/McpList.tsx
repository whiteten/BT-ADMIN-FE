import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input } from 'antd';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import McpCard from '../../features/mcp/components/McpCard';
import { mcpQueryKeys, useDeleteMcp, useGetMcpList } from '../../features/mcp/hooks/useMcpQueries';
import type { McpItem } from '../../features/mcp/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/aoe/agent-config' },
  { title: 'MCP', path: '/aoe/agent-config/mcp/list' },
];

export default function McpList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [searchValue, setSearchValue] = useState('');

  const { data: mcpList = [], isFetching } = useGetMcpList();
  const { mutate: deleteMcp } = useDeleteMcp({
    mutationOptions: {
      onSuccess: () => {
        toast.success('MCP 서버가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: mcpQueryKeys.getMcpList().queryKey });
      },
    },
  });

  const filteredList = useMemo(() => {
    if (!searchValue.trim()) return mcpList;
    const keyword = searchValue.toLowerCase();
    return mcpList.filter(
      (mcp) => mcp.serverName.toLowerCase().includes(keyword) || mcp.url.toLowerCase().includes(keyword) || (mcp.description ?? '').toLowerCase().includes(keyword),
    );
  }, [mcpList, searchValue]);

  const handleClickCard = (mcp: McpItem) => navigate(`../${mcp.mcpId}`);
  const handleDelete = (mcp: McpItem) => {
    modal.confirm.delete({
      onOk: () => deleteMcp({ mcpId: mcp.mcpId }),
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <Input
          prefix={<Search className="size-3.5 text-gray-400" />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full max-w-[400px]"
          placeholder="서버명, URL, 설명으로 검색"
          allowClear
        />
        <Button type="primary" onClick={() => navigate('../create')}>
          추가
        </Button>
      </div>

      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
          {filteredList.map((mcp) => (
            <McpCard key={mcp.mcpId} mcp={mcp} onClick={handleClickCard} onDetail={handleClickCard} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message="등록된 MCP 서버가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      )}
    </div>
  );
}
