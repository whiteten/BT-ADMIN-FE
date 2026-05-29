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
import GenericKindNode from './nodes/GenericKindNode';
import MemoNode, { MEMO_DEFAULT_HEIGHT, MEMO_DEFAULT_WIDTH, type MemoColor } from './nodes/MemoNode';
import ToolNode from './nodes/ToolNode';

// NodeResizer 관련 무해한 경고 swallow — install 한 번만.
suppressResizeObserverError();

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

const toReactFlowNode = (n: FlowNode, handlers?: NodeActionHandlers): Node => {
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
};

const toReactFlowEdge = (e: FlowEdge): Edge => ({
  id: e.edgeId,
  source: e.srcNodeId,
  target: e.tgtNodeId,
  type: e.edgeType,
  animated: !!e.isAnimated,
  data: e.data,
});

/**
 * 카드에 보이는 데이터만 추려 stringify — RF Node 캐시 무효화 판정용.
 *
 * ReactFlow 의 엣지 컴포넌트는 source/target 노드의 RF Node 전체 reference 를 구독한다.
 * LLM systemPrompt 같이 카드에 안 보이는 data 변경마다 RF Node reference 가 갈리면 연결 엣지가 매번 다시 그려지므로,
 * "카드 렌더에 영향 없는 변경" 은 fingerprint 동일로 판정해 prev RF Node 를 통째로 재사용한다.
 *
 * 키 구성 = label · description · kind + GenericKindNode.renderDetail 이 읽는 kind 별 필드.
 * MemoNode 는 자체 textarea draft 가 있어 부모 재렌더 없이 입력 가능하지만, 외부 BE 동기화 후 표시 텍스트가 바뀌므로 text 도 포함.
 */
const getNodeCardFingerprint = (n: FlowNode): string => {
  const d = (n.data ?? {}) as Record<string, unknown>;
  const base = `${n.nodeLabel ?? ''}|${n.description ?? ''}|${n.nodeKind}`;
  switch (n.nodeKind) {
    case 'llm': {
      const v = d.modelVersion ?? d.modelName ?? d.name ?? d.model_id ?? '';
      return `${base}|${String(v)}|${String(d.modelTypeName ?? '')}`;
    }
    case 'knowledgeSearch': {
      const ids = Array.isArray(d.documentIds) ? d.documentIds.length : Array.isArray(d.rag_config) ? (d.rag_config as unknown[]).length : 0;
      return `${base}|${ids}`;
    }
    case 'databaseSearch': {
      const conn = d.dbConnection as { dbType?: string; host?: string } | undefined;
      return `${base}|${conn?.dbType ?? d.dbType ?? ''}|${conn?.host ?? d.host ?? ''}`;
    }
    case 'http':
      return `${base}|${String(d.method ?? '')}|${String(d.url ?? '')}`;
    case 'a2a_agent':
      return `${base}|${String(d.agentName ?? d.name ?? '')}`;
    case 'guardrail':
      return `${base}|${String(d.moderation_type ?? '')}`;
    case 'condition': {
      const ct = (d.condition_type as string) ?? 'operator';
      const len = ct === 'operator' ? (Array.isArray(d.cases) ? d.cases.length : 0) : Array.isArray(d.routes) ? (d.routes as unknown[]).length : 0;
      return `${base}|${ct}|${len}`;
    }
    case 'error':
      return `${base}|${String(d.errorMessage ?? '')}`;
    case 'memo':
      return `${base}|${String(d.color ?? '')}|${String(d.width ?? '')}|${String(d.height ?? '')}|${String(d.text ?? '')}`;
    default:
      return base;
  }
};

function WorkflowCanvasInner({ agentId, graph, onSelectNode }: WorkflowCanvasInnerProps) {
  const queryClient = useQueryClient();
  const { screenToFlowPosition, getNode } = useReactFlow();

  // 도구 그룹 라벨 매핑 — LLM 노드의 default 도구 자식 노드 라벨용 (groupId → groupName).
  // 주의: default `= []` 같은 인라인 fallback 은 매 렌더 새 reference 라 useEffect deps 무한 루프 유발. fallback 은 effect 내부에서.
  const { data: toolGroups } = useGetToolGroups();

  const [nodes, setNodes] = useState<Node[]>(() => (graph.nodes ?? []).map((n) => toReactFlowNode(n)));
  const [edges, setEdges] = useState<Edge[]>(() => (graph.edges ?? []).map(toReactFlowEdge));

  // RF Node/Edge 캐시 — src FlowNode/FlowEdge reference 가 동일하면 캐시된 RF 객체를 재사용해
  // ReactFlow 가 변경 없는 노드/엣지를 다시 렌더하지 않도록 함. handlers 가 바뀌면 전체 무효화.
  // 노드는 fingerprint(카드에 보이는 데이터)까지 비교해서 reference 보존 폭을 넓힘 — 엣지 깜빡임 방지.
  const rfNodeCacheRef = useRef<{ handlers: NodeActionHandlers | null; map: Map<string, { src: FlowNode; fp: string; rf: Node }> }>({ handlers: null, map: new Map() });
  const rfEdgeCacheRef = useRef<Map<string, { src: FlowEdge; rf: Edge }>>(new Map());

  // 핸들러용 graph 최신값 참조 — 핸들러 useCallback 이 graph.nodes/edges 를 deps 에 넣으면
  // 키스트로크마다 재생성되어 nodeHandlers → RF 캐시까지 전부 무효화됨. ref 로 빼서 stable identity 유지.
  const graphRef = useRef(graph);
  useEffect(() => {
    graphRef.current = graph;
  });
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
  // 변경 없는 엣지는 캐시로 reference 보존 → ReactFlow 가 매 키스트로크마다 전체 엣지를 다시 그리지 않도록 함.
  // nodes 는 handlers 가 정의된 후 별도 effect 에서 처리.
  useEffect(() => {
    const toolGroupsMap: Record<string, string> = {};
    for (const g of toolGroups ?? []) toolGroupsMap[g.groupId] = g.groupName;
    const cache = rfEdgeCacheRef.current;
    const real: Edge[] = (graph.edges ?? []).map((src) => {
      const cached = cache.get(src.edgeId);
      if (cached && cached.src === src) return cached.rf;
      const rf = toReactFlowEdge(src);
      cache.set(src.edgeId, { src, rf });
      return rf;
    });
    // GC — 그래프에서 사라진 엣지 캐시 제거
    const liveIds = new Set((graph.edges ?? []).map((e) => e.edgeId));
    for (const id of cache.keys()) if (!liveIds.has(id)) cache.delete(id);
    const { toolEdges } = buildLlmToolDecorations(graph.nodes ?? [], toolGroupsMap);
    setEdges((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]));
      return [...real, ...toolEdges].map((e) => {
        const old = prevById.get(e.id);
        const selected = old?.selected ?? false;
        // selection 외 모든 필드가 prev 와 동일하면 prev reference 그대로 — RF 가 해당 엣지 미터치
        if (old && old === e && old.selected === selected) return old;
        if (old && old.source === e.source && old.target === e.target && old.type === e.type && old.animated === e.animated && old.data === e.data && old.selected === selected) {
          return old;
        }
        return e.selected === selected ? e : { ...e, selected };
      });
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
      const connectedEdges = (graphRef.current.edges ?? []).filter((e) => idSet.has(e.srcNodeId) || idSet.has(e.tgtNodeId));
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
    [agentId, deleteEdgeAsync, deleteNodesAsync, setGraph],
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
  // dimension-only 변경(resize)은 optimistic 을 스킵하므로, BE 응답을 캐시에 머지해야 다른 노드 갱신 시 옛 사이즈로 원복되지 않음.
  const { mutate: updateNode } = useUpdateNode({
    mutationOptions: {
      onSuccess: (updated) => {
        setGraph((old) => ({
          ...old,
          nodes: (old.nodes ?? []).map((n) => (n.nodeId === updated.nodeId ? updated : n)),
        }));
      },
      onError: (error) => {
        Log.warn('updateNode (memo) failed', error);
        toast.error('메모 저장에 실패했습니다.');
      },
    },
  });

  // ReactFlow remove change 발생 시 (Delete 키) 삭제할 노드 + 관련 edges 를 캡쳐. history push 용
  const captureNodesForHistory = useCallback((nodeIds: string[]) => {
    const idSet = new Set(nodeIds);
    const nodesToRemove = (graphRef.current.nodes ?? []).filter((n) => idSet.has(n.nodeId));
    const edgesToRemove = (graphRef.current.edges ?? []).filter((e) => idSet.has(e.srcNodeId) || idSet.has(e.tgtNodeId));
    return { nodes: nodesToRemove, edges: edgesToRemove };
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 보호 노드(start/answer) 의 remove change 는 차단 — deletable:false 가 우회되더라도 안전망
      const protectedIds = new Set((graphRef.current.nodes ?? []).filter((n) => PROTECTED_NODE_KINDS.has(n.nodeKind)).map((n) => n.nodeId));
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
    [deleteNodesWithEdges, nodes, captureNodesForHistory, pushHistory],
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
        const removedEdge = (graphRef.current.edges ?? []).find((e) => e.edgeId === id);
        deleteEdge({ agentId, edgeId: id }, { onSuccess: () => removedEdge && pushHistory({ type: 'deleteEdge', edge: removedEdge }) });
      });
    },
    [agentId, deleteEdge, pushHistory, setGraph],
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
            ...getEdgeBranchAttrs(connection.source, connection.target, graphRef.current.nodes),
          },
        },
        { onSuccess: (newEdge) => pushHistory({ type: 'createEdge', edge: newEdge }) },
      );
    },
    [agentId, createEdge, pushHistory],
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

  const copyNodes = useCallback((nodeIds: string[]) => {
    if (nodeIds.length === 0) return;
    const copyable = (graphRef.current.nodes ?? []).filter((n) => nodeIds.includes(n.nodeId) && !PROTECTED_NODE_KINDS.has(n.nodeKind));
    if (copyable.length === 0) {
      toast.warning('시작/답변 노드는 복사할 수 없습니다.');
      return;
    }
    setClipboard(copyable);
    toast.success(`${copyable.length}개 노드를 복사했습니다.`);
  }, []);

  const pasteNodes = useCallback(() => {
    if (clipboard.length === 0) return;
    const baseTs = Date.now();
    let labelPool: FlowNode[] = [...(graphRef.current.nodes ?? [])];
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
  }, [clipboard, agentId, createNode, pushHistory]);

  const cutNodes = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      const cuttable = (graphRef.current.nodes ?? []).filter((n) => nodeIds.includes(n.nodeId) && !PROTECTED_NODE_KINDS.has(n.nodeKind));
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
    [deleteNodesWithEdges, captureNodesForHistory, pushHistory],
  );

  const deleteSingleNode = useCallback(
    (nodeId: string) => {
      const node = (graphRef.current.nodes ?? []).find((n) => n.nodeId === nodeId);
      if (!node) return;
      if (PROTECTED_NODE_KINDS.has(node.nodeKind)) {
        toast.warning('시작/답변 노드는 삭제할 수 없습니다.');
        return;
      }
      const snapshot = captureNodesForHistory([nodeId]);
      deleteNodesWithEdges([nodeId]).then(() => pushHistory({ type: 'deleteNodes', nodes: snapshot.nodes, edges: snapshot.edges }));
    },
    [deleteNodesWithEdges, captureNodesForHistory, pushHistory],
  );

  // 메모 노드 인라인 편집 콜백 — graph cache optimistic 머지 후 BE 저장.
  // - width/height 만 변경된 경우(=resize 종료): NodeResizer 가 이미 시각 반영했으므로 optimistic 스킵.
  //   useEffect [graph.nodes] 발화 → setNodes 통째 재생성 → 같은 frame reflow → 깜빡임 회피.
  //   BE 응답 후 onSuccess 의 setQueryData 에서 한 번만 동기화 → dimension 일치 → 시각 변화 없음.
  // - text·color 변경: optimistic 적용. 단 graph.nodes 의 data 에는 NodeResizer 가 적용한 최신 width/height 가 없으므로
  //   ReactFlow 의 현재 노드(getNode) 에서 회수해 합성. 안 그러면 옛 dimension 으로 BE 가 덮여 사이즈 원복됨.
  const handleMemoChange = useCallback(
    (nodeId: string, patch: { text?: string; color?: MemoColor; width?: number; height?: number }) => {
      const target = (graphRef.current.nodes ?? []).find((n) => n.nodeId === nodeId);
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
    [agentId, getNode, setGraph, updateNode],
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

  // 그래프 변경 또는 handlers 갱신 시 캔버스 노드 동기화 (selection 보존) + LLM 도구 가상 노드 합성.
  // 변경 없는 노드는 캐시로 reference 보존 → ReactFlow 가 매 키스트로크마다 메모·미변경 노드를 다시 그리지 않도록 함.
  // 캐시 키는 (src FlowNode reference, nodeHandlers). handlers 가 바뀌면 전체 무효화.
  useEffect(() => {
    const toolGroupsMap: Record<string, string> = {};
    for (const g of toolGroups ?? []) toolGroupsMap[g.groupId] = g.groupName;
    if (rfNodeCacheRef.current.handlers !== nodeHandlers) {
      rfNodeCacheRef.current = { handlers: nodeHandlers, map: new Map() };
    }
    const cache = rfNodeCacheRef.current.map;
    const real: Node[] = (graph.nodes ?? []).map((src) => {
      const cached = cache.get(src.nodeId);
      if (cached && cached.src === src) return cached.rf;
      const fp = getNodeCardFingerprint(src);
      // src 가 바뀌었지만 카드 표시 데이터(fingerprint) + 위치/스타일까지 동일하면 prev RF Node 통째 재사용.
      // → ReactFlow 내부 store nodeLookup 엔트리도 그대로 → 연결 엣지 selector 결과 reference-equal → 엣지 re-render 차단.
      if (cached && cached.fp === fp && cached.rf.position.x === src.positionX && cached.rf.position.y === src.positionY) {
        cache.set(src.nodeId, { src, fp, rf: cached.rf });
        return cached.rf;
      }
      const rf = toReactFlowNode(src, nodeHandlers);
      // fp 가 달라 RF Node 를 새로 만들더라도, 위치/스타일 값이 그대로면 sub-object reference 보존.
      if (cached) {
        if (cached.rf.position.x === rf.position.x && cached.rf.position.y === rf.position.y) {
          rf.position = cached.rf.position;
        }
        const ps = cached.rf.style as { width?: number; height?: number } | undefined;
        const ns = rf.style as { width?: number; height?: number } | undefined;
        if (ps && ns && ps.width === ns.width && ps.height === ns.height) {
          rf.style = cached.rf.style;
        }
      }
      cache.set(src.nodeId, { src, fp, rf });
      return rf;
    });
    // GC — 그래프에서 사라진 노드 캐시 제거
    const liveIds = new Set((graph.nodes ?? []).map((n) => n.nodeId));
    for (const id of cache.keys()) if (!liveIds.has(id)) cache.delete(id);
    const { toolNodes } = buildLlmToolDecorations(graph.nodes ?? [], toolGroupsMap);
    setNodes((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]));
      return [...real, ...toolNodes].map((n) => {
        const old = prevById.get(n.id);
        const selected = old?.selected ?? false;
        if (old && old === n && old.selected === selected) return old;
        if (old && old.data === n.data && old.position === n.position && old.style === n.style && old.type === n.type && old.selected === selected) {
          return old;
        }
        return n.selected === selected ? n : { ...n, selected };
      });
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
      const uniqueLabel = getUniqueNodeLabel(baseLabel, graphRef.current.nodes ?? []);

      const newNodeId = `${kind}_${Date.now()}`;
      const newNodeName = buildNodeName(newNodeId, kind, graphRef.current.nodes ?? []);
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
    [agentId, createNode, screenToFlowPosition, pushHistory],
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
        proOptions={{ hideAttribution: true }}
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
