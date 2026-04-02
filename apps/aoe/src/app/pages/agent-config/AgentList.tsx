import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { toast } from '@/shared-util';
import AgentCard from '../../features/agent-config/components/AgentCard';
import { agentQueryKeys, useDeleteAgent, useGetAgents, useGetAoeStudioInfo } from '../../features/agent-config/hooks/useAgentQueries';
import type { AgentDeleteDatas, AoeStudioInfo } from '../../features/agent-config/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
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
  const [filterColumn, setFilterColumn] = useState('agentName');
  const [searchValue, setSearchValue] = useState('');

  const { data: agents, isLoading } = useGetAgents({});
  const { mutate: getAoeStudioInfo } = useGetAoeStudioInfo({
    mutationOptions: {
      onSuccess: (data) => {
        const studioInfo = data as AoeStudioInfo;
        if (!studioInfo.studioUrl) {
          toast.warning('워크플로우 접속 정보가 없습니다.');
          return;
        }
        window.open(studioInfo.studioUrl, '_blank');
      },
    },
  });

  const handleOpenStudio = (agentId: string) => {
    getAoeStudioInfo({ agentId });
  };

  const { mutate: deleteAgent } = useDeleteAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('에이전트가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: agentQueryKeys.getAgents().queryKey });
      },
    },
  });

  const filteredList = useMemo(() => {
    if (!agents) return [];
    if (!searchValue.trim()) return agents;

    const keyword = searchValue.toLowerCase();
    return agents.filter((agent) => {
      const value = agent[filterColumn as keyof typeof agent];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [agents, filterColumn, searchValue]);

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

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
          {filteredList.map((agent) => (
            <AgentCard key={agent.agentId} {...agent} onDetail={handleDetail} onDelete={handleDelete} onOpenStudio={handleOpenStudio} />
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
