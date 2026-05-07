import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Background,
  BackgroundVariant,
  type Connection,
  ControlButton,
  Controls,
  type Edge,
  type EdgeChange,
  MarkerType,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './workflow.css';
import { Hand, MousePointer2 } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { NODE_DRAG_MIME, NODE_KIND_MAP } from '../constants/nodeKinds';
import { useCreateEdge, useCreateNode, useDeleteEdge, useDeleteNodes, useUpdateNodePosition, workflowQueryKeys } from '../hooks/useWorkflowQueries';
import type { FlowEdge, FlowNode, NodeDeleteRequest, WorkflowGraph } from '../types';
import GenericKindNode from './nodes/GenericKindNode';

const nodeTypes: NodeTypes = {
  default: GenericKindNode,
};

const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: '#94a3b8' },
  style: { stroke: '#94a3b8', strokeWidth: 1.5 },
};

// 노드 카드 평균 크기 — drop 위치를 노드 중앙으로 보정할 때 사용
const NODE_DROP_OFFSET_X = 110; // GenericKindNode width 220 / 2
const NODE_DROP_OFFSET_Y = 50; // 평균 height 약 100 / 2

interface WorkflowCanvasInnerProps {
  agentId: string;
  graph: WorkflowGraph;
  onSelectNode: (nodeId: string | null) => void;
}

const toReactFlowNodes = (nodes: FlowNode[] = []): Node[] =>
  nodes.map((n) => ({
    id: n.nodeId,
    type: 'default',
    position: { x: n.positionX, y: n.positionY },
    data: {
      kind: n.nodeKind,
      label: n.nodeLabel ?? NODE_KIND_MAP[n.nodeKind]?.label ?? n.nodeKind,
      description: n.description,
      ...(n.data ?? {}),
    },
  }));

const toReactFlowEdges = (edges: FlowEdge[] = []): Edge[] =>
  edges.map((e) => ({
    id: e.edgeId,
    source: e.srcNodeId,
    target: e.tgtNodeId,
    type: e.edgeType,
    animated: !!e.isAnimated,
    data: e.data,
  }));

function WorkflowCanvasInner({ agentId, graph, onSelectNode }: WorkflowCanvasInnerProps) {
  const queryClient = useQueryClient();
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes] = useState<Node[]>(() => toReactFlowNodes(graph.nodes));
  const [edges, setEdges] = useState<Edge[]>(() => toReactFlowEdges(graph.edges));
  const [interactionMode, setInteractionMode] = useState<'hand' | 'select'>('hand');

  // 서버 그래프가 갱신되면 캔버스 상태 동기화. ReactFlow 의 selection 등 UI 상태는 prev 에서 유지.
  useEffect(() => {
    setNodes((prev) => {
      const prevSelected = new Map(prev.map((p) => [p.id, p.selected]));
      return toReactFlowNodes(graph.nodes).map((n) => ({ ...n, selected: prevSelected.get(n.id) ?? false }));
    });
  }, [graph.nodes]);
  useEffect(() => {
    setEdges((prev) => {
      const prevSelected = new Map(prev.map((p) => [p.id, p.selected]));
      return toReactFlowEdges(graph.edges).map((e) => ({ ...e, selected: prevSelected.get(e.id) ?? false }));
    });
  }, [graph.edges]);

  const setGraph = useCallback(
    (updater: (old: WorkflowGraph) => WorkflowGraph) => {
      queryClient.setQueryData<WorkflowGraph>(workflowQueryKeys.graph(agentId).queryKey, (old) => (old ? updater(old) : old));
    },
    [queryClient, agentId],
  );

  const { mutate: createNode } = useCreateNode({
    mutationOptions: {
      onSuccess: (newNode) => {
        setGraph((old) => ({ ...old, nodes: [...(old.nodes ?? []), newNode] }));
      },
      onError: (error) => {
        Log.warn('createNode failed', error);
        toast.error('노드 생성에 실패했습니다.');
      },
    },
  });

  const { mutate: deleteNodes } = useDeleteNodes({
    mutationOptions: {
      onSuccess: (_data, variables: { params: { agentId: string }; data: NodeDeleteRequest }) => {
        const removedIds = new Set(variables.data.nodeIds);
        setGraph((old) => ({
          ...old,
          nodes: (old.nodes ?? []).filter((n) => !removedIds.has(n.nodeId)),
          edges: (old.edges ?? []).filter((e) => !removedIds.has(e.srcNodeId) && !removedIds.has(e.tgtNodeId)),
        }));
      },
      onError: (error) => {
        Log.warn('deleteNodes failed', error);
        toast.error('노드 삭제에 실패했습니다.');
      },
    },
  });

  const { mutate: createEdge } = useCreateEdge({
    mutationOptions: {
      onSuccess: (newEdge) => {
        setGraph((old) => ({ ...old, edges: [...(old.edges ?? []), newEdge] }));
      },
      onError: (error) => {
        Log.warn('createEdge failed', error);
        toast.error('엣지 생성에 실패했습니다.');
      },
    },
  });

  const { mutate: deleteEdge } = useDeleteEdge({
    mutationOptions: {
      onSuccess: (_data, variables: { agentId: string; edgeId: string }) => {
        setGraph((old) => ({
          ...old,
          edges: (old.edges ?? []).filter((e) => e.edgeId !== variables.edgeId),
        }));
      },
      onError: (error) => {
        Log.warn('deleteEdge failed', error);
        toast.error('엣지 삭제에 실패했습니다.');
      },
    },
  });

  const { mutate: updateNodePosition } = useUpdateNodePosition({
    mutationOptions: {
      onError: (error) => {
        Log.warn('updateNodePosition failed', error);
        toast.error('노드 위치 저장에 실패했습니다.');
      },
    },
  });

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((prev) => applyNodeChanges(changes, prev));
      const removed = changes.filter((c): c is NodeChange & { type: 'remove'; id: string } => c.type === 'remove').map((c) => c.id);
      if (removed.length > 0) {
        deleteNodes({ params: { agentId }, data: { nodeIds: removed } });
      }
    },
    [agentId, deleteNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((prev) => applyEdgeChanges(changes, prev));
      changes.filter((c): c is EdgeChange & { type: 'remove'; id: string } => c.type === 'remove').forEach((c) => deleteEdge({ agentId, edgeId: c.id }));
    },
    [agentId, deleteEdge],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const tempId = `tmp-${Date.now()}`;
      const optimistic: Edge = {
        id: tempId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      };
      setEdges((prev) => addEdge(optimistic, prev));
      createEdge({
        params: { agentId },
        data: {
          edgeId: tempId,
          srcNodeId: connection.source,
          tgtNodeId: connection.target,
        },
      });
    },
    [agentId, createEdge],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
    },
    [onSelectNode],
  );

  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const positionX = Math.round(node.position.x);
      const positionY = Math.round(node.position.y);
      setGraph((old) => ({
        ...old,
        nodes: (old.nodes ?? []).map((n) => (n.nodeId === node.id ? { ...n, positionX, positionY } : n)),
      }));
      updateNodePosition({ params: { agentId, nodeId: node.id }, data: { positionX, positionY } });
    },
    [agentId, setGraph, updateNodePosition],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData(NODE_DRAG_MIME);
      if (!kind) return;
      const meta = NODE_KIND_MAP[kind];
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const newNode: FlowNode = {
        nodeId: `${kind}_${Date.now()}`,
        nodeKind: kind,
        nodeLabel: meta?.label ?? kind,
        nodeGroup: meta?.group ?? 'utility',
        positionX: Math.round(position.x - NODE_DROP_OFFSET_X),
        positionY: Math.round(position.y - NODE_DROP_OFFSET_Y),
      };
      createNode({ params: { agentId }, data: newNode });
    },
    [agentId, createNode, screenToFlowPosition],
  );

  return (
    <div className="flex-1 h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ maxZoom: 0.9, padding: 0.25 }}
        deleteKeyCode={['Backspace', 'Delete']}
        panOnDrag={interactionMode === 'hand'}
        selectionOnDrag={interactionMode === 'select'}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#cbd5e1" />
        <MiniMap position="bottom-left" pannable zoomable maskColor="rgba(241, 245, 249, 0.7)" style={{ bottom: 48, width: 160, height: 110 }} />
        <Controls position="bottom-left" orientation="horizontal" showInteractive={false}>
          <ControlButton onClick={() => setInteractionMode('hand')} title="이동 (Hand)" className={interactionMode === 'hand' ? 'aoe-flow-control-active' : ''}>
            <Hand size={14} />
          </ControlButton>
          <ControlButton onClick={() => setInteractionMode('select')} title="선택 (Pointer)" className={interactionMode === 'select' ? 'aoe-flow-control-active' : ''}>
            <MousePointer2 size={14} />
          </ControlButton>
        </Controls>
      </ReactFlow>
    </div>
  );
}

interface WorkflowCanvasProps {
  agentId: string;
  graph: WorkflowGraph;
  onSelectNode: (nodeId: string | null) => void;
}

export default function WorkflowCanvas({ agentId, graph, onSelectNode }: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner agentId={agentId} graph={graph} onSelectNode={onSelectNode} />
    </ReactFlowProvider>
  );
}
