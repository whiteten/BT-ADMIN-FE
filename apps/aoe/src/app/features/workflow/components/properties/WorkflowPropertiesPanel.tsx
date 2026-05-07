import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Form } from 'antd';
import { Loader2, X } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import WorkflowPropertiesFactory from './WorkflowPropertiesFactory';
import { DEFAULT_NODE_KIND, NODE_KIND_MAP } from '../../constants/nodeKinds';
import { useUpdateNode, workflowQueryKeys } from '../../hooks/useWorkflowQueries';
import type { FlowNode, WorkflowGraph } from '../../types';

interface WorkflowPropertiesPanelProps {
  agentId: string;
  node: FlowNode | null;
  onClose: () => void;
}

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

/** form values → node.data 형태로 변환 (별칭 → BE 형식 prompt_template 배열).
 *  form 에 systemPrompt/userPrompt 가 정의되지 않은 경우 prev 의 prompt_template 에서 fallback. */
const formDataToNodeData = (kind: string, prevData: Record<string, unknown> | undefined, formData: Record<string, unknown> | undefined): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...(prevData ?? {}), ...(formData ?? {}) };
  if (kind === 'llm') {
    const prevTpl = (prevData?.prompt_template as PromptTemplateItem[] | undefined) ?? [];
    const prevSys = prevTpl.find((p) => p?.role === 'system')?.text;
    const prevUsr = prevTpl.find((p) => p?.role === 'user')?.text;
    const sysFromForm = formData?.systemPrompt as string | undefined;
    const usrFromForm = formData?.userPrompt as string | undefined;
    // form 에 명시적으로 들어온 값이 있으면 그것 사용, 아니면 prev 값 유지 (빈 배열로 덮어쓰지 않게)
    const sys = sysFromForm !== undefined ? sysFromForm : (prevSys ?? '');
    const usr = usrFromForm !== undefined ? usrFromForm : (prevUsr ?? '');
    const tpl: PromptTemplateItem[] = [];
    if (sys) tpl.push({ role: 'system', text: sys });
    if (usr) tpl.push({ role: 'user', text: usr });
    next.prompt_template = tpl;
    delete next.systemPrompt;
    delete next.userPrompt;
  }
  return next;
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

export default function WorkflowPropertiesPanel({ agentId, node, onClose }: WorkflowPropertiesPanelProps) {
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
        data: formDataToNodeData(node.nodeKind, node.data, values.data as Record<string, unknown> | undefined),
      };
      updateNode({ params: { agentId, nodeId: node.nodeId }, data: merged });
    },
    [agentId, node, updateNode],
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
        data: formDataToNodeData(node.nodeKind, node.data, allValues.data as Record<string, unknown> | undefined),
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
    [agentId, node, queryClient, form],
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
              <span className="text-sm font-semibold text-gray-800 truncate">{node.nodeLabel ?? meta.label}</span>
              <span className="text-[11px] text-gray-500 truncate">{node.nodeId}</span>
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
              <WorkflowPropertiesFactory node={node} />
            </Form>
          </div>
        </>
      )}
    </aside>
  );
}
