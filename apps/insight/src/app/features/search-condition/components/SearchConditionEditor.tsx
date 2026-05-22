import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror, { type Extension } from '@uiw/react-codemirror';
import { Button, Drawer, Form, Input, Select, Tag } from 'antd';

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

const PREVIEW_STATUS_TAG: Record<NodeState['previewStatus'], { color: string; label: string }> = {
  idle: { color: 'default', label: '미실행' },
  running: { color: 'processing', label: '실행중' },
  success: { color: 'success', label: '성공' },
  error: { color: 'error', label: '실패' },
};

const INPUT_TYPE_LABEL: Record<InputType, string> = {
  SELECT: 'SELECT — 단일 선택',
  MULTI_SELECT: 'MULTI_SELECT — 복수 선택',
  TREE_MULTI_SELECT: 'TREE_MULTI_SELECT — 계층 복수 선택',
  RADIO: 'RADIO — 라디오',
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
  const [nodes, setNodes] = useState<NodeState[]>([emptyNode()]);
  const [activeIdx, setActiveIdx] = useState(0);

  const { data: fetchedDetail, isLoading: loadingDetail } = useGetSearchCondition({
    params: { searchCondId: selectedId! },
    queryOptions: { enabled: !!selectedId && !editingCondition },
  });

  useEffect(() => {
    const src = editingCondition ?? fetchedDetail;
    if (!isEditorOpen) return;
    if (src) {
      headerForm.setFieldsValue({ title: src.title, categoryCode: src.categoryCode });
      setNodes(src.nodes.map(fromDetailNode));
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

  const handleSave = () => {
    headerForm
      .validateFields()
      .then((values) => {
        if (!allNodesFilled) {
          toast.warning('모든 조건의 코드와 이름을 입력하세요.');
          return;
        }
        if (!allSuccess) {
          toast.warning('모든 조건의 SQL 실행을 완료하세요.');
          return;
        }
        if (!allMapped) {
          toast.warning('모든 조건의 value·label 컬럼 매핑을 완료하세요.');
          return;
        }
        const payload = {
          title: values.title,
          categoryCode: values.categoryCode || undefined,
          nodes: nodes.map(({ previewStatus, previewItems, previewError, detectedColumns, ...n }) => n),
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
        <Tag color={headerForm.getFieldValue('title')?.trim() ? 'success' : 'error'}>묶음명</Tag>
        <Tag color={allNodesFilled ? 'success' : 'error'}>코드·이름</Tag>
        <Tag color={allSuccess ? 'success' : 'error'}>SQL 실행</Tag>
        <Tag color={allMapped ? 'success' : 'error'}>컬럼 매핑</Tag>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={closeEditor}>취소</Button>
        <Button type="primary" onClick={handleSave} loading={creating || updating}>
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
      width={960}
      footer={footer}
      destroyOnHidden
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      {/* 기본 정보 */}
      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
        <Form form={headerForm} layout="vertical" className="mb-0">
          <div className="flex items-start gap-4">
            <Form.Item name="title" label="검색조건 묶음명" rules={[{ required: true, message: '묶음명을 입력하세요.' }]} hasFeedback className="flex-[2] mb-0">
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
                        <Input
                          value={cur.nodeCode}
                          onChange={(e) => upd(activeIdx, { nodeCode: e.target.value.toUpperCase() })}
                          placeholder="예) AGENT_TYPE"
                          className="font-mono"
                        />
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
                      extensions={[sql() as Extension]}
                      theme={oneDark}
                      height="180px"
                      placeholder={`SELECT col_code AS value, col_name AS label\nFROM TB_MASTER\nWHERE USE_YN = 'Y'\nORDER BY SORT_ORDER`}
                      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
                    />
                  </div>
                </div>

                {/* SQL 실행 결과 — 에디터 바로 아래, 컬럼 매핑 전에 표시 */}
                {cur.previewStatus === 'success' && cur.previewItems.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">실행 결과 미리보기</span>
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
