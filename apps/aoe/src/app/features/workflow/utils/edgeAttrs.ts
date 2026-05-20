import type { FlowEdge, FlowNode } from '../types';

/**
 * source 노드 종류에 따라 엣지의 AOE 엔진용 속성을 결정.
 * - condition 노드에서 나가는 엣지: edgeType='branch', isAnimated=true, data.label=tgtNodeId
 *   (엔진 `make_condition_node` 가 분기 엣지를 식별)
 * - 그 외: edgeType='default'
 *
 * 분기 라벨은 별도 DB 컬럼이 없어 EDGE_DATA(JSON) 의 `label` 키에 저장.
 */
export const getEdgeBranchAttrs = (srcNodeId: string, tgtNodeId: string, nodes: FlowNode[] = []): Pick<FlowEdge, 'edgeType' | 'isAnimated' | 'data'> => {
  const src = nodes.find((n) => n.nodeId === srcNodeId);
  if (src?.nodeKind === 'condition') {
    return { edgeType: 'branch', isAnimated: true, data: { label: tgtNodeId } };
  }
  return { edgeType: 'default' };
};
