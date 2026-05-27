import type { ToolItem } from '../../tool/types';
import type { FlowNode } from '../../workflow/types';
import type { A2ASkill } from '../types';

/**
 * Agent 의 workflow graph 와 도구 그룹 메타로부터 A2A Skills 초기값을 도출.
 *
 * 데이터 흐름:
 * 1. graph.nodes 중 LLM 노드의 `data.tool_list.default = { groupId: toolName[] }` 를 평탄화
 * 2. 같은 toolName 이 여러 LLM 노드에 쓰여도 1번만 (`seen` Set 으로 O(1) unique)
 * 3. `toolsByGroup[groupId]` 에서 toolName 매칭해 description 회수 (없으면 빈 문자열)
 *
 * 매핑 규칙: Skill 명 = Tool Name, 설명 = Tool Description, tags/examples 는 빈 배열 (사용자가 추후 보강).
 * skillId 는 신규 생성용 임시 id (`tmp-*`) — 그리드 row key 충돌 방지용. BE 전송 직전에 제거됨.
 */
export const extractSkillsFromGraph = (nodes: FlowNode[], toolsByGroup: Record<string, ToolItem[]>): A2ASkill[] => {
  const seen = new Set<string>();
  const result: A2ASkill[] = [];

  for (const node of nodes) {
    if (node.nodeKind !== 'llm') continue;
    const toolList = (node.data?.tool_list as { default?: Record<string, string[]> } | undefined)?.default ?? {};
    for (const [groupId, toolNames] of Object.entries(toolList)) {
      if (!Array.isArray(toolNames)) continue;
      for (const toolName of toolNames) {
        if (seen.has(toolName)) continue;
        seen.add(toolName);
        const tool = toolsByGroup[groupId]?.find((t) => t.toolName === toolName);
        result.push({
          skillId: `tmp-${toolName}`,
          skillName: toolName,
          description: tool?.description ?? '',
          tags: [],
          examples: [],
        });
      }
    }
  }

  return result;
};
