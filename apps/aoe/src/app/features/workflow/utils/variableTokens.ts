import { SYS_VARIABLES } from '../constants/sysVariables';
import type { FlowNode, WorkflowGraph } from '../types';

export interface UpstreamVariable {
  /** 텍스트 임베드 시 토큰 본체. 예: "llm_xxx_result", "userinput", "sys.user_id" */
  id: string;
  /** dropdown 표시용 라벨. nodeLabel 또는 변수명 */
  label: string;
  /** 보조 표시 (출처 노드 이름 또는 'sys') */
  source?: string;
  /** "String" | "Array[File]" 등 */
  type: string;
}

interface StartVariable {
  name: string;
  type?: string;
  required?: boolean;
}

const asRecord = (data: unknown): Record<string, unknown> => (data && typeof data === 'object' ? (data as Record<string, unknown>) : {});

/** 텍스트에 등장한 모든 {{...}} 토큰 추출 (공백 트리밍, 중복 제거, 빈 토큰 제외) */
export const parseVariableTokens = (text: string): string[] => {
  if (!text) return [];
  const set = new Set<string>();
  const matches = text.matchAll(/\{\{([^}]+)\}\}/g);
  for (const m of matches) {
    const token = m[1].trim();
    if (token) set.add(token);
  }
  return Array.from(set);
};

/** 시작 노드가 항상 제공하는 빌트인 출력 변수 — BE 런타임이 사용자 발화를 주입 */
const START_BUILTIN_VARIABLES: ReadonlyArray<{ name: string; type: string }> = [{ name: 'userInput', type: 'String' }];

/** 시작 노드의 빌트인 + 사용자 정의 변수를 UpstreamVariable[] 로 변환 */
export const getStartNodeVariables = (startNode: FlowNode): UpstreamVariable[] => {
  const data = asRecord(startNode.data);
  const userVars = (data.variables as StartVariable[] | undefined) ?? [];
  const source = startNode.nodeLabel ?? '시작';

  const builtIn: UpstreamVariable[] = START_BUILTIN_VARIABLES.map((v) => ({
    id: v.name,
    label: v.name,
    source,
    type: v.type,
  }));

  // 사용자가 같은 이름으로 정의해 둔 경우 빌트인이 가려지지 않게 빌트인 이름 set 으로 dedupe
  const builtInIds = new Set(builtIn.map((v) => v.id));
  const userDefined = userVars
    .filter((v) => v?.name && !builtInIds.has(v.name))
    .map((v) => ({
      id: v.name,
      label: v.name,
      source,
      type: v.type ?? 'String',
    }));

  return [...builtIn, ...userDefined];
};

/** target 노드의 직간접 상위 노드들의 출력 변수를 수집.
 *  - condition 노드는 통과 (자체 output_variable 없음)
 *  - start 노드는 사용자 정의 변수(data.variables) 를 펼침
 *  - 그 외 일반 노드는 `<nodeId>_result` 한 개 생성
 *  - 마지막에 SYS_VARIABLES 를 항상 합쳐서 반환 */
export const getUpstreamVariables = (targetNodeId: string, graph: WorkflowGraph): UpstreamVariable[] => {
  const edges = graph.edges ?? [];
  const nodes = graph.nodes ?? [];
  const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));
  const visited = new Set<string>();
  const result: UpstreamVariable[] = [];

  const traverse = (nodeId: string) => {
    const incoming = edges.filter((e) => e.tgtNodeId === nodeId);
    for (const edge of incoming) {
      const srcId = edge.srcNodeId;
      if (visited.has(srcId)) continue;
      visited.add(srcId);
      const src = nodeMap.get(srcId);
      if (!src) continue;

      if (src.nodeKind === 'condition') {
        traverse(srcId);
        continue;
      }
      if (src.nodeKind === 'start') {
        result.push(...getStartNodeVariables(src));
        // start 가 더 상위 노드를 가질 일은 없지만 안전하게 통과
        traverse(srcId);
        continue;
      }
      // 일반 노드 — <nodeId>_result
      result.push({
        id: `${src.nodeId}_result`,
        label: src.nodeLabel ?? src.nodeKind,
        source: src.nodeKind,
        type: 'String',
      });
      traverse(srcId);
    }
  };
  traverse(targetNodeId);
  return [...result, ...SYS_VARIABLES];
};

/**
 * nodeLabel 을 변수명에 쓸 수 있는 형태로 정리.
 * - 공백 제거 ("LLM 2" → "LLM2")
 * - 영문/숫자/_ 외 문자 제거 (한글/특수문자 → 일단 제거 — BE 합의 후 한글 허용 시 정책 갱신)
 */
export const sanitizeLabelForVariable = (label: string): string =>
  label
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '');

/**
 * 신규 노드 생성 시점의 자동 output_variable 결정.
 * 1순위: nodeLabel sanitize 결과 + "_result" (예: "LLM 2" → "LLM2_result")
 * 2순위(빈 결과/숫자 시작 등): nodeId 기반 fallback
 * 노드 생성 시 한 번만 호출하고, 이후엔 변경하지 않는다 (다른 노드 input_variables 참조 보호).
 */
export const buildOutputVariableId = (nodeLabel: string | undefined, nodeId: string): string => {
  const sanitized = sanitizeLabelForVariable(nodeLabel ?? '');
  if (sanitized && /^[a-zA-Z_]/.test(sanitized)) {
    return `${sanitized}_result`;
  }
  return `${nodeId}_result`;
};
