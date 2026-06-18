import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AgentCard from '../../features/agent-config/components/AgentCard';
import AgentPlaygroundDrawer, { type AgentPlaygroundDrawerRef } from '../../features/agent-config/components/AgentPlaygroundDrawer';
import { agentQueryKeys, useDeleteAgent, useGetAgents } from '../../features/agent-config/hooks/useAgentQueries';
import type { AgentDeleteDatas } from '../../features/agent-config/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/aoe/agent-config' },
  { title: 'Agent', path: '/aoe/agent-config/agent' },
  { title: 'Agent 목록', path: '/aoe/agent-config/agent/list' },
];

const FILTER_OPTIONS = [
  { label: '에이전트명', value: 'agentName' },
  { label: '에이전트 타입', value: 'agentTypeName' },
];

export default function AgentList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const playgroundRef = useRef<AgentPlaygroundDrawerRef>(null);
  const [filterColumn, setFilterColumn] = useState('agentName');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: agents, isLoading } = useGetAgents({});

  const handleOpenStudio = (agentId: string) => {
    window.open(`/aoe-workflow/${agentId}`, '_blank', 'noopener,noreferrer');
  };

  const { mutate: deleteAgent } = useDeleteAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('에이전트가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: agentQueryKeys.getAgents().queryKey });
      },
    },
  });

  const agentList = agents ?? [];
  const filteredList = searchValue.trim()
    ? agentList.filter((agent) => {
        const value = agent[filterColumn as keyof typeof agent];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchValue.toLowerCase());
      })
    : agentList;

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickCreateBtn = () => {
    navigate('../create');
  };

  const handleDetail = (agentId: string) => {
    navigate(`../${agentId}`);
  };

  const handleDelete = (data: AgentDeleteDatas) => {
    modal.confirm.delete({
      onOk: () => deleteAgent(data),
    });
  };

  const handlePlayground = (agentId: string) => {
    const agent = agents?.find((a) => a.agentId === agentId);
    if (!agent) return;
    if (!agent.aoeDeployFlag) {
      toast.warning('배포된 에이전트만 Playground를 사용할 수 있습니다.');
      return;
    }
    playgroundRef.current?.open({ agentId, agentName: agent.agentName });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <AgentPlaygroundDrawer ref={playgroundRef} />
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select value={filterColumn} onChange={handleColumnChange} options={FILTER_OPTIONS} className="!max-w-[150px] !min-w-[120px]" popupMatchSelectWidth={false} />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <Button type="primary" onClick={handleClickCreateBtn}>
          추가
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto pt-2 -mt-2">
          {filteredList.map((agent) => (
            <AgentCard key={agent.agentId} {...agent} onDetail={handleDetail} onDelete={handleDelete} onOpenStudio={handleOpenStudio} onPlayground={handlePlayground} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message="조회된 데이터가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      )}
    </div>
  );
}
