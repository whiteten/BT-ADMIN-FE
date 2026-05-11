import { useCallback, useEffect, useMemo, useState } from 'react';
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
import HelperLines from './HelperLines';
import { NODE_DRAG_MIME, NODE_KIND_MAP } from '../constants/nodeKinds';
import { useCreateEdge, useCreateNode, useDeleteEdge, useDeleteNodes, useUpdateNodePosition, workflowQueryKeys } from '../hooks/useWorkflowQueries';
import type { FlowEdge, FlowNode, NodeDeleteRequest, WorkflowGraph } from '../types';
import { getHelperLines } from '../utils/getHelperLines';
import { getUniqueNodeLabel } from '../utils/getUniqueNodeLabel';
import { buildOutputVariableId } from '../utils/variableTokens';
import GenericKindNode from './nodes/GenericKindNode';

const NODES_WITHOUT_OUTPUT = new Set(['start', 'answer', 'condition', 'error']);

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

// 삭제 불가 보호 노드 — 시작/답변은 워크플로우의 기본 골격이라 항상 존재해야 함
const PROTECTED_NODE_KINDS = new Set(['start', 'answer']);

// Ctrl+Z 되돌리기 — 노드/엣지의 생성·삭제만 추적. 위치·properties 변경은 제외 (history 폭주 방지)
const HISTORY_LIMIT = 50;

type HistoryEntry =
  | { type: 'createNode'; node: FlowNode }
  | { type: 'deleteNodes'; nodes: FlowNode[]; edges: FlowEdge[] }
  | { type: 'createEdge'; edge: FlowEdge }
  | { type: 'deleteEdge'; edge: FlowEdge };

interface WorkflowCanvasInnerProps {
  agentId: string;
  graph: WorkflowGraph;
  onSelectNode: (nodeId: string | null) => void;
}

interface NodeActionHandlers {
  onCopy?: (nodeId: string) => void;
  onCut?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

const toReactFlowNodes = (nodes: FlowNode[] = [], handlers?: NodeActionHandlers): Node[] =>
  nodes.map((n) => ({
    id: n.nodeId,
    type: 'default',
    position: { x: n.positionX, y: n.positionY },
    deletable: !PROTECTED_NODE_KINDS.has(n.nodeKind),
    data: {
      kind: n.nodeKind,
      label: n.nodeLabel ?? NODE_KIND_MAP[n.nodeKind]?.label ?? n.nodeKind,
      description: n.description,
      ...(n.data ?? {}),
      onCopy: handlers?.onCopy,
      onCut: handlers?.onCut,
      onDelete: handlers?.onDelete,
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
  const [helperLineH, setHelperLineH] = useState<number | undefined>(undefined);
  const [helperLineV, setHelperLineV] = useState<number | undefined>(undefined);
  const [clipboard, setClipboard] = useState<FlowNode[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const pushHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => [...prev, entry].slice(-HISTORY_LIMIT));
  }, []);

  // 서버 그래프 edges 동기화 (selection 보존). nodes 는 handlers 가 정의된 후 별도 effect 에서 처리
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

  // ReactFlow remove change 발생 시 (Delete 키) 삭제할 노드 + 관련 edges 를 캡쳐. history push 용
  const captureNodesForHistory = useCallback(
    (nodeIds: string[]) => {
      const idSet = new Set(nodeIds);
      const nodesToRemove = (graph.nodes ?? []).filter((n) => idSet.has(n.nodeId));
      const edgesToRemove = (graph.edges ?? []).filter((e) => idSet.has(e.srcNodeId) || idSet.has(e.tgtNodeId));
      return { nodes: nodesToRemove, edges: edgesToRemove };
    },
    [graph.nodes, graph.edges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 보호 노드(start/answer) 의 remove change 는 차단 — deletable:false 가 우회되더라도 안전망
      const protectedIds = new Set((graph.nodes ?? []).filter((n) => PROTECTED_NODE_KINDS.has(n.nodeKind)).map((n) => n.nodeId));
      const safeChanges = changes.filter((c) => !(c.type === 'remove' && protectedIds.has(c.id)));
      if (safeChanges.length !== changes.length) {
        toast.warning('시작/답변 노드는 삭제할 수 없습니다.');
      }

      // Helper Lines — 단일 노드 드래그 시 가이드 라인 계산 + 위치 snap 보정
      setHelperLineH(undefined);
      setHelperLineV(undefined);
      if (safeChanges.length === 1) {
        const c = safeChanges[0];
        if (c.type === 'position' && c.dragging && c.position) {
          const lines = getHelperLines(c, nodes);
          if (lines.snapPosition.x !== undefined) c.position.x = lines.snapPosition.x;
          if (lines.snapPosition.y !== undefined) c.position.y = lines.snapPosition.y;
          setHelperLineH(lines.horizontal);
          setHelperLineV(lines.vertical);
        }
      }

      setNodes((prev) => applyNodeChanges(safeChanges, prev));
      const removed = safeChanges.filter((c): c is NodeChange & { type: 'remove'; id: string } => c.type === 'remove').map((c) => c.id);
      if (removed.length > 0) {
        const snapshot = captureNodesForHistory(removed);
        deleteNodes({ params: { agentId }, data: { nodeIds: removed } }, { onSuccess: () => pushHistory({ type: 'deleteNodes', nodes: snapshot.nodes, edges: snapshot.edges }) });
      }
    },
    [agentId, deleteNodes, graph.nodes, nodes, captureNodesForHistory, pushHistory],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((prev) => applyEdgeChanges(changes, prev));
      changes
        .filter((c): c is EdgeChange & { type: 'remove'; id: string } => c.type === 'remove')
        .forEach((c) => {
          const removedEdge = (graph.edges ?? []).find((e) => e.edgeId === c.id);
          deleteEdge({ agentId, edgeId: c.id }, { onSuccess: () => removedEdge && pushHistory({ type: 'deleteEdge', edge: removedEdge }) });
        });
    },
    [agentId, deleteEdge, graph.edges, pushHistory],
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
      createEdge(
        {
          params: { agentId },
          data: { edgeId: tempId, srcNodeId: connection.source, tgtNodeId: connection.target },
        },
        { onSuccess: (newEdge) => pushHistory({ type: 'createEdge', edge: newEdge }) },
      );
    },
    [agentId, createEdge, pushHistory],
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
      setHelperLineH(undefined);
      setHelperLineV(undefined);
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

  /* ========== 복사 / 잘라내기 / 붙여넣기 / 삭제 — 키보드 + NodeToolbar 공용 ========== */

  const copyNodes = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      const copyable = (graph.nodes ?? []).filter((n) => nodeIds.includes(n.nodeId) && !PROTECTED_NODE_KINDS.has(n.nodeKind));
      if (copyable.length === 0) {
        toast.warning('시작/답변 노드는 복사할 수 없습니다.');
        return;
      }
      setClipboard(copyable);
      toast.success(`${copyable.length}개 노드를 복사했습니다.`);
    },
    [graph.nodes],
  );

  const pasteNodes = useCallback(() => {
    if (clipboard.length === 0) return;
    const baseTs = Date.now();
    let labelPool: FlowNode[] = [...(graph.nodes ?? [])];
    clipboard.forEach((src, idx) => {
      const newId = `${src.nodeKind}_${baseTs + idx}`;
      const newLabel = getUniqueNodeLabel(src.nodeLabel ?? src.nodeKind, labelPool);
      const clonedData = src.data ? (JSON.parse(JSON.stringify(src.data)) as Record<string, unknown>) : {};
      if (!NODES_WITHOUT_OUTPUT.has(src.nodeKind)) {
        clonedData.output_variable = buildOutputVariableId(newLabel, newId);
      }
      const newNode: FlowNode = {
        ...src,
        nodeId: newId,
        nodeLabel: newLabel,
        positionX: src.positionX + 20,
        positionY: src.positionY + 20,
        data: clonedData,
      };
      labelPool = [...labelPool, newNode];
      createNode({ params: { agentId }, data: newNode }, { onSuccess: (created) => pushHistory({ type: 'createNode', node: created }) });
    });
  }, [clipboard, graph.nodes, agentId, createNode, pushHistory]);

  const cutNodes = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      const cuttable = (graph.nodes ?? []).filter((n) => nodeIds.includes(n.nodeId) && !PROTECTED_NODE_KINDS.has(n.nodeKind));
      if (cuttable.length === 0) {
        toast.warning('시작/답변 노드는 잘라낼 수 없습니다.');
        return;
      }
      setClipboard(cuttable);
      const snapshot = captureNodesForHistory(cuttable.map((n) => n.nodeId));
      deleteNodes(
        { params: { agentId }, data: { nodeIds: cuttable.map((n) => n.nodeId) } },
        { onSuccess: () => pushHistory({ type: 'deleteNodes', nodes: snapshot.nodes, edges: snapshot.edges }) },
      );
      toast.success(`${cuttable.length}개 노드를 잘라냈습니다.`);
    },
    [graph.nodes, agentId, deleteNodes, captureNodesForHistory, pushHistory],
  );

  const deleteSingleNode = useCallback(
    (nodeId: string) => {
      const node = (graph.nodes ?? []).find((n) => n.nodeId === nodeId);
      if (!node) return;
      if (PROTECTED_NODE_KINDS.has(node.nodeKind)) {
        toast.warning('시작/답변 노드는 삭제할 수 없습니다.');
        return;
      }
      const snapshot = captureNodesForHistory([nodeId]);
      deleteNodes({ params: { agentId }, data: { nodeIds: [nodeId] } }, { onSuccess: () => pushHistory({ type: 'deleteNodes', nodes: snapshot.nodes, edges: snapshot.edges }) });
    },
    [graph.nodes, agentId, deleteNodes, captureNodesForHistory, pushHistory],
  );

  // NodeToolbar 액션 — 각 노드의 data 에 inject. 단일 nodeId 받음
  const nodeHandlers = useMemo<NodeActionHandlers>(
    () => ({
      onCopy: (id) => copyNodes([id]),
      onCut: (id) => cutNodes([id]),
      onDelete: (id) => deleteSingleNode(id),
    }),
    [copyNodes, cutNodes, deleteSingleNode],
  );

  // 그래프 변경 또는 handlers 갱신 시 캔버스 노드 동기화 (selection 보존)
  useEffect(() => {
    setNodes((prev) => {
      const prevSelected = new Map(prev.map((p) => [p.id, p.selected]));
      return toReactFlowNodes(graph.nodes, nodeHandlers).map((n) => ({ ...n, selected: prevSelected.get(n.id) ?? false }));
    });
  }, [graph.nodes, nodeHandlers]);

  // 되돌리기 — 마지막 history entry 의 inverse 작업을 raw mutation 으로 호출 (history push X)
  const undo = useCallback(() => {
    if (history.length === 0) {
      toast.warning('되돌릴 작업이 없습니다.');
      return;
    }
    const entry = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    switch (entry.type) {
      case 'createNode':
        deleteNodes({ params: { agentId }, data: { nodeIds: [entry.node.nodeId] } });
        toast.success('노드 추가를 되돌렸습니다.');
        break;
      case 'deleteNodes':
        entry.nodes.forEach((n) => createNode({ params: { agentId }, data: n }));
        entry.edges.forEach((e) => createEdge({ params: { agentId }, data: e }));
        toast.success('노드 삭제를 되돌렸습니다.');
        break;
      case 'createEdge':
        deleteEdge({ agentId, edgeId: entry.edge.edgeId });
        toast.success('엣지 추가를 되돌렸습니다.');
        break;
      case 'deleteEdge':
        createEdge({ params: { agentId }, data: entry.edge });
        toast.success('엣지 삭제를 되돌렸습니다.');
        break;
      default:
        break;
    }
  }, [history, agentId, createNode, deleteNodes, createEdge, deleteEdge]);

  // 키보드 — Ctrl+C / Ctrl+X / Ctrl+V / Ctrl+Z (Mac: Cmd)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key !== 'c' && key !== 'x' && key !== 'v' && key !== 'z') return;
      const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);

      if (key === 'c') {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        copyNodes(selectedIds);
      } else if (key === 'x') {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        cutNodes(selectedIds);
      } else if (key === 'v') {
        if (clipboard.length === 0) return;
        e.preventDefault();
        pasteNodes();
      } else {
        // Ctrl+Z (또는 Cmd+Z). Shift 조합은 redo 용도라 무시 (현재 redo 미지원)
        if (e.shiftKey) return;
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [nodes, clipboard, copyNodes, cutNodes, pasteNodes, undo]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData(NODE_DRAG_MIME);
      if (!kind) return;
      const meta = NODE_KIND_MAP[kind];
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const baseLabel = meta?.label ?? kind;
      const uniqueLabel = getUniqueNodeLabel(baseLabel, graph.nodes ?? []);

      const newNodeId = `${kind}_${Date.now()}`;
      const newNode: FlowNode = {
        nodeId: newNodeId,
        nodeKind: kind,
        nodeLabel: uniqueLabel,
        nodeGroup: meta?.group ?? 'utility',
        positionX: Math.round(position.x - NODE_DROP_OFFSET_X),
        positionY: Math.round(position.y - NODE_DROP_OFFSET_Y),
        data: NODES_WITHOUT_OUTPUT.has(kind) ? undefined : { output_variable: buildOutputVariableId(uniqueLabel, newNodeId) },
      };
      createNode({ params: { agentId }, data: newNode }, { onSuccess: (created) => pushHistory({ type: 'createNode', node: created }) });
    },
    [agentId, createNode, graph.nodes, screenToFlowPosition, pushHistory],
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
        <HelperLines horizontal={helperLineH} vertical={helperLineV} />
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
