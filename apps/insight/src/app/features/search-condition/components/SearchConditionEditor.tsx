import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror from '@uiw/react-codemirror';
import { Button, Checkbox, Drawer, Form, Input, Radio, Select, Tag, Tree, type TreeDataNode } from 'antd';

import { Log } from '@/log';
import { toast } from '@/shared-util';
import { searchConditionKeys, useCreateSearchCondition, useGetSearchCondition, usePreviewSql, useUpdateSearchCondition } from '../hooks/useSearchConditionQueries';
import { useSearchConditionStore } from '../hooks/useSearchConditionStore';
import { CATEGORY_OPTIONS, INPUT_TYPE_OPTIONS, type InputType, type SearchConditionNode, type SqlPreviewResult } from '../types';
import { extractSqlColumnAliases } from '../utils/sqlUtils';

type NodeState = Omit<SearchConditionNode, 'nodeId'> & {
  previewStatus: 'idle' | 'running' | 'success' | 'error';
  previewItems: SqlPreviewResult[];
  previewError: string;
  detectedColumns: string[];
};

const emptyNode = (depth = 0, parentCode?: string): NodeState => ({
  nodeDepth: depth,
  nodeCode: '',
  nodeLabel: '',
  inputType: depth === 0 ? 'SELECT' : 'MULTI_SELECT',
  optionSql: '',
  parentNodeCode: parentCode ?? null,
  sortOrder: 0,
  valueColumn: '',
  labelColumn: '',
  parentColumn: '',
  levelColumn: '',
  previewStatus: 'idle',
  previewItems: [],
  previewError: '',
  detectedColumns: [],
});

function fromDetailNode(n: SearchConditionNode): NodeState {
  const cols = extractSqlColumnAliases(n.optionSql || '');
  return {
    ...emptyNode(n.nodeDepth, n.parentNodeCode ?? undefined),
    nodeCode: n.nodeCode,
    nodeLabel: n.nodeLabel,
    inputType: n.inputType,
    optionSql: n.optionSql,
    sortOrder: n.sortOrder ?? 0,
    valueColumn: n.valueColumn ?? '',
    labelColumn: n.labelColumn ?? '',
    parentColumn: n.parentColumn ?? '',
    levelColumn: n.levelColumn ?? '',
    detectedColumns: cols,
  };
}

/**
 * 노드 로드 시 무효 parentNodeCode 보정.
 * 자식 단계(depth>0)의 parentNodeCode 가 자기참조이거나 존재하지 않으면 직전 단계 코드로 폴백.
 * (과거 편집기 버그로 자기참조가 굳은 데이터를 재저장 시 영구 교정)
 */
function repairParentCodes(list: NodeState[]): NodeState[] {
  const codes = new Set(list.map((n) => n.nodeCode));
  return list.map((n, i) => {
    if (n.nodeDepth === 0) return n.parentNodeCode ? { ...n, parentNodeCode: null } : n;
    const pc = n.parentNodeCode;
    const valid = !!pc && pc !== n.nodeCode && codes.has(pc);
    if (valid) return n;
    return { ...n, parentNodeCode: i > 0 ? list[i - 1].nodeCode || null : null };
  });
}

/** SqlPreviewResult 배열을 antd Tree가 요구하는 계층 구조로 변환. parent 참조 깨진 항목은 루트로 폴백. */
function buildTreeData(items: SqlPreviewResult[]): TreeDataNode[] {
  const nodeMap = new Map<string, TreeDataNode & { children: TreeDataNode[] }>();
  const parentOf = new Map<string, string | null>();

  // value 중복 행은 첫 행만 채택 — antd Tree key 중복 방지.
  items.forEach((item) => {
    if (item.value == null || nodeMap.has(item.value)) return;
    nodeMap.set(item.value, { key: item.value, title: item.label ?? item.value, children: [] });
    parentOf.set(item.value, item.parent ?? null);
  });

  const roots: TreeDataNode[] = [];

  // 각 노드는 1회만 배치 (중복 push 방지).
  nodeMap.forEach((node, value) => {
    const parent = parentOf.get(value);
    const parentNode = parent != null ? nodeMap.get(parent) : undefined;
    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/** InputType별 실제 컨트롤 UI 렌더링. 사용자가 보게 될 화면을 미리 확인하기 위한 미리보기 전용. */
function renderPreviewControl(node: NodeState): React.ReactNode {
  const { inputType, previewItems } = node;
  const options = previewItems.map((i) => ({ value: i.value ?? '', label: i.label ?? i.value ?? '' }));

  if (inputType === 'SELECT') {
    return <Select placeholder="선택하세요" options={options} style={{ minWidth: 200 }} popupMatchSelectWidth={false} className="pointer-events-none" />;
  }

  if (inputType === 'MULTI_SELECT') {
    return (
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {options.map((o) => (
          <Checkbox key={o.value} value={o.value} className="pointer-events-none">
            {o.label}
          </Checkbox>
        ))}
      </div>
    );
  }

  if (inputType === 'RADIO') {
    return (
      <Radio.Group className="pointer-events-none">
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <Radio key={o.value} value={o.value}>
              {o.label}
            </Radio>
          ))}
        </div>
      </Radio.Group>
    );
  }

  if (inputType === 'TREE_MULTI_SELECT') {
    const treeData = buildTreeData(previewItems);
    // 스크롤 컨테이너와 pointer-events-none 분리 — 같은 요소에 두면 휠 스크롤이 막힌다.
    return (
      <div className="max-h-48 overflow-y-auto">
        <Tree checkable treeData={treeData} defaultExpandAll selectable={false} className="pointer-events-none" />
      </div>
    );
  }

  return null;
}

const PREVIEW_STATUS_TAG: Record<NodeState['previewStatus'], { color: string; label: string }> = {
  idle: { color: 'default', label: '미실행' },
  running: { color: 'processing', label: '실행중' },
  success: { color: 'success', label: '성공' },
  error: { color: 'error', label: '실패' },
};

const INPUT_TYPE_LABEL: Record<InputType, string> = {
  SELECT: '단일 선택',
  MULTI_SELECT: '복수 선택',
  TREE_MULTI_SELECT: '계층 복수 선택',
  RADIO: '라디오',
};

interface HeaderForm {
  title: string;
  categoryCode?: string;
}

export default function SearchConditionEditor() {
  const queryClient = useQueryClient();
  const { isEditorOpen, editingCondition, selectedId, closeEditor, setEditingCondition } = useSearchConditionStore();
  const isEdit = !!editingCondition;

  const [headerForm] = Form.useForm<HeaderForm>();
  const watchedTitle = Form.useWatch('title', headerForm);
  const [nodes, setNodes] = useState<NodeState[]>([emptyNode()]);
  const [activeIdx, setActiveIdx] = useState(0);
  // 자식 단계 미리보기용 샘플 상위값 — nodeCode별 보존. 부모 단계 결과에서 선택.
  const [sampleParentValues, setSampleParentValues] = useState<Record<string, string>>({});

  const { data: fetchedDetail, isLoading: loadingDetail } = useGetSearchCondition({
    params: { searchCondId: selectedId as number },
    queryOptions: { enabled: !!selectedId && !editingCondition },
  });

  useEffect(() => {
    const src = editingCondition ?? fetchedDetail;
    if (!isEditorOpen) return;
    if (src) {
      headerForm.setFieldsValue({ title: src.title, categoryCode: src.categoryCode });
      setNodes(repairParentCodes(src.nodes.map(fromDetailNode)));
      setActiveIdx(0);
      if (fetchedDetail && !editingCondition) setEditingCondition(fetchedDetail);
    } else if (!selectedId) {
      headerForm.resetFields();
      setNodes([emptyNode()]);
      setActiveIdx(0);
    }
  }, [isEditorOpen, editingCondition, fetchedDetail, selectedId, setEditingCondition, headerForm]);

  const cur = nodes[activeIdx] ?? nodes[0];
  const isTree = cur?.inputType === 'TREE_MULTI_SELECT';
  // 현재 단계의 부모 노드 (자식 단계일 때만). 샘플 상위값 옵션 출처.
  const parentNode = cur?.parentNodeCode ? nodes.find((n) => n.nodeCode === cur.parentNodeCode) : undefined;
  const parentReady = parentNode?.previewStatus === 'success';
  const parentOptions = (parentNode?.previewItems ?? []).map((i) => ({ value: i.value ?? '', label: i.label ?? i.value ?? '' }));
  const sampleParentValue = cur?.parentNodeCode ? sampleParentValues[cur.nodeCode] : undefined;

  const upd = (idx: number, patch: Partial<NodeState>) => setNodes((prev) => prev.map((n, i) => (i === idx ? { ...n, ...patch } : n)));

  // nodeCode 변경 시, 이 노드를 부모로 참조하던 자식들의 parentNodeCode 도 함께 갱신 (링크 유지).
  const setNodeCode = (idx: number, raw: string) => {
    const newCode = raw.toUpperCase();
    setNodes((prev) => {
      const oldCode = prev[idx].nodeCode;
      return prev.map((n, i) => {
        if (i === idx) return { ...n, nodeCode: newCode };
        if (oldCode && n.parentNodeCode === oldCode) return { ...n, parentNodeCode: newCode };
        return n;
      });
    });
  };

  const addChild = () => {
    const parent = nodes[activeIdx];
    const child = emptyNode(parent.nodeDepth + 1, parent.nodeCode || undefined);
    child.sortOrder = nodes.length;
    setNodes((prev) => [...prev, child]);
    setActiveIdx(nodes.length);
  };

  const removeNode = (idx: number) => {
    if (nodes.length === 1) return;
    setNodes((prev) => prev.filter((_, i) => i !== idx));
    setActiveIdx(Math.max(0, idx - 1));
  };

  type EditorViewInstance = Parameters<NonNullable<ComponentProps<typeof CodeMirror>['onCreateEditor']>>[0];
  const editorViewRef = useRef<EditorViewInstance | null>(null);

  const insertParam = (param: string) => {
    const view = editorViewRef.current;
    if (view) {
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: param },
        selection: { anchor: from + param.length },
      });
      upd(activeIdx, { optionSql: view.state.doc.toString(), previewStatus: 'idle' });
    } else {
      upd(activeIdx, { optionSql: cur.optionSql + param, previewStatus: 'idle' });
    }
  };

  const { mutate: runPreview, isPending: running } = usePreviewSql({
    mutationOptions: {
      onMutate: () => upd(activeIdx, { previewStatus: 'running', previewError: '' }),
      onSuccess: (items) => {
        const cols = extractSqlColumnAliases(nodes[activeIdx]?.optionSql ?? '');
        upd(activeIdx, {
          previewStatus: 'success',
          previewItems: items,
          previewError: '',
          detectedColumns: cols,
          valueColumn: (nodes[activeIdx].valueColumn || cols[0]) ?? '',
          labelColumn: (nodes[activeIdx].labelColumn || cols[1]) ?? '',
        });
        toast.success(`SQL 실행 성공 — ${items.length}건`);
      },
      onError: (err: unknown) => {
        upd(activeIdx, { previewStatus: 'error', previewError: String(err) });
        toast.error('SQL 실행 실패');
      },
    },
  });

  const handleRun = () => {
    if (!cur?.optionSql.trim()) return;
    runPreview({
      optionSql: cur.optionSql,
      // 자식 단계: 부모 결과에서 고른 샘플값을 :parentValue 로 바인딩해 cascade 실제 검증
      parentValue: cur.parentNodeCode ? (sampleParentValue ?? undefined) : undefined,
      valueColumn: cur.valueColumn || undefined,
      labelColumn: cur.labelColumn || undefined,
      parentColumn: cur.parentColumn ?? undefined,
      levelColumn: cur.levelColumn ?? undefined,
    });
  };

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: searchConditionKeys.list._def });

  const { mutate: create, isPending: creating } = useCreateSearchCondition({
    mutationOptions: {
      onSuccess: () => {
        toast.success('검색조건이 저장되었습니다.');
        invalidateList();
        closeEditor();
      },
      onError: () => toast.error('저장 중 오류가 발생했습니다.'),
    },
  });

  const { mutate: update, isPending: updating } = useUpdateSearchCondition({
    mutationOptions: {
      onSuccess: () => {
        toast.success('검색조건이 수정되었습니다.');
        invalidateList();
        closeEditor();
      },
      onError: () => toast.error('수정 중 오류가 발생했습니다.'),
    },
  });

  const allSuccess = nodes.every((n) => n.previewStatus === 'success');
  const allMapped = nodes.every((n) => n.valueColumn && n.labelColumn);
  const allNodesFilled = nodes.every((n) => n.nodeCode.trim() && n.nodeLabel.trim());
  const canSave = !!watchedTitle?.trim() && allNodesFilled && allSuccess && allMapped;

  const handleSave = () => {
    headerForm
      .validateFields()
      .then((values) => {
        const payload = {
          title: values.title,
          categoryCode: values.categoryCode ?? undefined,
          nodes: nodes.map(({ previewStatus: _ps, previewItems: _pi, previewError: _pe, detectedColumns: _dc, ...n }) => n),
        };
        if (isEdit && editingCondition) {
          update({ searchCondId: editingCondition.searchCondId, data: payload });
        } else {
          create(payload);
        }
      })
      .catch((info) => {
        Log.warn('onFinishFailed', info);
        const firstError = info.errorFields?.[0]?.errors?.[0];
        if (firstError) toast.error(firstError);
      });
  };

  const footer = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Tag color={watchedTitle?.trim() ? 'success' : 'error'}>검색조건명</Tag>
        <Tag color={allNodesFilled ? 'success' : 'error'}>조건 코드·이름</Tag>
        <Tag color={allSuccess ? 'success' : 'error'}>SQL 실행</Tag>
        <Tag color={allMapped ? 'success' : 'error'}>컬럼 매핑</Tag>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={closeEditor}>취소</Button>
        <Button type="primary" onClick={handleSave} loading={creating || updating} disabled={!canSave}>
          {isEdit ? '수정' : '저장'}
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer
      open={isEditorOpen}
      onClose={closeEditor}
      title={isEdit ? '검색조건 수정' : '새 검색조건 추가'}
      footer={footer}
      destroyOnHidden
      styles={{ wrapper: { width: 960 }, body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      {/* 기본 정보 */}
      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
        <Form form={headerForm} layout="vertical" className="mb-0">
          <div className="flex items-start gap-4">
            <Form.Item name="title" label="검색조건명" rules={[{ required: true, message: '검색조건명을 입력하세요.' }]} hasFeedback className="flex-[2] mb-0">
              <Input placeholder="예) 상담원, 교환기 구분, 통화 유형" />
            </Form.Item>
            <Form.Item name="categoryCode" label="카테고리" className="flex-1 mb-0">
              <Select placeholder="카테고리 선택" allowClear options={CATEGORY_OPTIONS} />
            </Form.Item>
          </div>
        </Form>
      </div>

      {loadingDetail ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">불러오는 중…</div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* 좌측 — 조건 단계 목록 */}
          <div className="flex flex-col border-r border-gray-200 bg-gray-50" style={{ width: 220 }}>
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-700">조건 단계</p>
              <p className="text-xs text-gray-400 mt-0.5">단계를 선택해 SQL을 작성하세요</p>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {nodes.map((node, i) => {
                const isActive = i === activeIdx;
                const st = PREVIEW_STATUS_TAG[node.previewStatus];
                const depthLabel = node.nodeDepth === 0 ? '1단계 (루트)' : `${node.nodeDepth + 1}단계 (자식)`;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                      isActive ? 'bg-bt-primary-soft border-l-2 border-l-bt-primary' : 'hover:bg-gray-100 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${isActive ? 'text-bt-primary' : 'text-gray-400'}`}>{depthLabel}</span>
                      <Tag color={st.color} className="text-xs m-0 leading-none py-0.5">
                        {st.label}
                      </Tag>
                    </div>
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-bt-primary' : 'text-gray-700'}`}>{node.nodeCode || '(코드 미입력)'}</p>
                    <p className="text-xs text-gray-400 truncate">{node.nodeLabel || '(이름 미입력)'}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 p-3 border-t border-gray-200">
              {nodes.length < 5 && (
                <Button
                  size="small"
                  type="dashed"
                  disabled={cur?.previewStatus !== 'success'}
                  onClick={addChild}
                  className="w-full"
                  title={cur?.previewStatus !== 'success' ? '현재 단계의 SQL 실행 후 자식 추가 가능' : ''}
                >
                  + 자식 단계 추가
                </Button>
              )}
              {nodes.length > 1 && (
                <Button size="small" danger onClick={() => removeNode(activeIdx)} className="w-full">
                  이 단계 삭제
                </Button>
              )}
            </div>
          </div>

          {/* 우측 — 단계 편집 */}
          {cur && (
            <div className="flex-1 min-h-0 overflow-y-auto bg-white">
              <div className="flex flex-col gap-4 p-5">
                {/* 단계 기본 정보 */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    {cur.nodeDepth === 0 ? '1단계 (루트) — 기본 조건' : `${cur.nodeDepth + 1}단계 (자식) — 상위 선택값에 따라 필터링`}
                    {cur.parentNodeCode && (
                      <span className="ml-2 font-normal normal-case">
                        상위 조건:{' '}
                        <Tag color="orange" className="m-0 font-mono">
                          {cur.parentNodeCode}
                        </Tag>
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <Form layout="vertical" component={false}>
                      <Form.Item label="조건 코드" className="mb-0" required>
                        <Input value={cur.nodeCode} onChange={(e) => setNodeCode(activeIdx, e.target.value)} placeholder="예) AGENT_TYPE" className="font-mono" />
                      </Form.Item>
                    </Form>
                    <Form layout="vertical" component={false}>
                      <Form.Item label="조건 표시 이름" className="mb-0" required>
                        <Input value={cur.nodeLabel} onChange={(e) => upd(activeIdx, { nodeLabel: e.target.value })} placeholder="예) 상담원 유형" />
                      </Form.Item>
                    </Form>
                    <Form layout="vertical" component={false}>
                      <Form.Item label="입력 방식" className="mb-0">
                        <Select
                          value={cur.inputType}
                          onChange={(v) => upd(activeIdx, { inputType: v as InputType, previewStatus: 'idle' })}
                          options={INPUT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: INPUT_TYPE_LABEL[o.value] }))}
                        />
                      </Form.Item>
                    </Form>
                  </div>
                </div>

                {/* SQL 에디터 */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">데이터 조회 SQL</span>
                      {cur.previewStatus === 'success' && (
                        <Tag color="success" className="m-0">
                          {cur.previewItems.length}건 조회됨
                        </Tag>
                      )}
                      {cur.previewStatus === 'error' && (
                        <Tag color="error" className="m-0">
                          실행 실패
                        </Tag>
                      )}
                    </div>
                    <Button type="primary" size="small" onClick={handleRun} loading={running} disabled={!cur.optionSql.trim()} className="!bg-bt-success !border-bt-success">
                      ▶ SQL 실행
                    </Button>
                  </div>

                  {/* 자식 단계: 부모 결과에서 샘플 상위값 선택 → :parentValue 바인딩으로 cascade 미리보기 */}
                  {cur.parentNodeCode && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
                      <span className="text-xs font-medium text-bt-warn shrink-0">샘플 상위값</span>
                      <Select
                        size="small"
                        value={sampleParentValue || undefined}
                        onChange={(v) => setSampleParentValues((prev) => ({ ...prev, [cur.nodeCode]: v }))}
                        options={parentOptions}
                        disabled={!parentReady}
                        placeholder={parentReady ? `${parentNode?.nodeLabel || cur.parentNodeCode} 값 선택` : '상위 단계 SQL을 먼저 실행하세요'}
                        style={{ minWidth: 200 }}
                        popupMatchSelectWidth={false}
                        showSearch
                        optionFilterProp="label"
                        allowClear
                      />
                      <span className="text-xs text-gray-400">→ SQL 실행 시 :parentValue 로 주입</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-xs text-gray-400">파라미터 삽입:</span>
                    <Button
                      size="small"
                      onClick={() => insertParam(':parentValue')}
                      disabled={!cur.parentNodeCode}
                      className={`font-mono text-xs ${cur.parentNodeCode ? '!border-bt-warn !text-bt-warn' : ''}`}
                      title="상위 단계에서 선택한 값이 이 파라미터로 전달됩니다"
                    >
                      :parentValue
                    </Button>
                    <Button size="small" onClick={() => insertParam(':userId')} className="font-mono text-xs">
                      :userId
                    </Button>
                    <Button size="small" onClick={() => insertParam(':tenantId')} className="font-mono text-xs">
                      :tenantId
                    </Button>
                  </div>

                  <div
                    className={`border-t transition-colors ${
                      cur.previewStatus === 'success' ? 'border-t-bt-success' : cur.previewStatus === 'error' ? 'border-t-red-400' : 'border-t-transparent'
                    }`}
                  >
                    <CodeMirror
                      value={cur.optionSql}
                      onChange={(val) => upd(activeIdx, { optionSql: val, previewStatus: 'idle' })}
                      onCreateEditor={(view) => {
                        editorViewRef.current = view;
                      }}
                      extensions={[sql()]}
                      theme={oneDark}
                      height="180px"
                      placeholder={`SELECT col_code AS value, col_name AS label\nFROM TB_MASTER\nWHERE USE_YN = 'Y'\nORDER BY SORT_ORDER`}
                      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
                    />
                  </div>
                </div>

                {/* SQL 실행 결과 — 원본 데이터 테이블 */}
                {cur.previewStatus === 'success' && cur.previewItems.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">실행 결과 — 원본 데이터</span>
                      <span className="text-xs text-gray-400 font-mono">{cur.previewItems.length}건 (최대 8건 표시)</span>
                    </div>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 font-mono uppercase">
                          <th className="px-3 py-2 text-left">value</th>
                          <th className="px-3 py-2 text-left">label</th>
                          {cur.previewItems.some((r) => r.parent) && <th className="px-3 py-2 text-left">parent</th>}
                          {cur.previewItems.some((r) => r.level != null) && <th className="px-3 py-2 text-left w-12">level</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {cur.previewItems.slice(0, 8).map((item, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-1.5 font-mono">{item.value ?? '—'}</td>
                            <td className="px-3 py-1.5">{item.label ?? '—'}</td>
                            {cur.previewItems.some((r) => r.parent) && <td className="px-3 py-1.5 font-mono text-gray-400">{item.parent ?? '—'}</td>}
                            {cur.previewItems.some((r) => r.level != null) && <td className="px-3 py-1.5 font-mono">{item.level ?? '—'}</td>}
                          </tr>
                        ))}
                        {cur.previewItems.length > 8 && (
                          <tr className="border-t border-gray-100 bg-gray-50">
                            <td colSpan={4} className="px-3 py-1.5 text-center text-xs text-gray-400">
                              … {cur.previewItems.length - 8}건 더 있음
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* UI 미리보기 — InputType별 실제 컨트롤 렌더링 */}
                {cur.previewStatus === 'success' && cur.previewItems.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">UI 미리보기</span>
                      <span className="text-xs text-gray-400">사용자에게 보이는 실제 컨트롤 ({INPUT_TYPE_LABEL[cur.inputType]})</span>
                    </div>
                    <div className="p-4">{renderPreviewControl(cur)}</div>
                  </div>
                )}

                {cur.previewStatus === 'error' && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{cur.previewError || 'SQL 실행에 실패했습니다.'}</div>
                )}

                {/* 컬럼 매핑 */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">컬럼 매핑</span>
                    <span className="text-xs text-gray-400">SQL 결과의 어느 컬럼을 value / label로 쓸지 지정</span>
                    {allMapped && (
                      <Tag color="success" className="ml-auto m-0">
                        완료
                      </Tag>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    {[
                      { key: 'valueColumn', label: '값 컬럼 (value)', desc: '실제 저장될 값', required: true, show: true },
                      { key: 'labelColumn', label: '표시 이름 컬럼 (label)', desc: '화면에 보여줄 텍스트', required: true, show: true },
                      { key: 'parentColumn', label: '부모 연결 컬럼 (parent)', desc: '상위 값과 매칭할 컬럼', required: isTree, show: isTree },
                      { key: 'levelColumn', label: '계층 깊이 컬럼 (level)', desc: '트리 깊이 컬럼', required: false, show: isTree },
                    ].map((f) => (
                      <Form layout="vertical" component={false} key={f.key}>
                        <Form.Item
                          label={
                            <span>
                              {f.label}
                              {f.required && f.show && <span className="text-red-500 ml-1">*</span>}
                            </span>
                          }
                          className="mb-0"
                          style={{ opacity: f.show ? 1 : 0.4 }}
                        >
                          <Input
                            value={(cur as unknown as Record<string, string>)[f.key] ?? ''}
                            onChange={(e) => upd(activeIdx, { [f.key]: e.target.value } as Partial<NodeState>)}
                            disabled={!f.show}
                            placeholder={cur.detectedColumns[['valueColumn', 'labelColumn', 'parentColumn', 'levelColumn'].indexOf(f.key)] ?? f.desc}
                            className="font-mono"
                          />
                          <p className="text-xs text-gray-400 mt-1">{f.desc}</p>
                        </Form.Item>
                      </Form>
                    ))}
                  </div>
                  {cur.detectedColumns.length > 0 && (
                    <div className="px-4 pb-3 text-xs text-gray-400">
                      SQL에서 감지된 컬럼:{' '}
                      {cur.detectedColumns.map((c) => (
                        <Tag key={c} className="font-mono text-xs m-0 mr-1">
                          {c}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
