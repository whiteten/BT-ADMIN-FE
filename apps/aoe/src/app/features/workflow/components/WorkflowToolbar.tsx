import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Tooltip } from 'antd';
import { Download, History, PlayCircle, Rocket, Workflow, X } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import AgentVersionHistoryDrawer, { type AgentVersionHistoryDrawerRef } from './AgentVersionHistoryDrawer';
import { agentQueryKeys } from '../../agent-config/hooks/useAgentQueries';
import type { AgentItem, AoeDeployFlag } from '../../agent-config/types';
import { useDeployAgent, useExportWorkflow, workflowQueryKeys } from '../hooks/useWorkflowQueries';
import type { WorkflowGraph } from '../types';
import { validateWorkflowGraph } from '../utils/validateWorkflow';

interface WorkflowToolbarProps {
  agentId: string;
  agentName?: string;
  aoeDeployFlag?: AoeDeployFlag;
  onOpenPlayground: () => void;
}

export default function WorkflowToolbar({ agentId, agentName, aoeDeployFlag, onOpenPlayground }: WorkflowToolbarProps) {
  const queryClient = useQueryClient();
  const versionHistoryRef = useRef<AgentVersionHistoryDrawerRef>(null);

  const { mutate: deployAgent, isPending: isDeploying } = useDeployAgent({
    mutationOptions: {
      onSuccess: (data) => {
        // BE/AOE 엔진의 영어 메시지를 그대로 노출하지 않고 한국어로 고정 (예: "Application registered successfully")
        if (data?.resultCode === 'A') {
          toast.warning('이미 배포되어 있습니다.');
          return;
        }
        toast.success('엔진 배포가 완료되었습니다.');
        queryClient.invalidateQueries({ queryKey: workflowQueryKeys.graph(agentId).queryKey });
        // aoeDeployFlag 갱신 — invalidate refetch 만으로는 BE eventual consistency 로 옛 값이 돌아올 수 있어
        // 배포 응답의 aoeDeployFlag 를 캐시에 직접 머지해 테스트 버튼이 즉시 활성화되도록
        if (data?.aoeDeployFlag != null) {
          queryClient.setQueryData<AgentItem>(agentQueryKeys.getAgent({ agentId }).queryKey, (old) =>
            old ? { ...old, aoeDeployFlag: (data.aoeDeployFlag ? 1 : 0) as AoeDeployFlag } : old,
          );
        }
        queryClient.invalidateQueries({ queryKey: agentQueryKeys.getAgent({ agentId }).queryKey });
      },
      onError: (error) => {
        Log.warn('deployAgent failed', error);
        toast.error('엔진 배포에 실패했습니다.');
      },
    },
  });

  const { mutate: exportWorkflow, isPending: isExporting } = useExportWorkflow({
    mutationOptions: {
      onSuccess: () => toast.success('워크플로우를 다운로드했습니다.'),
      onError: (error) => {
        Log.warn('exportWorkflow failed', error);
        toast.error('다운로드에 실패했습니다.');
      },
    },
  });

  const handleDeploy = () => {
    const graph = queryClient.getQueryData<WorkflowGraph>(workflowQueryKeys.graph(agentId).queryKey);
    if (graph) {
      const errors = validateWorkflowGraph(graph);
      if (errors.length > 0) {
        Log.warn('workflow validation failed', errors);
        toast.error(errors[0].message);
        return;
      }
    }
    deployAgent({ agentId });
  };

  const handleDownload = () => {
    exportWorkflow({ agentId, agentName });
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <header className="flex items-center justify-between gap-3 h-14 px-4 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-[var(--color-bt-primary)] text-white">
          <Workflow size={16} />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-gray-800 truncate">{agentName ?? '워크플로우'}</span>
          <span className="text-[11px] text-gray-400 truncate">Agent ID: {agentId}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip title="현재 그래프를 JSON 파일로 저장합니다.">
          <Button icon={<Download size={14} />} loading={isExporting} onClick={handleDownload}>
            다운로드
          </Button>
        </Tooltip>
        <Tooltip title={aoeDeployFlag ? '배포된 에이전트와 대화 테스트' : '배포 후 사용할 수 있습니다.'}>
          <Button icon={<PlayCircle size={14} />} onClick={onOpenPlayground} disabled={!aoeDeployFlag}>
            테스트
          </Button>
        </Tooltip>
        <Tooltip title="배포 이력 — 과거 버전 보기/불러오기">
          <Button icon={<History size={14} />} onClick={() => versionHistoryRef.current?.open()}>
            배포 이력
          </Button>
        </Tooltip>
        <Tooltip title="현재 그래프를 동기화하고 AOE 엔진에 배포합니다.">
          <Button type="primary" icon={<Rocket size={14} />} loading={isDeploying} onClick={handleDeploy}>
            배포
          </Button>
        </Tooltip>
        <Tooltip title="창 닫기">
          <Button icon={<X size={14} />} onClick={handleClose} />
        </Tooltip>
      </div>

      <AgentVersionHistoryDrawer ref={versionHistoryRef} agentId={agentId} />
    </header>
  );
}
