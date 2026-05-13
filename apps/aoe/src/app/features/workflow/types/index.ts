export interface FlowNode {
  nodeId: string;
  nodeKind: string;
  /** UI 표시용 사용자 친화 라벨 (한국어 가능) */
  nodeLabel?: string;
  /** 변수 시스템용 짧은 식별자 (`<kind>_<N>` 형식, 자동 부여, unique 보장). output_variable = `<nodeName>_result` */
  nodeName?: string;
  nodeGroup?: string;
  positionX: number;
  positionY: number;
  description?: string;
  data?: Record<string, unknown>;
}

export interface FlowEdge {
  edgeId: string;
  srcNodeId: string;
  tgtNodeId: string;
  /** AOE 엔진 분기 구분 — condition 노드에서 나가는 엣지는 'branch', 그 외 'default'. DB EDGE_TYPE 컬럼 */
  edgeType?: 'default' | 'branch';
  isAnimated?: boolean;
  data?: Record<string, unknown>;
}

export interface WorkflowGraph {
  agentId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface NodeDeleteRequest {
  nodeIds: string[];
}

export interface NodePositionUpdateRequest {
  positionX: number;
  positionY: number;
}

export interface AgentDeployResponse {
  agentId: string;
  aoeApiKey: string;
  aoeHash: string;
  aoeDeployFlag: number;
  deployTime: string;
  resultCode: 'S' | 'A';
  message: string;
}
