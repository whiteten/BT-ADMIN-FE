/**
 * 번호자원 위상도 캔버스 — react-flow 래퍼 (PLAN-FE §4.5).
 *
 * 목업 #topoCanvas/#topoInner 의 수동 pan/wheel-zoom/SVG 를 react-flow 내장으로 교체:
 *  - panOnDrag / zoomOnScroll / fitView / <Controls> / <MiniMap> / <Background>.
 *  - 읽기 전용: nodesDraggable=false, nodesConnectable=false, elementsSelectable=true.
 *  - 노드 카드 = DnServerCardNode, 클러스터 = DnClusterGroupNode, DR = 엣지.
 *  - 노드 클릭(헤더/자원행)은 카드 내부 콜백(data.onOpenSidebar), 엣지 클릭은 onEdgeClick.
 */
import { useEffect, useMemo } from 'react';
import { Background, BackgroundVariant, Controls, type Edge, MiniMap, type Node, type NodeTypes, ReactFlow, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import DnClusterGroupNode from './nodes/DnClusterGroupNode';
import DnServerCardNode from './nodes/DnServerCardNode';

const nodeTypes: NodeTypes = {
  dnServerCard: DnServerCardNode,
  dnCluster: DnClusterGroupNode,
};

interface DnTopologyCanvasProps {
  nodes: Node[];
  edges: Edge[];
  /** 엣지(DR) 클릭 — DR 백업 DN 드릴다운 */
  onEdgeOpen: (fromNodeId: number, toNodeId: number) => void;
  /** pane 클릭 — 사이드바 닫기 */
  onPaneClick: () => void;
}

export default function DnTopologyCanvas({ nodes, edges, onEdgeOpen, onPaneClick }: DnTopologyCanvasProps) {
  const { fitView } = useReactFlow();

  // 노드 집합이 바뀌면(데이터 첫 로드/노드 수 변동) 화면 맞춤. 셀 단위 데이터 갱신엔 재맞춤 안 함.
  const nodeCount = nodes.length;
  useEffect(() => {
    if (nodeCount > 0) {
      // 다음 프레임에 fitView (노드 measured 후)
      const id = requestAnimationFrame(() => fitView({ padding: 0.2, maxZoom: 1, duration: 200 }));
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [nodeCount, fitView]);

  const onEdgeClick = useMemo(
    () => (_event: React.MouseEvent, edge: Edge) => {
      const data = edge.data as { fromNodeId?: number; toNodeId?: number } | undefined;
      if (data?.fromNodeId != null && data.toNodeId != null) {
        onEdgeOpen(data.fromNodeId, data.toNodeId);
      }
    },
    [onEdgeOpen],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      edgesFocusable
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      panOnDrag
      zoomOnScroll
      minZoom={0.4}
      maxZoom={2}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={26} size={1.4} color="#cbd5e1" />
      <Controls showInteractive={false} position="bottom-left" />
      <MiniMap pannable zoomable maskColor="rgba(241, 245, 249, 0.6)" nodeColor="#cbd5e1" nodeStrokeColor="transparent" nodeBorderRadius={4} style={{ width: 160, height: 110 }} />
    </ReactFlow>
  );
}
