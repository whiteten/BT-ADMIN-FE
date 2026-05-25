import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useGetToolGroups } from '../../tool/hooks/useToolQueries';
import { NODE_DRAG_MIME, NODE_KIND_MAP } from '../constants/nodeKinds';
import { useCreateEdge, useCreateNode, useDeleteEdge, useDeleteNodes, useUpdateNode, useUpdateNodePosition, workflowQueryKeys } from '../hooks/useWorkflowQueries';
import type { FlowEdge, FlowNode, NodeDeleteRequest, WorkflowGraph } from '../types';
import { getEdgeBranchAttrs } from '../utils/edgeAttrs';
import { getHelperLines } from '../utils/getHelperLines';
import { getUniqueNodeLabel } from '../utils/getUniqueNodeLabel';
import { buildLlmToolDecorations, isToolEdgeId, isToolNodeId } from '../utils/llmToolDecorations';
import { suppressResizeObserverError } from '../utils/suppressResizeObserverError';
import { buildNodeName, buildOutputVariableFromName } from '../utils/variableTokens';

// NodeResizer 관련 무해한 경고 swallow — install 한 번만.
suppressResizeObserverError();
import GenericKindNode from './nodes/GenericKindNode';
import MemoNode, { MEMO_DEFAULT_HEIGHT, MEMO_DEFAULT_WIDTH, type MemoColor } from './nodes/MemoNode';
import ToolNode from './nodes/ToolNode';

const NODES_WITHOUT_OUTPUT = new Set(['start', 'answer', 'error']);

const nodeTypes: NodeTypes = {
  default: GenericKindNode,
  tool: ToolNode,
  memo: MemoNode,
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
  onMemoChange?: (nodeId: string, patch: { text?: string; color?: MemoColor; width?: number; height?: number }) => void;
}

const toReactFlowNodes = (nodes: FlowNode[] = [], handlers?: NodeActionHandlers): Node[] =>
  nodes.map((n) => {
    const isMemo = n.nodeKind === 'memo';
    // memo 노드 사이즈는 ReactFlow 컨테이너 (style.width/height) 에서 관리 — NodeResizer 가 직접 갱신.
    // MemoNode 외곽 div 는 100% fill 로 따라감. 이 경계가 흐릴 경우 ResizeObserver loop 발생.
    const memoData = isMemo ? ((n.data ?? {}) as { width?: number; height?: number }) : undefined;
    return {
      id: n.nodeId,
      type: isMemo ? 'memo' : 'default',
      position: { x: n.positionX, y: n.positionY },
      deletable: !PROTECTED_NODE_KINDS.has(n.nodeKind),
      ...(isMemo
        ? {
            style: {
              width: memoData?.width ?? MEMO_DEFAULT_WIDTH,
              height: memoData?.height ?? MEMO_DEFAULT_HEIGHT,
            },
          }
        : {}),
      data: {
        kind: n.nodeKind,
        label: n.nodeLabel ?? NODE_KIND_MAP[n.nodeKind]?.label ?? n.nodeKind,
        description: n.description,
        ...(n.data ?? {}),
        onCopy: handlers?.onCopy,
        onCut: handlers?.onCut,
        onDelete: handlers?.onDelete,
        onMemoChange: handlers?.onMemoChange,
      },
    };
  });

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
  const { screenToFlowPosition, getNode } = useReactFlow();

  // 도구 그룹 라벨 매핑 — LLM 노드의 default 도구 자식 노드 라벨용 (groupId → groupName).
  // 주의: default `= []` 같은 인라인 fallback 은 매 렌더 새 reference 라 useEffect deps 무한 루프 유발. fallback 은 effect 내부에서.
  const { data: toolGroups } = useGetToolGroups();

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

  /** 노드 삭제 cascade 가 처리 중인 엣지 ID 집합. onEdgesChange 의 ReactFlow auto-cascade 이중 호출 방지용. */
  const pendingEdgeDeletesRef = useRef<Set<string>>(new Set());

  // 서버 그래프 edges 동기화 (selection 보존) + LLM 도구 가상 엣지 합성.
  // nodes 는 handlers 가 정의된 후 별도 effect 에서 처리
  useEffect(() => {
    const toolGroupsMap: Record<string, string> = {};
    for (const g of toolGroups ?? []) toolGroupsMap[g.groupId] = g.groupName;
    setEdges((prev) => {
      const prevSelected = new Map(prev.map((p) => [p.id, p.selected]));
      const real = toReactFlowEdges(graph.edges);
      const { toolEdges } = buildLlmToolDecorations(graph.nodes ?? [], toolGroupsMap);
      return [...real, ...toolEdges].map((e) => ({ ...e, selected: prevSelected.get(e.id) ?? false }));
    });
  }, [graph.edges, graph.nodes, toolGroups]);

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

  const { mutateAsync: deleteNodesAsync } = useDeleteNodes({
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

  const { mutate: deleteEdge, mutateAsync: deleteEdgeAsync } = useDeleteEdge({
    mutationOptions: {
      onSuccess: (_data, variables: { agentId: string; edgeId: string }) => {
        setGraph((old) => ({
          ...old,
          edges: (old.edges ?? []).filter((e) => e.edgeId !== variables.edgeId),
        }));
      },
      onError: (error) => {
        Log.warn('deleteEdge failed', error);
      },
    },
  });

  /** 노드 삭제 + 연결된 엣지 일괄 정리. BE 가 cascade 안 하더라도 고아 엣지가 남지 않도록 FE 가 먼저 엣지를 BE 에서 제거한 뒤 노드 삭제.
   *  처리 중인 엣지 ID 를 pendingEdgeDeletesRef 에 기록해 onEdgesChange 의 중복 호출(404)을 막는다.
   *  graph 캐시도 optimistic 제거 — BE 응답 기다리는 동안 useEffect re-sync 가 삭제된 항목을 되살리는 깜빡임 방지. */
  const deleteNodesWithEdges = useCallback(
    async (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      const idSet = new Set(nodeIds);
      const connectedEdges = (graph.edges ?? []).filter((e) => idSet.has(e.srcNodeId) || idSet.has(e.tgtNodeId));
      const edgeIdSet = new Set(connectedEdges.map((e) => e.edgeId));
      connectedEdges.forEach((e) => pendingEdgeDeletesRef.current.add(e.edgeId));
      // graph 캐시 즉시 optimistic 제거 (BE 응답 전 깜빡임 방지)
      setGraph((old) => ({
        ...old,
        nodes: (old.nodes ?? []).filter((n) => !idSet.has(n.nodeId)),
        edges: (old.edges ?? []).filter((e) => !edgeIdSet.has(e.edgeId)),
      }));
      try {
        await Promise.allSettled(connectedEdges.map((e) => deleteEdgeAsync({ agentId, edgeId: e.edgeId })));
        try {
          await deleteNodesAsync({ params: { agentId }, data: { nodeIds } });
        } catch (error) {
          Log.warn('deleteNodesWithEdges — node delete failed', error);
        }
      } finally {
        connectedEdges.forEach((e) => pendingEdgeDeletesRef.current.delete(e.edgeId));
      }
    },
    [agentId, graph.edges, deleteEdgeAsync, deleteNodesAsync, setGraph],
  );

  const { mutate: updateNodePosition } = useUpdateNodePosition({
    mutationOptions: {
      onError: (error) => {
        Log.warn('updateNodePosition failed', error);
        toast.error('노드 위치 저장에 실패했습니다.');
      },
    },
  });

  // 메모 노드 인라인 편집(text/color) → BE 저장. optimistic 으로 graph cache 즉시 머지하고 BE 호출.
  const { mutate: updateNode } = useUpdateNode({
    mutationOptions: {
      onError: (error) => {
        Log.warn('updateNode (memo) failed', error);
        toast.error('메모 저장에 실패했습니다.');
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
      // 가상 도구 노드(tool- prefix)는 BE 그래프에 없으므로 삭제 BE 호출에서 제외
      const removed = safeChanges
        .filter((c): c is NodeChange & { type: 'remove'; id: string } => c.type === 'remove')
        .map((c) => c.id)
        .filter((id) => !isToolNodeId(id));
      if (removed.length > 0) {
        const snapshot = captureNodesForHistory(removed);
        deleteNodesWithEdges(removed).then(() => pushHistory({ type: 'deleteNodes', nodes: snapshot.nodes, edges: snapshot.edges }));
      }
    },
    [deleteNodesWithEdges, graph.nodes, nodes, captureNodesForHistory, pushHistory],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((prev) => applyEdgeChanges(changes, prev));
      // 가상 도구 엣지(tool-edge- prefix)는 BE 그래프에 없으므로 삭제 BE 호출에서 제외
      const removedIds = changes
        .filter((c): c is EdgeChange & { type: 'remove'; id: string } => c.type === 'remove')
        .map((c) => c.id)
        .filter((id) => !isToolEdgeId(id));
      if (removedIds.length > 0) {
        // graph 캐시 즉시 optimistic 제거 — BE 응답 전 useEffect re-sync 가 엣지를 되살리는 깜빡임 방지
        const removedIdSet = new Set(removedIds);
        setGraph((old) => ({ ...old, edges: (old.edges ?? []).filter((e) => !removedIdSet.has(e.edgeId)) }));
      }
      removedIds.forEach((id) => {
        // 노드 삭제 cascade 가 이미 처리 중인 엣지면 ReactFlow 의 auto-cascade 이중 호출 — skip
        if (pendingEdgeDeletesRef.current.has(id)) return;
        const removedEdge = (graph.edges ?? []).find((e) => e.edgeId === id);
        deleteEdge({ agentId, edgeId: id }, { onSuccess: () => removedEdge && pushHistory({ type: 'deleteEdge', edge: removedEdge }) });
      });
    },
    [agentId, deleteEdge, graph.edges, pushHistory, setGraph],
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
          data: {
            edgeId: tempId,
            srcNodeId: connection.source,
            tgtNodeId: connection.target,
            ...getEdgeBranchAttrs(connection.source, connection.target, graph.nodes),
          },
        },
        { onSuccess: (newEdge) => pushHistory({ type: 'createEdge', edge: newEdge }) },
      );
    },
    [agentId, createEdge, pushHistory, graph.nodes],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // 가상 도구 노드 클릭은 무시 — 속성 패널이 열리지 않도록
      if (isToolNodeId(node.id)) return;
      // 메모 노드는 인라인 편집이라 속성 패널 안 띄움
      if (node.type === 'memo') return;
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
      // 가상 도구 노드는 BE 그래프에 없으므로 위치 저장 호출 차단
      if (isToolNodeId(node.id)) return;
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
      const newName = buildNodeName(newId, src.nodeKind, labelPool);
      const clonedData = src.data ? (JSON.parse(JSON.stringify(src.data)) as Record<string, unknown>) : {};
      if (!NODES_WITHOUT_OUTPUT.has(src.nodeKind)) {
        clonedData.output_variable = buildOutputVariableFromName(newName);
      }
      const newNode: FlowNode = {
        ...src,
        nodeId: newId,
        nodeLabel: newLabel,
        nodeName: newName,
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
      const ids = cuttable.map((n) => n.nodeId);
      const snapshot = captureNodesForHistory(ids);
      deleteNodesWithEdges(ids).then(() => pushHistory({ type: 'deleteNodes', nodes: snapshot.nodes, edges: snapshot.edges }));
      toast.success(`${cuttable.length}개 노드를 잘라냈습니다.`);
    },
    [graph.nodes, deleteNodesWithEdges, captureNodesForHistory, pushHistory],
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
      deleteNodesWithEdges([nodeId]).then(() => pushHistory({ type: 'deleteNodes', nodes: snapshot.nodes, edges: snapshot.edges }));
    },
    [graph.nodes, deleteNodesWithEdges, captureNodesForHistory, pushHistory],
  );

  // 메모 노드 인라인 편집 콜백 — graph cache optimistic 머지 후 BE 저장.
  // - width/height 만 변경된 경우(=resize 종료): NodeResizer 가 이미 시각 반영했으므로 optimistic 스킵.
  //   useEffect [graph.nodes] 발화 → setNodes 통째 재생성 → 같은 frame reflow → 깜빡임 회피.
  //   BE 응답 후 onSuccess 의 setQueryData 에서 한 번만 동기화 → dimension 일치 → 시각 변화 없음.
  // - text·color 변경: optimistic 적용. 단 graph.nodes 의 data 에는 NodeResizer 가 적용한 최신 width/height 가 없으므로
  //   ReactFlow 의 현재 노드(getNode) 에서 회수해 합성. 안 그러면 옛 dimension 으로 BE 가 덮여 사이즈 원복됨.
  const handleMemoChange = useCallback(
    (nodeId: string, patch: { text?: string; color?: MemoColor; width?: number; height?: number }) => {
      const target = (graph.nodes ?? []).find((n) => n.nodeId === nodeId);
      if (!target) return;

      const isDimensionOnly = Object.keys(patch).length > 0 && Object.keys(patch).every((k) => k === 'width' || k === 'height');

      // NodeResizer 가 적용한 최신 dimension 회수 — text/color 변경 시 옛 사이즈로 덮어쓰지 않도록.
      // NodeResizer 는 node.width / node.height / node.measured 만 갱신하고 node.style 은 손대지 않으므로,
      // style 이 아니라 width / height / measured 에서 읽어야 함 (xyflow 12 applyChanges 동작).
      const rfNode = getNode(nodeId);
      const liveW = rfNode?.width ?? rfNode?.measured?.width;
      const liveH = rfNode?.height ?? rfNode?.measured?.height;
      const liveDimensions: { width?: number; height?: number } = {};
      if (typeof liveW === 'number') liveDimensions.width = liveW;
      if (typeof liveH === 'number') liveDimensions.height = liveH;

      const nextData = { ...(target.data ?? {}), ...liveDimensions, ...patch };
      const merged: FlowNode = { ...target, data: nextData };

      if (!isDimensionOnly) {
        setGraph((old) => ({
          ...old,
          nodes: (old.nodes ?? []).map((n) => (n.nodeId === nodeId ? merged : n)),
        }));
      }
      updateNode({ params: { agentId, nodeId }, data: merged });
    },
    [agentId, graph.nodes, getNode, setGraph, updateNode],
  );

  // NodeToolbar 액션 — 각 노드의 data 에 inject. 단일 nodeId 받음
  const nodeHandlers = useMemo<NodeActionHandlers>(
    () => ({
      onCopy: (id) => copyNodes([id]),
      onCut: (id) => cutNodes([id]),
      onDelete: (id) => deleteSingleNode(id),
      onMemoChange: handleMemoChange,
    }),
    [copyNodes, cutNodes, deleteSingleNode, handleMemoChange],
  );

  // 그래프 변경 또는 handlers 갱신 시 캔버스 노드 동기화 (selection 보존) + LLM 도구 가상 노드 합성
  useEffect(() => {
    const toolGroupsMap: Record<string, string> = {};
    for (const g of toolGroups ?? []) toolGroupsMap[g.groupId] = g.groupName;
    setNodes((prev) => {
      const prevSelected = new Map(prev.map((p) => [p.id, p.selected]));
      const real = toReactFlowNodes(graph.nodes, nodeHandlers);
      const { toolNodes } = buildLlmToolDecorations(graph.nodes ?? [], toolGroupsMap);
      return [...real, ...toolNodes].map((n) => ({ ...n, selected: prevSelected.get(n.id) ?? false }));
    });
  }, [graph.nodes, nodeHandlers, toolGroups]);

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
        deleteNodesWithEdges([entry.node.nodeId]);
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
  }, [history, agentId, createNode, deleteNodesWithEdges, createEdge, deleteEdge]);

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
      const newNodeName = buildNodeName(newNodeId, kind, graph.nodes ?? []);
      const newNode: FlowNode = {
        nodeId: newNodeId,
        nodeKind: kind,
        nodeLabel: uniqueLabel,
        nodeName: newNodeName,
        nodeGroup: meta?.group ?? 'utility',
        positionX: Math.round(position.x - NODE_DROP_OFFSET_X),
        positionY: Math.round(position.y - NODE_DROP_OFFSET_Y),
        data: NODES_WITHOUT_OUTPUT.has(kind) ? undefined : { output_variable: buildOutputVariableFromName(newNodeName) },
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
