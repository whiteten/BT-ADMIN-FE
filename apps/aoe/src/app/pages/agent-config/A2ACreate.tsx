import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Form, Input, Select } from 'antd';
import { Server } from 'lucide-react';
import { Log } from '@/log';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { AOE_PERM } from '../../constants/permissions';
import A2ASkillsEditor from '../../features/a2a/components/A2ASkillsEditor';
import { a2aQueryKeys, useCreateA2A } from '../../features/a2a/hooks/useA2aQueries';
import type { A2ACreateDatas, A2ASkill } from '../../features/a2a/types';
import { extractSkillsFromGraph } from '../../features/a2a/utils/extractSkillsFromGraph';
import { useGetAgents } from '../../features/agent-config/hooks/useAgentQueries';
import { useGetAllTools } from '../../features/tool/hooks/useToolQueries';
import { useGetWorkflowGraph } from '../../features/workflow/hooks/useWorkflowQueries';

interface FormValues {
  agentId: string;
  agentName: string;
  agentDescription?: string;
}

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'AOE 관리', path: '/aoe/agent-config' },
  { title: 'A2A', path: '/aoe/agent-config/a2a/list' },
  { title: '추가', path: '/aoe/agent-config/a2a/create' },
];

export default function A2ACreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [form] = Form.useForm<FormValues>();
  const canWrite = useNavigationStore((s) => s.permissions.includes(AOE_PERM.A2A_WRITE));

  // 생성 모드 — skills 는 local state 로 관리, 최종 저장 시 한 번에 createA2A.
  const [skills, setSkills] = useState<A2ASkill[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: agents = [] } = useGetAgents();
  const deployedAgents = agents.filter((a) => a.aoeDeployFlag === 1);

  // 배포 Agent 의 workflow graph + 전체 도구 그룹/도구 — 선택된 Agent 의 LLM 노드 tool_list 에서 사용된 도구를
  // 자동으로 Skills 그리드에 채우기 위한 데이터.
  const { data: agentGraph } = useGetWorkflowGraph({
    params: { agentId: selectedAgentId ?? '' },
    queryOptions: { enabled: !!selectedAgentId },
  });
  // 주의: useGetAllTools 의 toolsByGroup 은 매 렌더 새 object reference 라 useEffect deps 에 직접 넣으면 무한 루프.
  // ref 로 최신값 추적 + useEffect 는 isLoadingAllTools 가 false 가 된 시점에만 트리거.
  const { toolsByGroup, isLoading: isLoadingAllTools } = useGetAllTools();
  const toolsByGroupRef = useRef(toolsByGroup);
  toolsByGroupRef.current = toolsByGroup;

  // agentGraph + toolsByGroup → skills 변환. Agent 변경 / graph 로딩 완료 / tool 메타 로딩 완료 시점에 재계산.
  useEffect(() => {
    if (!selectedAgentId || !agentGraph || isLoadingAllTools) return;
    setSkills(extractSkillsFromGraph(agentGraph.nodes ?? [], toolsByGroupRef.current));
  }, [agentGraph, selectedAgentId, isLoadingAllTools]);

  const { mutate: createA2A, isPending } = useCreateA2A({
    mutationOptions: {
      onSuccess: () => {
        toast.success('A2A 서버가 생성되었습니다.');
        queryClient.invalidateQueries({ queryKey: a2aQueryKeys.getA2AList().queryKey });
        navigate('../list');
      },
      onError: (error) => Log.warn('createA2A failed', error),
    },
  });

  const handleAgentChange = (agentId: string) => {
    const agent = deployedAgents.find((a) => a.agentId === agentId);
    if (agent) form.setFieldValue('agentName', agent.agentName);
    // selectedAgentId 변경으로 useGetWorkflowGraph 활성화 → 위 useEffect 가 skills 자동 채움.
    setSelectedAgentId(agentId);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const selectedAgent = deployedAgents.find((a) => a.agentId === values.agentId);
      const data: A2ACreateDatas = {
        agentId: values.agentId,
        agentName: values.agentName,
        agentDescription: values.agentDescription,
        aoeApiKey: selectedAgent?.aoeApiKey,
        // 신규 생성 시 임시 skillId(`tmp-*`) 는 BE 에 보낼 필요 없음 — 제거하고 seq 부여
        skills: skills.map((s, i) => ({
          skillName: s.skillName,
          description: s.description,
          tags: s.tags ?? [],
          examples: s.examples ?? [],
          seq: i + 1,
        })),
      };
      createA2A(data);
    } catch (error) {
      Log.warn('A2ACreate validation failed', error);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-4 w-full flex-1 min-h-0 bg-white bt-shadow p-5">
        <div className="flex flex-row gap-5 w-full flex-1 min-h-0">
          {/* 좌측 — 기본정보 폼 (사이드 패널) */}
          <div className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
            <header className="flex items-center gap-2.5 border-b border-[#F1F3F5] px-4 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bt-primary-soft)]">
                <Server className="size-[18px] text-[var(--color-bt-primary)]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#495057]">기본 정보</h3>
                <p className="text-xs text-[#888B9A]">A2A 서버로 배포할 Agent 정보</p>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              <Form form={form} layout="vertical">
                <Form.Item name="agentId" label="배포 Agent" required rules={[{ required: true, message: 'Agent를 선택해 주세요.' }]}>
                  <Select
                    showSearch
                    placeholder="배포된 Agent를 선택하세요."
                    options={deployedAgents.map((a) => ({ label: a.agentName, value: a.agentId }))}
                    onChange={handleAgentChange}
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
                <Form.Item name="agentName" label="Agent 명" required rules={[{ required: true, message: 'Agent 명을 입력해 주세요.' }]}>
                  <Input placeholder="Agent 명을 입력하세요." />
                </Form.Item>
                <Form.Item name="agentDescription" label="설명">
                  <Input.TextArea placeholder="설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 6 }} />
                </Form.Item>
              </Form>
            </div>
          </div>
          {/* 우측 — Skills 그리드 (controlled, 카드) */}
          <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
            <A2ASkillsEditor skills={skills} onChange={setSkills} description="배포 Agent 선택 시 사용 도구가 자동으로 채워집니다." />
          </div>
        </div>
        {/* 카드 하단 — 저장/취소 */}
        <div className="flex items-center justify-center gap-3 w-full">
          <Button variant="solid" onClick={() => navigate('../list')}>
            취소
          </Button>
          <Button color="primary" variant="solid" loading={isPending} onClick={handleSubmit} disabled={!canWrite}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
