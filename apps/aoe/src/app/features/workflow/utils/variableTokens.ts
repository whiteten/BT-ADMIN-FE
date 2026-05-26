import { SYS_VARIABLES } from '../constants/sysVariables';
import type { FlowNode, WorkflowGraph } from '../types';

export interface UpstreamVariable {
  /** 텍스트 임베드 시 토큰 본체. 예: "llm_xxx_result", "userinput", "sys.user_id" */
  id: string;
  /** dropdown 표시용 라벨. nodeLabel 또는 변수명 */
  label: string;
  /** 보조 표시 — 변수명(`id` 와 동일). sys 변수는 'sys' 등 별도 출처 식별자 사용. */
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

/** 텍스트에 등장한 모든 {...} 토큰 추출 (공백 트리밍, 중복 제거, 빈 토큰 제외).
 *  엔진이 단일 중괄호 `{var}` 형식을 사용 — 변경 시 BE 와 동기화 필요. */
export const parseVariableTokens = (text: string): string[] => {
  if (!text) return [];
  const set = new Set<string>();
  const matches = text.matchAll(/\{([^{}]+)\}/g);
  for (const m of matches) {
    const token = m[1].trim();
    if (token) set.add(token);
  }
  return Array.from(set);
};

/** 시작 노드가 항상 제공하는 빌트인 출력 변수 — BE 런타임이 사용자 발화를 주입 */
export const START_BUILTIN_VARIABLES: ReadonlyArray<{ name: string; type: string }> = [{ name: 'userInput', type: 'String' }];

/** 변수명 형식 검사 — 영문/_ 로 시작, 영문·숫자·_ 만. StartVariablesEditor UI 검증과 deploy validator 가 공유. */
export const isValidVariableName = (name: string): boolean => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

/**
 * 시작 노드의 빌트인 + 사용자 정의 변수를 UpstreamVariable[] 로 변환.
 * 다른 노드의 output_variable 과 형식 통일 — id 에 `_result` suffix 부여.
 * 라벨은 nodeLabel(예: '시작'), source 는 텍스트에 삽입되는 변수명(`<name>_result`) 그대로 — id 와 동일.
 */
export const getStartNodeVariables = (startNode: FlowNode): UpstreamVariable[] => {
  const data = asRecord(startNode.data);
  const userVars = (data.variables as StartVariable[] | undefined) ?? [];
  const nodeLabel = startNode.nodeLabel ?? '시작';

  const builtIn: UpstreamVariable[] = START_BUILTIN_VARIABLES.map((v) => {
    const id = `${v.name}_result`;
    return { id, label: nodeLabel, source: id, type: v.type };
  });

  // 사용자가 같은 이름으로 정의해 둔 경우 빌트인이 가려지지 않게 dedupe (이름 기준)
  const builtInNames = new Set(START_BUILTIN_VARIABLES.map((v) => v.name));
  const userDefined = userVars
    .filter((v) => v?.name && !builtInNames.has(v.name))
    .map((v) => {
      const id = `${v.name}_result`;
      return { id, label: nodeLabel, source: id, type: v.type ?? 'String' };
    });

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

      if (src.nodeKind === 'start') {
        result.push(...getStartNodeVariables(src));
        // start 가 더 상위 노드를 가질 일은 없지만 안전하게 통과
        traverse(srcId);
        continue;
      }
      // 일반 노드 — 실제 노드에 저장된 data.output_variable 을 그대로 사용 (BE 매칭 키와 일치 보장).
      // 옛 노드도 정상 동작. output_variable 이 없는 비정상 케이스만 nodeName 기반으로 fallback.
      const storedOutputVar = asRecord(src.data).output_variable;
      const varId = typeof storedOutputVar === 'string' && storedOutputVar ? storedOutputVar : buildOutputVariableFromName(getNodeDisplayName(src));
      result.push({
        id: varId,
        label: src.nodeLabel ?? src.nodeKind,
        source: varId,
        type: 'String',
      });
      traverse(srcId);
    }
  };
  traverse(targetNodeId);
  return [...result, ...SYS_VARIABLES];
};

/** 정규식 특수문자 escape (nodeKind 가 `a2a_agent` 같이 _ 포함 시 안전) */
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 노드의 표시용 짧은 식별자(`<kind>_<N>`) 를 단일 헬퍼로 일관되게 결정.
 * 1순위: node.nodeName (root 필드)
 * 2순위: node.data.output_variable 에서 `_result` 떼기 (옛 노드 호환)
 * 3순위: nodeId fallback
 * 헤더 표시 / dropdown 라벨 / 로그 / buildNodeName 의 unique 카운트 등 공통 사용.
 */
export const getNodeDisplayName = (node: FlowNode): string => {
  if (node.nodeName) return node.nodeName;
  const outputVar = asRecord(node.data).output_variable;
  if (typeof outputVar === 'string' && outputVar.endsWith('_result')) {
    return outputVar.slice(0, -'_result'.length);
  }
  return node.nodeId;
};

/**
 * 신규 노드의 `nodeName` 결정. `<kind>_<N>` 형식, 같은 kind 의 빈 인덱스 중 가장 작은 값.
 * `nodeName` 은 변수 시스템의 single source of truth — output_variable = `${nodeName}_result`.
 * 노드 생성 시 한 번만 부여하고 이후엔 변경하지 않는다 (다른 노드 input_variables 참조 보호).
 *
 * unique 카운트 시 `getNodeDisplayName` 으로 옛 노드(nodeName 없고 output_variable 만 있는)도 함께 고려.
 */
export const buildNodeName = (nodeId: string, nodeKind: string | undefined, existingNodes?: FlowNode[]): string => {
  if (!nodeKind || !/^[a-zA-Z_]/.test(nodeKind)) {
    return nodeId;
  }
  const pattern = new RegExp(`^${escapeRegExp(nodeKind)}_(\\d+)$`);
  const usedIndices = new Set<number>();
  for (const n of existingNodes ?? []) {
    if (n.nodeId === nodeId) continue;
    const candidate = getNodeDisplayName(n);
    const m = candidate.match(pattern);
    if (m) usedIndices.add(Number(m[1]));
  }
  let idx = 1;
  while (usedIndices.has(idx)) idx += 1;
  return `${nodeKind}_${idx}`;
};

/** nodeName 으로부터 output_variable 도출 — `<nodeName>_result` */
export const buildOutputVariableFromName = (nodeName: string): string => `${nodeName}_result`;

/**
 * @deprecated 후방 호환용. 새 코드에서는 buildNodeName + buildOutputVariableFromName 사용.
 * 기존 호출이 남아있을 수 있어 nodeName 도출 → output_variable 반환.
 */
export const buildOutputVariableId = (_nodeLabel: string | undefined, nodeId: string, nodeKind?: string, existingNodes?: FlowNode[]): string => {
  const name = buildNodeName(nodeId, nodeKind, existingNodes);
  return buildOutputVariableFromName(name);
};
