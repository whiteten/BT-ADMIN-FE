import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, Select, Tag } from 'antd';
import { toast } from '@/shared-util';
import { searchConditionKeys, useCreateSearchCondition, useGetSearchCondition, usePreviewSql, useUpdateSearchCondition } from '../hooks/useSearchConditionQueries';
import { useSearchConditionStore } from '../hooks/useSearchConditionStore';
import { CATEGORY_OPTIONS, INPUT_TYPE_OPTIONS, type InputType, type SearchConditionNode, type SqlPreviewResult } from '../types';
import { extractSqlColumnAliases } from '../utils/sqlUtils';

const BT_PRIMARY = '#085fb5';
const BT_WARN = '#b76e00';
const BT_SUCCESS = '#0a8a4a';

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

const STATUS_TAG: Record<NodeState['previewStatus'], { color: string; label: string }> = {
  idle: { color: 'default', label: '미실행' },
  running: { color: 'processing', label: '실행중' },
  success: { color: 'success', label: 'SUCCESS' },
  error: { color: 'error', label: 'ERROR' },
};

const INPUT_TYPE_COLOR_MAP: Record<InputType, string> = {
  SELECT: 'blue',
  MULTI_SELECT: 'blue',
  TREE_MULTI_SELECT: 'orange',
  RADIO: 'blue',
};

export default function SearchConditionEditor() {
  const queryClient = useQueryClient();
  const { isEditorOpen, editingCondition, selectedId, closeEditor, setEditingCondition } = useSearchConditionStore();
  const isEdit = !!editingCondition;

  const { data: fetchedDetail, isLoading: loadingDetail } = useGetSearchCondition({
    params: { searchCondId: selectedId! },
    queryOptions: { enabled: !!selectedId && !editingCondition },
  });

  const [title, setTitle] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [nodes, setNodes] = useState<NodeState[]>([emptyNode()]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const src = editingCondition ?? fetchedDetail;
    if (!isEditorOpen) return;
    if (src) {
      setTitle(src.title);
      setCategoryCode(src.categoryCode ?? '');
      setNodes(src.nodes.map(fromDetailNode));
      setActiveIdx(0);
      if (fetchedDetail && !editingCondition) setEditingCondition(fetchedDetail);
    } else if (!selectedId) {
      setTitle('');
      setCategoryCode('');
      setNodes([emptyNode()]);
      setActiveIdx(0);
    }
  }, [isEditorOpen, editingCondition, fetchedDetail, selectedId, setEditingCondition]);

  const cur = nodes[activeIdx] ?? nodes[0];
  const isTree = cur?.inputType === 'TREE_MULTI_SELECT';

  const upd = (idx: number, patch: Partial<NodeState>) => setNodes((prev) => prev.map((n, i) => (i === idx ? { ...n, ...patch } : n)));

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

  const insertParam = (param: string) => upd(activeIdx, { optionSql: cur.optionSql + param, previewStatus: 'idle' });

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
          valueColumn: nodes[activeIdx].valueColumn || cols[0] || '',
          labelColumn: nodes[activeIdx].labelColumn || cols[1] || '',
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
      valueColumn: cur.valueColumn || undefined,
      labelColumn: cur.labelColumn || undefined,
      parentColumn: cur.parentColumn || undefined,
      levelColumn: cur.levelColumn || undefined,
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
  const canSave = allSuccess && allMapped && allNodesFilled && !!title.trim();

  const handleSave = () => {
    if (!title.trim()) {
      toast.warning('검색조건 묶음명을 입력하세요.');
      return;
    }
    if (!allNodesFilled) {
      toast.warning('모든 노드의 코드와 레이블을 입력하세요.');
      return;
    }
    if (!allSuccess) {
      toast.warning('모든 노드의 SQL 실행을 완료하세요.');
      return;
    }
    if (!allMapped) {
      toast.warning('모든 노드의 value·label 컬럼 매핑을 완료하세요.');
      return;
    }

    const payload = {
      title,
      categoryCode: categoryCode || undefined,
      nodes: nodes.map(({ previewStatus, previewItems, previewError, detectedColumns, ...n }) => n),
    };
    if (isEdit && editingCondition) {
      update({ searchCondId: editingCondition.searchCondId, data: payload });
    } else {
      create(payload);
    }
  };

  const footer = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs">
        <Tag color={title.trim() ? 'success' : 'error'}>묶음명</Tag>
        <Tag color={allNodesFilled ? 'success' : 'error'}>코드·레이블</Tag>
        <Tag color={allSuccess ? 'success' : 'error'}>SQL실행</Tag>
        <Tag color={allMapped ? 'success' : 'error'}>컬럼매핑</Tag>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={closeEditor}>취소</Button>
        <Button type="primary" onClick={handleSave} loading={creating || updating}>
          검색조건 저장
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer
      open={isEditorOpen}
      onClose={closeEditor}
      title={
        <div className="flex items-center gap-2">
          <Tag color="orange" className="m-0">
            {isEdit ? 'EDIT' : 'DEFINE'}
          </Tag>
          <span>{isEdit ? '검색조건 수정' : '새 검색조건 정의'}</span>
          <span className="text-sm font-normal text-gray-400">— 단일(D0) 또는 cascade(D0+D1+) 번들</span>
        </div>
      }
      width={940}
      footer={footer}
      destroyOnClose
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      {/* ── 묶음명 + 카테고리 ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="검색조건 묶음명 *" style={{ flex: 2, fontWeight: 600 }} />
        <Select
          value={categoryCode || undefined}
          onChange={setCategoryCode}
          placeholder="카테고리 선택"
          allowClear
          style={{ flex: 1 }}
          options={CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </div>

      {loadingDetail ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">불러오는 중…</div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* ── 좌측 노드 그리드 ── */}
          <div className="flex flex-col border-r border-gray-200 bg-gray-50" style={{ width: 230 }}>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-600">노드 구성</span>
              <span className="text-xs text-gray-400 font-mono bg-white border border-gray-200 rounded px-1.5">{nodes.length} / 5</span>
            </div>

            {/* 노드 테이블 */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-gray-100">
                  <tr className="border-b border-gray-200">
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-500 w-10">Dep</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-500">코드 / 레이블</th>
                    <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-500 w-16">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((node, i) => {
                    const isActive = i === activeIdx;
                    const st = STATUS_TAG[node.previewStatus];
                    return (
                      <tr
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${isActive ? 'bg-bt-primary-soft outline outline-1 outline-bt-primary -outline-offset-1' : ''}`}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = '#f0f0f0';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = '';
                        }}
                      >
                        <td className="px-2 py-2">
                          <Tag color={node.nodeDepth === 0 ? 'default' : 'orange'} className="font-mono text-xs m-0">
                            D{node.nodeDepth}
                          </Tag>
                        </td>
                        <td className="px-2 py-2 max-w-[110px]">
                          <div className={`font-mono text-sm font-semibold truncate ${isActive ? 'text-bt-primary' : ''}`}>{node.nodeCode || '—'}</div>
                          <div className="text-xs text-gray-400 truncate">{node.nodeLabel || '(이름 없음)'}</div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Tag color={st.color} className="text-xs m-0">
                            {st.label}
                          </Tag>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 노드 액션 */}
            <div className="flex flex-col gap-2 p-3 border-t border-gray-200">
              {nodes.length < 5 && (
                <Button size="small" type={cur?.previewStatus === 'success' ? 'dashed' : 'text'} disabled={cur?.previewStatus !== 'success'} onClick={addChild} className="w-full">
                  + 자식 추가 (D{(cur?.nodeDepth ?? 0) + 1})
                </Button>
              )}
              {nodes.length > 1 && (
                <Button size="small" danger onClick={() => removeNode(activeIdx)} className="w-full">
                  선택 노드 삭제
                </Button>
              )}
            </div>
          </div>

          {/* ── 우측 에디터 ── */}
          {cur && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-white">
              {/* 노드 정보 */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                <Tag color={cur.nodeDepth === 0 ? 'default' : 'orange'} className="font-mono m-0">
                  D{cur.nodeDepth}
                </Tag>
                <Input
                  value={cur.nodeLabel}
                  onChange={(e) => upd(activeIdx, { nodeLabel: e.target.value })}
                  placeholder="노드 레이블"
                  bordered={false}
                  style={{ fontWeight: 600, fontSize: 14, padding: 0, flex: 1 }}
                />
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">코드</span>
                <Input
                  value={cur.nodeCode}
                  onChange={(e) => upd(activeIdx, { nodeCode: e.target.value.toUpperCase() })}
                  placeholder="NODE_CODE"
                  className="font-mono"
                  style={{ width: 140 }}
                />
                {cur.parentNodeCode && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">부모</span>
                    <Tag color="orange" className="font-mono m-0">
                      {cur.parentNodeCode}
                    </Tag>
                  </>
                )}
                <Select
                  value={cur.inputType}
                  onChange={(v) => upd(activeIdx, { inputType: v as InputType, previewStatus: 'idle' })}
                  style={{ width: 200 }}
                  options={INPUT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.value }))}
                />
              </div>

              {/* SQL 에디터 */}
              <div className="border border-gray-200 rounded overflow-hidden">
                {/* SQL 툴바 */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">조회쿼리</span>
                    {cur.previewStatus === 'success' && (
                      <Tag color="success" className="m-0">
                        SUCCESS · {cur.previewItems.length} rows
                      </Tag>
                    )}
                    {cur.previewStatus === 'error' && (
                      <Tag color="error" className="m-0">
                        ERROR
                      </Tag>
                    )}
                  </div>
                  <Button type="primary" size="small" onClick={handleRun} loading={running} disabled={!cur.optionSql.trim()} className="!bg-bt-success !border-bt-success">
                    ▶ 실행
                  </Button>
                </div>

                {/* 파라미터 버튼 — textarea 위에 배치 */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                  <span className="text-xs text-gray-400 shrink-0">삽입:</span>
                  <Button
                    size="small"
                    onClick={() => insertParam(':parentValue')}
                    disabled={!cur.parentNodeCode}
                    className={`font-mono shrink-0 ${cur.parentNodeCode ? '!border-bt-warn !text-bt-warn' : ''}`}
                    title={cur.parentNodeCode ? '부모 선택값' : '루트 — 사용 불가'}
                  >
                    :parentValue
                  </Button>
                  <Button size="small" onClick={() => insertParam(':userId')} className="font-mono shrink-0">
                    :userId
                  </Button>
                  <Button size="small" onClick={() => insertParam(':tenantId')} className="font-mono shrink-0">
                    :tenantId
                  </Button>
                </div>

                {/* SQL textarea */}
                <Input.TextArea
                  value={cur.optionSql}
                  onChange={(e) => upd(activeIdx, { optionSql: e.target.value, previewStatus: 'idle' })}
                  rows={7}
                  placeholder={`SELECT col_code AS value, col_name AS label\nFROM TB_MASTER\nWHERE USE_YN = 'Y'\nORDER BY SORT_ORDER`}
                  className="font-mono text-sm"
                  style={{ borderRadius: 0, border: 'none', resize: 'vertical' }}
                />
              </div>

              {/* 컬럼 매핑 */}
              <div className="border border-bt-primary/30 rounded overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-bt-primary/20 bg-bt-primary-soft/40">
                  <span className="text-sm font-bold uppercase tracking-wider text-bt-primary">컬럼 매핑</span>
                  <span className="text-sm text-gray-400">SQL에서 사용한 컬럼명/alias 입력</span>
                  {allMapped && (
                    <Tag color="success" className="ml-auto m-0">
                      {isTree ? '4/4' : '2/2'} 완료
                    </Tag>
                  )}
                </div>
                <div className="p-3 grid grid-cols-2 gap-3">
                  {[
                    { role: 'value', label: 'value', colorClass: 'bg-bt-primary', required: true, show: true },
                    { role: 'label', label: 'label', colorClass: 'bg-bt-primary', required: true, show: true },
                    { role: 'parent', label: 'parent', colorClass: 'bg-bt-warn', required: false, show: isTree },
                    { role: 'level', label: 'level', colorClass: 'bg-bt-warn', required: false, show: isTree },
                  ].map((f) => (
                    <Form.Item
                      key={f.role}
                      label={
                        <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded text-white ${f.show ? f.colorClass : 'bg-gray-400'}`}>
                          {f.label}
                          {f.required && f.show ? ' *' : ''}
                        </span>
                      }
                      className="mb-0"
                      style={{ opacity: f.show ? 1 : 0.35 }}
                    >
                      <Input
                        value={(cur as unknown as Record<string, string>)[f.role + 'Column'] ?? ''}
                        onChange={(e) => upd(activeIdx, { [f.role + 'Column']: e.target.value } as Partial<NodeState>)}
                        disabled={!f.show}
                        placeholder={cur.detectedColumns[f.role === 'value' ? 0 : f.role === 'label' ? 1 : f.role === 'parent' ? 2 : 3] ?? `${f.label} 컬럼명`}
                        className="font-mono"
                      />
                    </Form.Item>
                  ))}
                </div>
                {cur.detectedColumns.length > 0 && (
                  <div className="px-3 pb-2 text-xs text-gray-400">
                    감지된 컬럼:{' '}
                    {cur.detectedColumns.map((c) => (
                      <Tag key={c} className="font-mono text-xs m-0 mr-1">
                        {c}
                      </Tag>
                    ))}
                  </div>
                )}
                {isTree && (
                  <div className="px-3 pb-2 text-xs text-gray-400">
                    <Tag color="orange" className="m-0 font-mono">
                      parent · level
                    </Tag>{' '}
                    TREE 타입 필수.
                  </div>
                )}
              </div>

              {/* 실행 결과 + 렌더링 미리보기 */}
              {cur.previewStatus === 'success' && cur.previewItems.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {/* 실행 결과 */}
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">실행 결과</span>
                      <span className="text-xs font-mono text-gray-400">{cur.previewItems.length} rows</span>
                    </div>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-400 font-mono uppercase">
                          <th className="px-2 py-1 text-left">value</th>
                          <th className="px-2 py-1 text-left">label</th>
                          {cur.previewItems.some((r) => r.parent) && <th className="px-2 py-1 text-left">parent</th>}
                          {cur.previewItems.some((r) => r.level != null) && <th className="px-2 py-1 text-left w-8">lv</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {cur.previewItems.slice(0, 8).map((item, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-2 py-1 font-mono">{item.value ?? '—'}</td>
                            <td className="px-2 py-1">{item.label ?? '—'}</td>
                            {cur.previewItems.some((r) => r.parent) && <td className="px-2 py-1 font-mono text-gray-400">{item.parent ?? '—'}</td>}
                            {cur.previewItems.some((r) => r.level != null) && <td className="px-2 py-1 font-mono">{item.level ?? '—'}</td>}
                          </tr>
                        ))}
                        {cur.previewItems.length > 8 && (
                          <tr className="border-t border-gray-100 bg-gray-50">
                            <td colSpan={4} className="px-2 py-1 text-center text-xs text-gray-400">
                              … {cur.previewItems.length - 8}건 더
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 렌더링 미리보기 */}
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">렌더링 미리보기</span>
                      <Tag color={INPUT_TYPE_COLOR_MAP[cur.inputType]} className="font-mono m-0">
                        {cur.inputType}
                      </Tag>
                    </div>
                    <div className="p-3">
                      {cur.inputType === 'RADIO' ? (
                        <div className="flex flex-wrap gap-4">
                          {cur.previewItems.slice(0, 4).map((item, i) => (
                            <label key={i} className="flex items-center gap-1.5 cursor-pointer">
                              <input type="radio" name={`pr-${activeIdx}`} defaultChecked={i === 0} style={{ accentColor: BT_PRIMARY }} readOnly />
                              <span className={i === 0 ? 'font-semibold text-bt-primary' : ''}>{item.label ?? item.value}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 border border-gray-200 rounded bg-gray-50 px-2 py-1.5 text-sm mb-2">
                            {cur.inputType === 'MULTI_SELECT' && cur.previewItems[0] && (
                              <Tag color="blue" className="m-0">
                                {cur.previewItems[0].label ?? cur.previewItems[0].value} ×
                              </Tag>
                            )}
                            {cur.inputType === 'TREE_MULTI_SELECT' && cur.previewItems[0] && (
                              <Tag color="orange" className="m-0">
                                ▾ {cur.previewItems[0].label ?? cur.previewItems[0].value} ×
                              </Tag>
                            )}
                            {cur.inputType === 'SELECT' && <span className="text-gray-600">{cur.previewItems[0]?.label ?? '선택…'}</span>}
                            <span className="ml-auto text-gray-400 text-xs">▾</span>
                          </div>
                          <div className="border border-gray-200 rounded overflow-hidden shadow-sm">
                            {cur.previewItems.slice(0, 4).map((item, i) => (
                              <label
                                key={i}
                                className={`flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${i > 0 ? 'border-t border-gray-100' : ''}`}
                                style={{ paddingLeft: isTree && item.parent ? '28px' : undefined }}
                              >
                                {cur.inputType !== 'SELECT' && <input type="checkbox" style={{ accentColor: BT_PRIMARY }} readOnly />}
                                <span>{item.label ?? item.value}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 에러 */}
              {cur.previewStatus === 'error' && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{cur.previewError || 'SQL 실행에 실패했습니다.'}</div>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
