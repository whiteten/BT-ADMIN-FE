import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Tooltip } from 'antd';
import { Loader2, X } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import WorkflowPropertiesFactory from './WorkflowPropertiesFactory';
import { DEFAULT_NODE_KIND, NODE_KIND_MAP } from '../../constants/nodeKinds';
import { useUpdateNode, workflowQueryKeys } from '../../hooks/useWorkflowQueries';
import type { FlowEdge, FlowNode, WorkflowGraph } from '../../types';
import { buildNodeName, buildOutputVariableFromName, getNodeDisplayName, parseVariableTokens } from '../../utils/variableTokens';

interface WorkflowPropertiesPanelProps {
  agentId: string;
  node: FlowNode | null;
  graph: WorkflowGraph;
  onClose: () => void;
}

const NODES_WITHOUT_OUTPUT = new Set(['start', 'answer', 'error']);

/** kind 별로 input_variables 자동 수집 대상 텍스트 필드 path */
const VARIABLE_TEXT_FIELDS: Record<string, string[][]> = {
  llm: [
    ['data', 'systemPrompt'],
    ['data', 'userPrompt'],
  ],
  guardrail: [
    ['data', 'openai_moderation', 'behavior', 'user_message_template'],
    ['data', 'vllm_moderation', 'behavior', 'user_message_template'],
  ],
};

const getValueAtPath = (obj: unknown, path: string[]): unknown => {
  let cur: unknown = obj;
  for (const seg of path) {
    if (cur && typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
};

const SAVE_DEBOUNCE_MS = 600;

interface PromptTemplateItem {
  role: 'system' | 'user';
  text: string;
}

/** node.data → form 초기값으로 변환 (BE 전용 필드를 form 친화적 별칭으로 풀기) */
const nodeDataToFormData = (kind: string, data: Record<string, unknown> | undefined): Record<string, unknown> => {
  const base = { ...(data ?? {}) };
  if (kind === 'llm') {
    const tpl = (data?.prompt_template as PromptTemplateItem[] | undefined) ?? [];
    base.systemPrompt = tpl.find((p) => p?.role === 'system')?.text ?? '';
    base.userPrompt = tpl.find((p) => p?.role === 'user')?.text ?? '';
  }
  return base;
};

/** 직전(1-depth) upstream 노드들의 output_variable 수집 — input_variables 의 기본 의존성 */
const collectDirectUpstreamOutputVars = (nodeId: string, nodes: FlowNode[], edges: FlowEdge[]): string[] => {
  const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));
  const result: string[] = [];
  for (const e of edges) {
    if (e.tgtNodeId !== nodeId) continue;
    const src = nodeMap.get(e.srcNodeId);
    if (!src) continue;
    const ov = (src.data as Record<string, unknown> | undefined)?.output_variable;
    if (typeof ov === 'string' && ov) result.push(ov);
  }
  return Array.from(new Set(result));
};

/** form values → node.data 형태로 변환 (별칭 → BE 형식 prompt_template 배열).
 *  - output_variable 은 nodeName 으로 자동 (시작 노드는 'userInput_result' 고정)
 *  - input_variables = 직전 upstream output_variable ∪ 텍스트 필드의 {...} 토큰 */
const formDataToNodeData = (
  kind: string,
  nodeId: string,
  nodeLabel: string | undefined,
  prevData: Record<string, unknown> | undefined,
  formData: Record<string, unknown> | undefined,
  existingNodes?: FlowNode[],
  existingEdges?: FlowEdge[],
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...(prevData ?? {}), ...(formData ?? {}) };
  if (kind === 'llm') {
    const prevTpl = (prevData?.prompt_template as PromptTemplateItem[] | undefined) ?? [];
    const prevSys = prevTpl.find((p) => p?.role === 'system')?.text;
    const prevUsr = prevTpl.find((p) => p?.role === 'user')?.text;
    const sysFromForm = formData?.systemPrompt as string | undefined;
    const usrFromForm = formData?.userPrompt as string | undefined;
    // form 에 명시적으로 들어온 값이 있으면 그것 사용, 아니면 prev 값 유지 (빈 배열로 덮어쓰지 않게)
    const sys = sysFromForm ?? prevSys ?? '';
    const usr = usrFromForm ?? prevUsr ?? '';
    const tpl: PromptTemplateItem[] = [];
    if (sys) tpl.push({ role: 'system', text: sys });
    if (usr) tpl.push({ role: 'user', text: usr });
    next.prompt_template = tpl;
    delete next.systemPrompt;
    delete next.userPrompt;
  }

  // condition 노드 — condition_type 에 따라 비활성 모드 데이터 제거 (BE 페이로드 클린업)
  if (kind === 'condition') {
    const cType = (next.condition_type as string | undefined) ?? 'operator';
    if (cType === 'operator') {
      delete next.routes;
      delete next.fallback_node;
    } else {
      delete next.cases;
      delete next.else_goto;
    }
  }

  // knowledgeSearch — 옛 flat documentIds 필드 정리 (rag_config 로 대체됨)
  if (kind === 'knowledgeSearch') {
    delete next.documentIds;
  }

  // 시작 노드 — output_variable 고정 (BE 가 사용자 발화를 항상 같은 키로 주입), input_variables 미생성
  if (kind === 'start') {
    next.output_variable = 'userInput_result';
    delete next.input_variables;
    delete next.outputVariable;
    return next;
  }

  // 출력 변수 — answer/error 제외 (NODES_WITHOUT_OUTPUT 가 start 제외하고 남은 케이스)
  // 노드 생성 시점에 한 번만 결정하고 이후엔 keep (다른 노드의 input_variables 참조 보호).
  if (!NODES_WITHOUT_OUTPUT.has(kind)) {
    const existing = prevData?.output_variable as string | undefined;
    if (existing) {
      next.output_variable = existing;
    } else {
      const nameFromExisting = (next.nodeName as string | undefined) ?? buildNodeName(nodeId, kind, existingNodes);
      next.output_variable = buildOutputVariableFromName(nameFromExisting);
    }
  }
  // 옛 사용자 입력 필드 정리
  delete next.outputVariable;

  // input_variables 자동 수집 — 모든 노드 공통
  // (a) 직전 upstream 노드의 output_variable — 모든 노드에서 데이터 흐름 의존성 선언
  // (b) 텍스트 필드의 {...} 토큰 — sys.* 등 직접 upstream 이 아닌 변수까지 포함
  const tokens = new Set<string>();
  collectDirectUpstreamOutputVars(nodeId, existingNodes ?? [], existingEdges ?? []).forEach((v) => tokens.add(v));
  if (kind === 'llm') {
    const tpl = (next.prompt_template as PromptTemplateItem[] | undefined) ?? [];
    for (const item of tpl) parseVariableTokens(item.text ?? '').forEach((t) => tokens.add(t));
  } else {
    const paths = VARIABLE_TEXT_FIELDS[kind] ?? [];
    for (const path of paths) {
      const text = String(getValueAtPath({ data: next }, path) ?? '');
      parseVariableTokens(text).forEach((t) => tokens.add(t));
    }
  }
  next.input_variables = Array.from(tokens);

  return next;
};

interface EditableHeaderLabelProps {
  value: string;
  onCommit: (next: string) => void;
}

/** 헤더의 노드 라벨 — 더블클릭 시 input 으로 전환, Enter/blur 로 확정 */
const EditableHeaderLabel = ({ value, onCommit }: EditableHeaderLabelProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        className="text-sm font-semibold text-gray-800 truncate w-full bg-white outline-none rounded px-1 -mx-1 border border-blue-400"
      />
    );
  }

  return (
    <span
      className="text-sm font-semibold text-gray-800 truncate cursor-text rounded px-1 -mx-1 hover:bg-white/60"
      onDoubleClick={() => setEditing(true)}
      title="더블클릭하여 이름 수정"
    >
      {value}
    </span>
  );
};

const hexToRgba = (hex: string, alpha: number) => {
  const m = hex.replace('#', '');
  const value =
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function WorkflowPropertiesPanel({ agentId, node, graph, onClose }: WorkflowPropertiesPanelProps) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNodeIdRef = useRef<string | null>(null);

  const meta = node ? (NODE_KIND_MAP[node.nodeKind] ?? DEFAULT_NODE_KIND) : DEFAULT_NODE_KIND;
  const Icon = meta.icon;

  // 노드 ID 가 바뀐 경우에만 폼 초기화 (같은 노드 내에서 캐시 갱신은 form 보존)
  useEffect(() => {
    if (!node) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      prevNodeIdRef.current = null;
      return;
    }
    if (prevNodeIdRef.current === node.nodeId) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    prevNodeIdRef.current = node.nodeId;
    form.resetFields();
    form.setFieldsValue({
      ...node,
      data: nodeDataToFormData(node.nodeKind, node.data),
    });
  }, [node, form]);

  const { mutate: updateNode, isPending } = useUpdateNode({
    mutationOptions: {
      onSuccess: (updated) => {
        queryClient.setQueryData<WorkflowGraph>(workflowQueryKeys.graph(agentId).queryKey, (old) =>
          old ? { ...old, nodes: (old.nodes ?? []).map((n) => (n.nodeId === updated.nodeId ? updated : n)) } : old,
        );
      },
      onError: (error) => {
        Log.warn('updateNode failed', error);
        toast.error('저장에 실패했습니다.');
      },
    },
  });

  const handleSubmit = useCallback(
    (rawValues: unknown) => {
      if (!node) return;
      const values = rawValues as Partial<FlowNode>;
      const merged: FlowNode = {
        ...node,
        ...values,
        nodeId: node.nodeId,
        nodeKind: node.nodeKind,
        // 위치는 별도 endpoint 로 관리되므로 여기선 변경하지 않음
        positionX: node.positionX,
        positionY: node.positionY,
        data: formDataToNodeData(
          node.nodeKind,
          node.nodeId,
          values.nodeLabel ?? node.nodeLabel,
          node.data,
          values.data as Record<string, unknown> | undefined,
          graph.nodes,
          graph.edges,
        ),
      };
      updateNode({ params: { agentId, nodeId: node.nodeId }, data: merged });
    },
    [agentId, node, updateNode, graph.nodes, graph.edges],
  );

  // 폼 변경 시: (1) 캐시 즉시 머지로 입력값 보존, (2) debounce 후 BE 저장
  const handleValuesChange = useCallback(
    (_changed: unknown, allRaw: unknown) => {
      if (!node) return;
      const allValues = allRaw as Partial<FlowNode>;
      const optimistic: FlowNode = {
        ...node,
        ...allValues,
        nodeId: node.nodeId,
        nodeKind: node.nodeKind,
        positionX: node.positionX,
        positionY: node.positionY,
        data: formDataToNodeData(
          node.nodeKind,
          node.nodeId,
          allValues.nodeLabel ?? node.nodeLabel,
          node.data,
          allValues.data as Record<string, unknown> | undefined,
          graph.nodes,
          graph.edges,
        ),
      };
      queryClient.setQueryData<WorkflowGraph>(workflowQueryKeys.graph(agentId).queryKey, (old) =>
        old ? { ...old, nodes: (old.nodes ?? []).map((n) => (n.nodeId === optimistic.nodeId ? optimistic : n)) } : old,
      );

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        form.submit();
      }, SAVE_DEBOUNCE_MS);
    },
    [agentId, node, queryClient, form, graph.nodes, graph.edges],
  );

  // 패널 닫힐 때 / 컴포넌트 unmount 시 pending 변경 즉시 flush
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        form.submit();
      }
    };
  }, [form]);

  return (
    <aside className="h-full w-full bg-white flex flex-col">
      {node && (
        <>
          <header className="flex items-center gap-2 px-4 h-14 border-b border-gray-100 shrink-0" style={{ backgroundColor: hexToRgba(meta.color, 0.08) }}>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white shrink-0" style={{ backgroundColor: meta.color }}>
              <Icon size={14} />
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <EditableHeaderLabel
                value={node.nodeLabel ?? meta.label}
                onCommit={(next) => {
                  form.setFieldValue('nodeLabel', next);
                  const allValues = { ...form.getFieldsValue(true), nodeLabel: next } as Partial<FlowNode>;
                  handleValuesChange(null, allValues);
                }}
              />
              <Tooltip title={`ID: ${node.nodeId}`} placement="bottom" mouseEnterDelay={0.3}>
                <span className="text-[11px] text-gray-500 truncate cursor-help inline-block">{getNodeDisplayName(node)}</span>
              </Tooltip>
            </div>
            {isPending && (
              <span className="inline-flex items-center text-[11px] text-gray-400 mr-1" title="저장 중">
                <Loader2 size={12} className="animate-spin" />
              </span>
            )}
            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/60 text-gray-500 hover:text-gray-700 transition-colors" aria-label="닫기" title="닫기">
              <X size={16} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            <Form
              key={node.nodeId}
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onValuesChange={handleValuesChange}
              initialValues={{ ...node, data: nodeDataToFormData(node.nodeKind, node.data) }}
            >
              <WorkflowPropertiesFactory node={node} graph={graph} />
            </Form>
          </div>
        </>
      )}
    </aside>
  );
}
