import { useState } from 'react';
import { toast } from '@/shared-util';
import { useCreateSearchCondition, usePreviewSql, useUpdateSearchCondition } from '../hooks/useSearchConditionQueries';
import { useSearchConditionStore } from '../hooks/useSearchConditionStore';
import type { InputType, SearchConditionNode } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

export default function SearchConditionEditor() {
  const { isEditorOpen, editingCondition, closeEditor } = useSearchConditionStore();
  const isEdit = !!editingCondition;

  const [title, setTitle] = useState(editingCondition?.title ?? '');
  const [categoryCode, setCategoryCode] = useState(editingCondition?.categoryCode ?? '');
  const [selectedNodeIdx, setSelectedNodeIdx] = useState(0);
  const [nodes, setNodes] = useState<Omit<SearchConditionNode, 'nodeId'>[]>(
    editingCondition?.nodes ?? [
      {
        nodeDepth: 0,
        nodeCode: '',
        nodeLabel: '',
        inputType: 'SELECT',
        optionSql: '',
        parentNodeCode: undefined,
      },
    ],
  );
  const [previewResult, setPreviewResult] = useState<{ label: string; value: string }[]>([]);
  const [sqlValidated, setSqlValidated] = useState(false);

  const { mutate: createCondition, isPending: creating } = useCreateSearchCondition({
    mutationOptions: {
      onSuccess: () => {
        toast.success('검색조건이 저장되었습니다.');
        closeEditor();
      },
      onError: () => toast.error('저장 중 오류가 발생했습니다.'),
    },
  });

  const { mutate: updateCondition, isPending: updating } = useUpdateSearchCondition({
    mutationOptions: {
      onSuccess: () => {
        toast.success('검색조건이 수정되었습니다.');
        closeEditor();
      },
      onError: () => toast.error('수정 중 오류가 발생했습니다.'),
    },
  });

  const { mutate: previewSql, isPending: previewing } = usePreviewSql({
    mutationOptions: {
      onSuccess: (result) => {
        setPreviewResult(result);
        setSqlValidated(true);
        toast.success(`SQL 검증 통과 — ${result.length}건`);
      },
      onError: () => {
        toast.error('SQL 검증 실패');
        setSqlValidated(false);
      },
    },
  });

  const currentNode = nodes[selectedNodeIdx];

  const updateCurrentNode = (update: Partial<Omit<SearchConditionNode, 'nodeId'>>) => {
    setNodes((prev) => prev.map((n, i) => (i === selectedNodeIdx ? { ...n, ...update } : n)));
    setSqlValidated(false);
  };

  const addChildNode = () => {
    setNodes((prev) => [
      ...prev,
      {
        nodeDepth: prev.length,
        nodeCode: '',
        nodeLabel: '',
        inputType: 'MULTI_SELECT',
        optionSql: '',
        parentNodeCode: prev[prev.length - 1]?.nodeCode,
      },
    ]);
    setSelectedNodeIdx(nodes.length);
  };

  const handleSave = () => {
    if (!sqlValidated) {
      toast.warning('SQL 검증 후 저장 가능합니다.');
      return;
    }
    const data = { title, categoryCode, isBundle: nodes.length > 1, nodes };
    if (isEdit && editingCondition) {
      updateCondition({ searchCondId: editingCondition.searchCondId, data });
    } else {
      createCondition(data);
    }
  };

  return (
    <Sheet open={isEditorOpen} onOpenChange={closeEditor}>
      <SheetContent className="w-[600px] sm:max-w-[600px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-3 border-b border-bt-border">
          <SheetTitle className="text-[14px]">{isEdit ? '검색조건 수정' : '새 검색조건 정의'}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 p-5">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium">표시명 *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-[12px]" placeholder="부서별 상담사" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium">카테고리</label>
              <Select value={categoryCode} onValueChange={setCategoryCode}>
                <SelectTrigger className="text-[12px]">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {['교환기', 'CTI', 'IVR', '공통'].map((g) => (
                    <SelectItem key={g} value={g} className="text-[12px]">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 노드 트리 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold">노드 트리</span>
              {nodes.length < 3 && (
                <Button size="sm" variant="outline" className="text-[11px] h-6 px-2" onClick={addChildNode}>
                  + 자식 노드
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {nodes.map((node, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedNodeIdx(i)}
                  className={`flex items-center gap-2 rounded border px-3 py-2 text-left text-[11px] transition-colors ${
                    i === selectedNodeIdx ? 'border-bt-primary bg-bt-primary-soft' : 'border-bt-border hover:border-bt-border-strong'
                  }`}
                  style={{ marginLeft: `${node.nodeDepth * 16}px` }}
                >
                  <span className="font-semibold">D{node.nodeDepth}</span>
                  <span>{node.nodeLabel || '(이름 없음)'}</span>
                  <span className="text-[10px] rounded bg-white px-1 border border-current">{node.inputType}</span>
                  {node.parentNodeCode && <span className="text-bt-warn text-[10px]">← {node.parentNodeCode}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 선택된 노드 편집 */}
          {currentNode && (
            <div className="rounded border border-bt-border p-3 flex flex-col gap-3">
              <div className="text-[11px] font-semibold text-bt-fg-muted">선택 노드: D{currentNode.nodeDepth}</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px]">코드 *</label>
                  <Input value={currentNode.nodeCode} onChange={(e) => updateCurrentNode({ nodeCode: e.target.value })} className="font-mono text-[11px]" placeholder="DEPT_CODE" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px]">레이블 *</label>
                  <Input value={currentNode.nodeLabel} onChange={(e) => updateCurrentNode({ nodeLabel: e.target.value })} className="text-[11px]" placeholder="부서" />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[11px]">INPUT_TYPE</label>
                  <Select value={currentNode.inputType} onValueChange={(v) => updateCurrentNode({ inputType: v as InputType })}>
                    <SelectTrigger className="text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['SELECT', 'MULTI_SELECT', 'TREE_MULTI_SELECT', 'RADIO'] as InputType[]).map((t) => (
                        <SelectItem key={t} value={t} className="text-[12px]">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium">옵션 SQL (RAW_SQL) *</label>
                <Textarea
                  value={currentNode.optionSql}
                  onChange={(e) => updateCurrentNode({ optionSql: e.target.value })}
                  className="font-mono text-[11px] resize-none"
                  rows={5}
                  placeholder={`SELECT DEPT_ID AS value, DEPT_NAME AS label\nFROM TB_DEPT\nORDER BY SORT_ORDER`}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] h-7"
                  onClick={() => previewSql({ optionSql: currentNode.optionSql })}
                  disabled={!currentNode.optionSql || previewing}
                >
                  SQL 검증 + 미리보기
                </Button>
                {sqlValidated && <span className="text-[10px] text-bt-success">✓ SELECT-only, AST 통과, 결과 {previewResult.length}건</span>}
              </div>
              {previewResult.length > 0 && (
                <div className="rounded border border-bt-border bg-bt-bg-muted/30 p-2 max-h-32 overflow-y-auto">
                  {previewResult.slice(0, 10).map((item, i) => (
                    <div key={i} className="text-[10.5px] font-mono py-0.5">
                      {item.value} · {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 저장 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-bt-border">
          <Button variant="outline" size="sm" className="text-[12px]" onClick={closeEditor}>
            취소
          </Button>
          <Button size="sm" className="bg-bt-primary hover:bg-bt-primary-hover text-white text-[12px]" onClick={handleSave} disabled={creating || updating || !sqlValidated}>
            저장 (SQL 검증 필요)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
