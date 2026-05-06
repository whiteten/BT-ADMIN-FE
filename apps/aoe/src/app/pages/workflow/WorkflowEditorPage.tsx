import { useParams } from 'react-router-dom';
import { useGetAgent } from '../../features/agent-config/hooks/useAgentQueries';
import WorkflowEditor from '../../features/workflow/components/WorkflowEditor';
import { useGetWorkflowGraph } from '../../features/workflow/hooks/useWorkflowQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NotFound } from '@/components/custom/NotFound';

export default function WorkflowEditorPage() {
  const { agentId } = useParams<{ agentId: string }>();

  const { data: agent } = useGetAgent({ params: { agentId }, queryOptions: { enabled: !!agentId } });
  const { data: graph, isLoading, isError } = useGetWorkflowGraph({ params: { agentId: agentId ?? '' } });

  if (!agentId) {
    return <NotFound useFullScreen />;
  }

  if (isLoading || !graph) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-50">
        <FallbackSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-50 gap-2">
        <p className="text-gray-700 font-medium">워크플로우를 불러오지 못했습니다.</p>
        <p className="text-sm text-gray-500">잠시 후 다시 시도하거나 창을 닫아 주세요.</p>
      </div>
    );
  }

  return <WorkflowEditor agentId={agentId} agentName={agent?.agentName} graph={graph} />;
}
