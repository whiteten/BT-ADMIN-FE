import type { FlowNode } from '../../workflow/types';
import type { AgentResources } from '../types';

interface RagConfigItemLike {
  documentId?: string;
  documentName?: string;
}

/**
 * Agent 의 workflow graph 노드에서 실제 사용 중인 리소스(RAG/Tool/MCP)를 집계.
 *
 * 데이터 출처(노드에 이미 이름이 저장되어 있어 추가 조회 불필요):
 * - RAG  : `knowledgeSearch` 노드 `data.rag_config[] = { documentId, documentName }`
 * - Tool : `llm` 노드 `data.tool_list.default = { groupId: toolName[] }` (그룹명은 별도 매핑)
 * - MCP  : `llm` 노드 `data.tool_list.mcp = { serverName: toolName[] }`
 *
 * 같은 리소스가 여러 노드에 쓰여도 1번만 (Set 으로 dedupe). 정공법은 extractSkillsFromGraph 와 동일.
 */
export const extractAgentResourcesFromGraph = (nodes: FlowNode[]): AgentResources => {
  const knowledge: AgentResources['knowledge'] = [];
  const knowledgeSeen = new Set<string>();

  const tools: AgentResources['tools'] = [];
  const toolSeen = new Set<string>();

  // serverName -> toolName[] (Set 으로 dedupe)
  const mcpMap = new Map<string, Set<string>>();

  for (const node of nodes) {
    if (node.nodeKind === 'knowledgeSearch') {
      const ragConfig = (node.data?.rag_config as RagConfigItemLike[] | undefined) ?? [];
      for (const item of ragConfig) {
        const documentId = item.documentId;
        if (!documentId || knowledgeSeen.has(documentId)) continue;
        knowledgeSeen.add(documentId);
        knowledge.push({ documentId, documentName: item.documentName ?? documentId });
      }
      continue;
    }

    if (node.nodeKind === 'llm') {
      const toolList = node.data?.tool_list as { default?: Record<string, string[]>; mcp?: Record<string, string[]> } | undefined;

      for (const [groupId, toolNames] of Object.entries(toolList?.default ?? {})) {
        if (!Array.isArray(toolNames)) continue;
        for (const toolName of toolNames) {
          if (toolSeen.has(toolName)) continue;
          toolSeen.add(toolName);
          tools.push({ toolName, groupId });
        }
      }

      for (const [serverName, toolNames] of Object.entries(toolList?.mcp ?? {})) {
        if (!Array.isArray(toolNames)) continue;
        const bucket = mcpMap.get(serverName) ?? new Set<string>();
        for (const toolName of toolNames) bucket.add(toolName);
        mcpMap.set(serverName, bucket);
      }
    }
  }

  const mcp = Array.from(mcpMap.entries()).map(([serverName, toolNames]) => ({ serverName, toolNames: Array.from(toolNames) }));

  return { knowledge, tools, mcp };
};
