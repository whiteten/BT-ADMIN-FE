import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PanelLeftOpen } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import WorkflowCanvas from './WorkflowCanvas';
import WorkflowSidebar from './WorkflowSidebar';
import WorkflowToolbar from './WorkflowToolbar';
import { useCreateEdge, useCreateNode, workflowQueryKeys } from '../hooks/useWorkflowQueries';
import type { WorkflowGraph } from '../types';
import { buildOutputVariableId } from '../utils/variableTokens';
import WorkflowPropertiesPanel from './properties/WorkflowPropertiesPanel';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface WorkflowEditorProps {
  agentId: string;
  agentName?: string;
  graph: WorkflowGraph;
}

const SIDEBAR_BREAKPOINT = 1024;

const isWideViewport = () => (typeof window === 'undefined' ? true : window.innerWidth >= SIDEBAR_BREAKPOINT);

const cardClass = 'h-full rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden';

export default function WorkflowEditor({ agentId, agentName, graph }: WorkflowEditorProps) {
  const [sidebarOpen, setSidebarOpen] = useState(isWideViewport);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(() => (graph.nodes ?? []).length === 0);
  const prevWideRef = useRef(isWideViewport());
  const initializedRef = useRef(false);
  const queryClient = useQueryClient();

  const { mutateAsync: createNodeAsync } = useCreateNode();
  const { mutateAsync: createEdgeAsync } = useCreateEdge();

  const selectedNode = selectedNodeId ? ((graph.nodes ?? []).find((n) => n.nodeId === selectedNodeId) ?? null) : null;

  useEffect(() => {
    const handleResize = () => {
      const isWide = isWideViewport();
      if (isWide !== prevWideRef.current) {
        setSidebarOpen(isWide);
        prevWideRef.current = isWide;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 최초 진입 — 그래프가 비어있으면 기본 워크플로우(시작 → LLM → 답변) 자동 생성
  useEffect(() => {
    // 그래프가 이미 채워졌으면 초기화 완료 — 로딩 해제
    if ((graph.nodes ?? []).length > 0) {
      initializedRef.current = true;
      setIsInitializing(false);
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    const ts = Date.now();
    const startId = `start_${ts}`;
    const llmId = `llm_${ts + 1}`;
    const answerId = `answer_${ts + 2}`;

    (async () => {
      try {
        await createNodeAsync({ params: { agentId }, data: { nodeId: startId, nodeKind: 'start', nodeLabel: '시작', nodeGroup: 'system', positionX: 100, positionY: 200 } });
        await createNodeAsync({
          params: { agentId },
          data: {
            nodeId: llmId,
            nodeKind: 'llm',
            nodeLabel: 'LLM',
            nodeGroup: 'ai',
            positionX: 400,
            positionY: 200,
            data: { output_variable: buildOutputVariableId('LLM', llmId) },
          },
        });
        await createNodeAsync({ params: { agentId }, data: { nodeId: answerId, nodeKind: 'answer', nodeLabel: '답변', nodeGroup: 'system', positionX: 700, positionY: 200 } });
        await createEdgeAsync({ params: { agentId }, data: { edgeId: `tmp-${ts + 100}`, srcNodeId: startId, tgtNodeId: llmId } });
        await createEdgeAsync({ params: { agentId }, data: { edgeId: `tmp-${ts + 101}`, srcNodeId: llmId, tgtNodeId: answerId } });
        // invalidateQueries 후 새 graph 가 들어오면 위 분기에서 setIsInitializing(false) 처리됨
        queryClient.invalidateQueries({ queryKey: workflowQueryKeys.graph(agentId).queryKey });
      } catch (error) {
        Log.warn('initDefaultGraph failed', error);
        toast.error('기본 워크플로우 생성에 실패했습니다.');
        initializedRef.current = false;
        setIsInitializing(false);
      }
    })();
  }, [graph.nodes, agentId, createNodeAsync, createEdgeAsync, queryClient]);

  if (isInitializing) {
    return (
      <div className="flex flex-col h-screen w-screen bg-gray-100 overflow-hidden">
        <WorkflowToolbar agentId={agentId} agentName={agentName} />
        <div className="flex-1 flex items-center justify-center">
          <FallbackSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 overflow-hidden">
      <WorkflowToolbar agentId={agentId} agentName={agentName} />
      <div className="flex flex-1 min-h-0 p-2 relative">
        {sidebarOpen && (
          <div className={cardClass}>
            <WorkflowSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        )}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute top-5 left-5 z-10 inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors"
            aria-label="사이드바 열기"
            title="노드 목록 열기"
          >
            <PanelLeftOpen size={16} />
            <span className="text-xs font-medium">노드 목록</span>
          </button>
        )}
        <div className={`flex-1 ${sidebarOpen ? 'ml-2' : ''} ${cardClass}`}>
          <WorkflowCanvas agentId={agentId} graph={graph} onSelectNode={setSelectedNodeId} />
        </div>
        {selectedNode && (
          <div className={`shrink-0 w-[320px] lg:w-[360px] xl:w-[400px] ml-2 ${cardClass}`}>
            <WorkflowPropertiesPanel agentId={agentId} node={selectedNode} graph={graph} onClose={() => setSelectedNodeId(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
