/** 에이전트가 워크플로우 그래프에서 실제로 사용 중인 리소스(RAG/Tool/MCP) 집계 결과. */
export interface AgentResources {
  knowledge: { documentId: string; documentName: string }[];
  tools: { toolName: string; groupId: string }[];
  mcp: { serverName: string; toolNames: string[] }[];
}
