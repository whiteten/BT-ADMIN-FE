export interface FlowNode {
  nodeId: string;
  nodeKind: string;
  nodeLabel?: string;
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
  edgeType?: string;
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
