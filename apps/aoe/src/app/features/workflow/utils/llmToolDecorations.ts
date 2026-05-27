import type { Edge, Node } from '@xyflow/react';
import type { FlowNode } from '../types';

/** 가상 도구 노드/엣지 식별 prefix. ID 가 이걸로 시작하면 BE 그래프에 존재하지 않는 derive 전용 객체. */
export const TOOL_NODE_PREFIX = 'tool-';
export const TOOL_EDGE_PREFIX = 'tool-edge-';

export const isToolNodeId = (id: string) => id.startsWith(TOOL_NODE_PREFIX);
export const isToolEdgeId = (id: string) => id.startsWith(TOOL_EDGE_PREFIX);

/** GenericKindNode 카드 width(220) + LLM 카드 하단까지 대략 거리. AS-IS 와 동일한 toolSpacing 80 사용. */
const TOOL_DECORATION = {
  spacingX: 90,
  offsetY: 150,
  cardWidth: 220,
  // 가상 노드 자체 width 의 절반(시각 중앙 정렬용)
  halfNodeWidth: 18,
} as const;

export interface ToolDecoration {
  toolNodes: Node[];
  toolEdges: Edge[];
}

/**
 * LLM 노드의 mcpSettings / tool_list 로부터 자식 도구 가상 노드·엣지를 합성.
 *
 * - mcp 도구: 서버명 단위 그룹화된 노드 (toolType: 'mcp')
 * - default 도구: 그룹ID 단위로 묶인 노드. 라벨은 toolGroupsMap 매핑 우선, 없으면 ID 그대로 (toolType: 'default')
 * - 가상 노드는 selectable / draggable / deletable false 로 모든 사용자 조작 차단
 * - BE 그래프 / deploy JSON 에는 포함되지 않음 (derive only)
 */
export const buildLlmToolDecorations = (flowNodes: FlowNode[], toolGroupsMap: Record<string, string>): ToolDecoration => {
  const toolNodes: Node[] = [];
  const toolEdges: Edge[] = [];

  for (const src of flowNodes) {
    if (src.nodeKind !== 'llm') continue;
    const data = (src.data ?? {}) as Record<string, unknown>;

    const mcpSettings = data.mcpSettings as { enabled?: boolean; selectedMCPs?: string[]; mcpList?: { server_name: string; tool_name: string }[] } | undefined;
    const toolList = data.tool_list as { default?: Record<string, string[]>; mcp?: Record<string, string[]> } | undefined;

    // MCP — 선택된 도구가 속한 서버명 unique 목록
    const mcpServers: string[] = [];
    if (mcpSettings?.enabled && mcpSettings.mcpList && mcpSettings.selectedMCPs) {
      const seen = new Set<string>();
      for (const item of mcpSettings.mcpList) {
        if (mcpSettings.selectedMCPs.includes(item.tool_name) && !seen.has(item.server_name)) {
          seen.add(item.server_name);
          mcpServers.push(item.server_name);
        }
      }
    }

    // default — tool_list.default 의 그룹ID (도구 1개 이상 보유한 그룹만)
    const defaultGroupIds: string[] = [];
    if (toolList?.default) {
      for (const [groupId, tools] of Object.entries(toolList.default)) {
        if (Array.isArray(tools) && tools.length > 0) defaultGroupIds.push(groupId);
      }
    }

    const allChildren: { id: string; label: string; toolType: 'mcp' | 'default' }[] = [
      ...mcpServers.map((name) => ({ id: name, label: name, toolType: 'mcp' as const })),
      ...defaultGroupIds.map((id) => ({ id, label: toolGroupsMap[id] ?? id, toolType: 'default' as const })),
    ];
    if (allChildren.length === 0) continue;

    const startX = src.positionX + TOOL_DECORATION.cardWidth / 2 - ((allChildren.length - 1) * TOOL_DECORATION.spacingX) / 2;
    const baseY = src.positionY + TOOL_DECORATION.offsetY;

    allChildren.forEach((child, idx) => {
      const toolNodeId = `${TOOL_NODE_PREFIX}${src.nodeId}-${child.toolType}-${child.id}`;
      toolNodes.push({
        id: toolNodeId,
        type: 'tool',
        position: { x: Math.round(startX + idx * TOOL_DECORATION.spacingX - TOOL_DECORATION.halfNodeWidth), y: Math.round(baseY) },
        data: { label: child.label, toolType: child.toolType, parentNodeId: src.nodeId },
        selectable: false,
        draggable: false,
        deletable: false,
      });
      toolEdges.push({
        id: `${TOOL_EDGE_PREFIX}${src.nodeId}-${toolNodeId}`,
        source: src.nodeId,
        sourceHandle: 'tool',
        target: toolNodeId,
        targetHandle: 'tool',
        type: 'default',
        deletable: false,
        selectable: false,
        focusable: false,
        style: { stroke: '#8B5CF6', strokeWidth: 1.5, strokeDasharray: '5 5', opacity: 0.7 },
      });
    });
  }

  return { toolNodes, toolEdges };
};
