import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import McpCard from '../../features/mcp/components/McpCard';
import { mcpQueryKeys, useDeleteMcp, useGetMcpList } from '../../features/mcp/hooks/useMcpQueries';
import type { McpItem } from '../../features/mcp/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/aoe/agent-config' },
  { title: 'MCP', path: '/aoe/agent-config/mcp/list' },
];

const FILTER_OPTIONS = [
  { label: '서버명', value: 'serverName' },
  { label: 'URL', value: 'url' },
];

export default function McpList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [filterColumn, setFilterColumn] = useState('serverName');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

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
    return mcpList.filter((mcp) => {
      const value = mcp[filterColumn as keyof typeof mcp];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [mcpList, filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickCard = (mcp: McpItem) => navigate(`../${mcp.mcpId}`);
  const handleDelete = (mcp: McpItem) => {
    modal.confirm.delete({
      onOk: () => deleteMcp({ mcpId: mcp.mcpId }),
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select value={filterColumn} onChange={handleColumnChange} options={FILTER_OPTIONS} className="!max-w-[150px] !min-w-[120px]" popupMatchSelectWidth={false} />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
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
