import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { AOE_PERM } from '../../constants/permissions';
import AgentCard from '../../features/agent-config/components/AgentCard';
import AgentPlaygroundDrawer, { type AgentPlaygroundDrawerRef } from '../../features/agent-config/components/AgentPlaygroundDrawer';
import { agentQueryKeys, useDeleteAgent, useDuplicateAgent, useGetAgentTypes, useGetAgents } from '../../features/agent-config/hooks/useAgentQueries';
import type { AgentDeleteDatas } from '../../features/agent-config/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'AOE 관리', path: '/aoe/agent-config' },
  { title: 'Agent', path: '/aoe/agent-config/agent' },
  { title: 'Agent 목록', path: '/aoe/agent-config/agent/list' },
];

export default function AgentList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const canWrite = useNavigationStore((s) => s.permissions.includes(AOE_PERM.AGENT_WRITE));
  const playgroundRef = useRef<AgentPlaygroundDrawerRef>(null);
  const [nameKeyword, setNameKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: agents, isLoading } = useGetAgents({});
  const { data: agentTypes } = useGetAgentTypes({});
  const typeOptions = [{ label: '전체', value: '' }, ...(agentTypes ?? []).map((type) => ({ label: type.agentTypeName, value: type.agentTypeName }))];

  const handleOpenStudio = (agentId: string) => {
    window.open(`/aoe/workflow/${agentId}`, '_blank', 'noopener,noreferrer');
  };

  const { mutate: deleteAgent } = useDeleteAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('에이전트가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: agentQueryKeys.getAgents().queryKey });
      },
    },
  });

  const { mutate: duplicateAgent } = useDuplicateAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('에이전트가 복제되었습니다.');
        queryClient.invalidateQueries({ queryKey: agentQueryKeys.getAgents().queryKey });
      },
    },
  });

  const agentList = agents ?? [];
  // 이름(부분일치) + 타입(정확일치) AND 결합 필터
  const trimmedName = nameKeyword.trim().toLowerCase();
  const filteredList = agentList.filter((agent) => {
    const matchesName = !trimmedName || agent.agentName.toLowerCase().includes(trimmedName);
    const matchesType = !typeFilter || agent.agentTypeName === typeFilter;
    return matchesName && matchesType;
  });

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

  const handleDuplicate = (agentId: string) => {
    duplicateAgent({ agentId });
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
        <div className="flex gap-4 w-full items-center">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-[#495057] shrink-0">에이전트명</span>
            <Input value={nameKeyword} onChange={(e) => setNameKeyword(e.target.value)} className="w-[280px]" placeholder="에이전트명을 입력하세요." />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-[#495057] shrink-0">에이전트 타입</span>
            <Select
              value={typeFilter}
              onChange={(value) => setTypeFilter(value ?? '')}
              options={typeOptions}
              showSearch={{ optionFilterProp: 'label' }}
              className="!min-w-[180px]"
              popupMatchSelectWidth={false}
            />
          </div>
        </div>
        <Button type="primary" onClick={handleClickCreateBtn} disabled={!canWrite}>
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
            <AgentCard
              key={agent.agentId}
              {...agent}
              canWrite={canWrite}
              onDetail={handleDetail}
              onDelete={handleDelete}
              onOpenStudio={handleOpenStudio}
              onPlayground={handlePlayground}
              onDuplicate={handleDuplicate}
            />
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
