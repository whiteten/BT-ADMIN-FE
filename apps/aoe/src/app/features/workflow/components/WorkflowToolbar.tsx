import { useQueryClient } from '@tanstack/react-query';
import { Button, Tooltip } from 'antd';
import { Download, RefreshCw, Rocket, Workflow, X } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useDeployAgent, useExportWorkflow, workflowQueryKeys } from '../hooks/useWorkflowQueries';

interface WorkflowToolbarProps {
  agentId: string;
  agentName?: string;
}

export default function WorkflowToolbar({ agentId, agentName }: WorkflowToolbarProps) {
  const queryClient = useQueryClient();

  const { mutate: deployAgent, isPending: isDeploying } = useDeployAgent({
    mutationOptions: {
      onSuccess: (data) => {
        if (data?.resultCode === 'A') {
          toast.warning(data.message || '이미 배포되어 있습니다.');
          return;
        }
        toast.success(data?.message || '엔진 배포가 완료되었습니다.');
        queryClient.invalidateQueries({ queryKey: workflowQueryKeys.graph(agentId).queryKey });
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: workflowQueryKeys.graph(agentId).queryKey });
  };

  const handleDeploy = () => {
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
        <Tooltip title="그래프 새로고침">
          <Button icon={<RefreshCw size={14} />} onClick={handleRefresh}>
            새로고침
          </Button>
        </Tooltip>
        <Tooltip title="현재 그래프를 JSON 파일로 저장합니다.">
          <Button icon={<Download size={14} />} loading={isExporting} onClick={handleDownload}>
            다운로드
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
    </header>
  );
}
