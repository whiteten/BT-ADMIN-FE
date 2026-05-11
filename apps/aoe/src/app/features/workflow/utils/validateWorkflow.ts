import type { FlowEdge, FlowNode, WorkflowGraph } from '../types';
import { getUpstreamVariables } from './variableTokens';

export interface WorkflowValidationError {
  nodeId?: string;
  message: string;
}

interface PromptTemplateItem {
  role: 'system' | 'user';
  text: string;
}

const VLLM_MAX_TOKENS_LIMIT = 7000;

const asRecord = (data: unknown): Record<string, unknown> => (data && typeof data === 'object' ? (data as Record<string, unknown>) : {});

const validateKnowledgeSearchNode = (node: FlowNode): WorkflowValidationError | null => {
  const data = asRecord(node.data);
  const documentIds = data.documentIds;
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return { nodeId: node.nodeId, message: `지식검색 노드(${node.nodeLabel ?? node.nodeId})에 참조할 지식 문서를 선택해 주세요.` };
  }
  return null;
};

const validateA2ANode = (node: FlowNode): WorkflowValidationError | null => {
  const data = asRecord(node.data);
  if (!data.a2aId || !data.agentId) {
    return { nodeId: node.nodeId, message: `A2A 노드(${node.nodeLabel ?? node.nodeId})에 A2A Agent를 선택해 주세요.` };
  }
  return null;
};

const validateDatabaseSearchNode = (node: FlowNode): WorkflowValidationError | null => {
  const data = asRecord(node.data);
  if (!data.isVerified) {
    return { nodeId: node.nodeId, message: `데이터베이스 노드(${node.nodeLabel ?? node.nodeId})의 연결이 검증되지 않았습니다.` };
  }
  return null;
};

const validateLlmNode = (node: FlowNode, graph: WorkflowGraph): WorkflowValidationError | null => {
  const data = asRecord(node.data);
  const label = node.nodeLabel ?? node.nodeId;

  // 모델 필수
  if (!data.modelId || String(data.modelId).trim().length === 0) {
    return { nodeId: node.nodeId, message: `LLM 노드(${label}): 모델을 선택해 주세요.` };
  }

  // User 프롬프트 필수 (빈 값 차단)
  const tpl = (data.prompt_template as PromptTemplateItem[] | undefined) ?? [];
  const userPrompt = tpl.find((p) => p?.role === 'user')?.text ?? '';
  if (userPrompt.trim().length === 0) {
    return { nodeId: node.nodeId, message: `LLM 노드(${label}): User 프롬프트를 입력해 주세요.` };
  }

  // vLLM 모델의 최대 토큰 제한
  const modelTypeName = String(data.modelTypeName ?? '').toLowerCase();
  const maxTokens = Number(data.maxTokens ?? 0);
  if (modelTypeName === 'vllm' && maxTokens > VLLM_MAX_TOKENS_LIMIT) {
    return {
      nodeId: node.nodeId,
      message: `LLM 노드(${label}): vLLM 모델의 최대 토큰은 ${VLLM_MAX_TOKENS_LIMIT}을 초과할 수 없습니다. (현재: ${maxTokens})`,
    };
  }

  // User 프롬프트에 이전 노드의 출력 변수 참조가 있어야 함 (sys.* 글로벌은 제외하고 실제 upstream 변수가 있을 때만)
  const upstreamVars = getUpstreamVariables(node.nodeId, graph).filter((v) => !v.id.startsWith('sys.'));
  if (upstreamVars.length > 0) {
    const referenced = upstreamVars.some((v) => userPrompt.includes(`{{${v.id}}}`));
    if (!referenced) {
      const hint = upstreamVars.map((v) => `{{${v.id}}}`).join(', ');
      return {
        nodeId: node.nodeId,
        message: `LLM 노드(${label}): User 프롬프트에 이전 연결된 노드의 변수가 포함되어야 합니다.\n사용 가능한 변수: ${hint}`,
      };
    }
  }

  return null;
};

const NODE_VALIDATORS: Record<string, (node: FlowNode, graph: WorkflowGraph) => WorkflowValidationError | null> = {
  llm: validateLlmNode,
  a2a_agent: validateA2ANode,
  knowledgeSearch: validateKnowledgeSearchNode,
  databaseSearch: validateDatabaseSearchNode,
};

/** 그래프 레벨 검증: start/answer 존재, start→answer 도달 가능, 고립 노드 없음 */
const validateGraphStructure = (graph: WorkflowGraph): WorkflowValidationError[] => {
  const errors: WorkflowValidationError[] = [];
  const nodes: FlowNode[] = graph.nodes ?? [];
  const edges: FlowEdge[] = graph.edges ?? [];

  const startNodes = nodes.filter((n) => n.nodeKind === 'start');
  const answerNodes = nodes.filter((n) => n.nodeKind === 'answer');

  if (startNodes.length === 0) errors.push({ message: '시작 노드가 없습니다.' });
  if (answerNodes.length === 0) errors.push({ message: '답변 노드가 없습니다.' });
  if (errors.length > 0) return errors;

  // start → answer 도달 가능 여부 (BFS)
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.srcNodeId) ?? [];
    list.push(edge.tgtNodeId);
    adjacency.set(edge.srcNodeId, list);
  }

  const reachableFromStart = new Set<string>();
  const queue: string[] = startNodes.map((n) => n.nodeId);
  queue.forEach((id) => reachableFromStart.add(id));
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of adjacency.get(current) ?? []) {
      if (reachableFromStart.has(next)) continue;
      reachableFromStart.add(next);
      queue.push(next);
    }
  }

  const reachedAnswer = answerNodes.some((n) => reachableFromStart.has(n.nodeId));
  if (!reachedAnswer) {
    errors.push({ message: '시작 노드에서 답변 노드까지 연결되어 있지 않습니다.' });
  }

  // 고립 노드 — start 에서 도달 불가능한 노드들 (start/answer 제외 시 노드 자체가 죽은 코드)
  const orphans = nodes.filter((n) => n.nodeKind !== 'start' && !reachableFromStart.has(n.nodeId));
  for (const orphan of orphans) {
    errors.push({
      nodeId: orphan.nodeId,
      message: `노드(${orphan.nodeLabel ?? orphan.nodeId})가 시작 노드와 연결되어 있지 않습니다.`,
    });
  }

  return errors;
};

/** 배포 전 클라이언트 사이드 검증. 실패 항목 목록을 반환하며 빈 배열이면 통과. */
export const validateWorkflowGraph = (graph: WorkflowGraph): WorkflowValidationError[] => {
  const errors: WorkflowValidationError[] = [];

  // 1. 그래프 구조 검증
  errors.push(...validateGraphStructure(graph));

  // 2. 노드별 검증
  for (const node of graph.nodes ?? []) {
    const validator = NODE_VALIDATORS[node.nodeKind];
    if (!validator) continue;
    const result = validator(node, graph);
    if (result) errors.push(result);
  }
  return errors;
};
