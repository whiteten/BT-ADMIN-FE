import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { AOE_PERM } from '../../constants/permissions';
import McpCard from '../../features/mcp/components/McpCard';
import { mcpQueryKeys, useDeleteMcp, useGetMcpList } from '../../features/mcp/hooks/useMcpQueries';
import type { McpItem } from '../../features/mcp/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'AOE 관리', path: '/aoe/agent-config' },
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
  const canWrite = useNavigationStore((s) => s.permissions.includes(AOE_PERM.MCP_WRITE));

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

  const filteredList = searchValue.trim()
    ? mcpList.filter((mcp) => {
        const value = mcp[filterColumn as keyof typeof mcp];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchValue.toLowerCase());
      })
    : mcpList;

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
        <Button type="primary" onClick={() => navigate('../create')} disabled={!canWrite}>
          추가
        </Button>
      </div>

      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto pt-2 -mt-2">
          {filteredList.map((mcp) => (
            <McpCard key={mcp.mcpId} mcp={mcp} onClick={handleClickCard} onDetail={handleClickCard} onDelete={handleDelete} canWrite={canWrite} />
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
