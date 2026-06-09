import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PanelLeftOpen } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import WorkflowCanvas from './WorkflowCanvas';
import WorkflowSidebar from './WorkflowSidebar';
import WorkflowToolbar from './WorkflowToolbar';
import AgentPlaygroundDrawer, { type AgentPlaygroundDrawerRef } from '../../agent-config/components/AgentPlaygroundDrawer';
import type { AoeDeployFlag } from '../../agent-config/types';
import { useCreateEdge, useCreateNode, workflowQueryKeys } from '../hooks/useWorkflowQueries';
import type { WorkflowGraph } from '../types';
import { getEdgeBranchAttrs } from '../utils/edgeAttrs';
import { buildNodeName, buildOutputVariableFromName } from '../utils/variableTokens';
import WorkflowPropertiesPanel from './properties/WorkflowPropertiesPanel';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

interface WorkflowEditorProps {
  agentId: string;
  agentName?: string;
  aoeDeployFlag?: AoeDeployFlag;
  graph: WorkflowGraph;
}

const SIDEBAR_BREAKPOINT = 1024;

const isWideViewport = () => (typeof window === 'undefined' ? true : window.innerWidth >= SIDEBAR_BREAKPOINT);

const cardClass = 'h-full rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden';

export default function WorkflowEditor({ agentId, agentName, aoeDeployFlag, graph }: WorkflowEditorProps) {
  const [sidebarOpen, setSidebarOpen] = useState(isWideViewport);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(() => (graph.nodes ?? []).length === 0);
  const prevWideRef = useRef(isWideViewport());
  const initializedRef = useRef(false);
  const playgroundRef = useRef<AgentPlaygroundDrawerRef>(null);
  const queryClient = useQueryClient();

  const { mutateAsync: createNodeAsync } = useCreateNode();
  const { mutateAsync: createEdgeAsync } = useCreateEdge();

  const handleOpenPlayground = () => {
    if (!aoeDeployFlag) {
      toast.warning('배포된 에이전트만 Playground를 사용할 수 있습니다.');
      return;
    }
    playgroundRef.current?.open({ agentId, agentName: agentName ?? '' });
  };

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
        // 자동 초기화는 첫 노드들이라 인덱스 모두 1로 고정 (기존 노드 없음)
        const startName = buildNodeName(startId, 'start', []);
        const llmName = buildNodeName(llmId, 'llm', []);
        const answerName = buildNodeName(answerId, 'answer', []);
        await createNodeAsync({
          params: { agentId },
          data: {
            nodeId: startId,
            nodeKind: 'start',
            nodeLabel: '시작',
            nodeName: startName,
            nodeGroup: 'system',
            positionX: 100,
            positionY: 200,
            data: { output_variable: 'userInput_result' },
          },
        });
        await createNodeAsync({
          params: { agentId },
          data: {
            nodeId: llmId,
            nodeKind: 'llm',
            nodeLabel: 'LLM',
            nodeName: llmName,
            nodeGroup: 'ai',
            positionX: 400,
            positionY: 200,
            data: { output_variable: buildOutputVariableFromName(llmName) },
          },
        });
        await createNodeAsync({
          params: { agentId },
          data: { nodeId: answerId, nodeKind: 'answer', nodeLabel: '답변', nodeName: answerName, nodeGroup: 'system', positionX: 700, positionY: 200 },
        });
        // 자동 초기화 엣지 — 모두 비-condition source 라 kind='default'
        await createEdgeAsync({ params: { agentId }, data: { edgeId: `tmp-${ts + 100}`, srcNodeId: startId, tgtNodeId: llmId, ...getEdgeBranchAttrs(startId, llmId) } });
        await createEdgeAsync({ params: { agentId }, data: { edgeId: `tmp-${ts + 101}`, srcNodeId: llmId, tgtNodeId: answerId, ...getEdgeBranchAttrs(llmId, answerId) } });
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
        <WorkflowToolbar agentId={agentId} agentName={agentName} aoeDeployFlag={aoeDeployFlag} onOpenPlayground={handleOpenPlayground} />
        <div className="flex-1 flex items-center justify-center">
          <FallbackSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 overflow-hidden">
      <AgentPlaygroundDrawer ref={playgroundRef} />
      <WorkflowToolbar agentId={agentId} agentName={agentName} aoeDeployFlag={aoeDeployFlag} onOpenPlayground={handleOpenPlayground} />
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
        <ResizablePanelGroup direction="horizontal" autoSaveId="aoe-workflow-editor-panels" className={`flex-1 ${sidebarOpen ? 'ml-2' : ''}`}>
          <ResizablePanel id="canvas" order={1} minSize={35} className={cardClass}>
            <WorkflowCanvas agentId={agentId} graph={graph} onSelectNode={setSelectedNodeId} />
          </ResizablePanel>
          {selectedNode && (
            <>
              {/* 사이드바와 동일한 8px gap(w-2)을 핸들 자체로 차지 — hover 음영 + col-resize 커서로 드래그 표시 */}
              <ResizableHandle className="w-2 bg-transparent transition-colors hover:bg-gray-200/70" />
              <ResizablePanel id="properties" order={2} defaultSize={24} minSize={18} maxSize={50} className={cardClass}>
                <WorkflowPropertiesPanel agentId={agentId} node={selectedNode} graph={graph} onClose={() => setSelectedNodeId(null)} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
