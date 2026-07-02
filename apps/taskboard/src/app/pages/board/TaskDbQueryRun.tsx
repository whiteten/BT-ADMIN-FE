import { type UIEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Pencil, Play, Plus, Save, Trash2, X } from 'lucide-react';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { taskboardApi } from '../../features/board/api/taskboardApi';
import { useCreateDbQueryDef, useDeleteDbQueryDef, useGetDbQueryDefList, useUpdateDbQueryDef } from '../../features/board/hooks/useTaskboardQueries';
import type { DbQueryDef, DbQueryParam } from '../../features/board/types/taskboard.types';

const REQUIRED_OPTION_COLUMNS = ['NAME', 'VALUE'];

const PARAM_TYPE_OPTIONS: { value: DbQueryParam['type']; label: string }[] = [
  { value: 'STRING', label: '문자' },
  { value: 'NUMBER', label: '숫자' },
  { value: 'DATE', label: '날짜' },
];

let paramSeq = 0;
function makeEmptyParam(): DbQueryParam & { id: number } {
  paramSeq += 1;
  return { id: paramSeq, name: '', type: 'STRING', value: '' };
}

const INITIAL_VISIBLE_ROWS = 30;
const VISIBLE_ROWS_STEP = 30;
const SCROLL_BOTTOM_THRESHOLD_PX = 80;

// ─── TaskDbQueryRun ────────────────────────────────────────────────────────
// CTIQ/GROUP/AGENT/DNIS/ACS/AOE/DID 등 앞으로 어떤 테이블이 생길지 모르는 상황에서,
// 관리자가 SELECT 쿼리를 직접 짜서 리스트를 만들어야 할 때 저장 없이 즉석 실행해보는 화면.
// SQL 텍스트 전체가 이미 관리자 본인이 입력한 신뢰된 값이라 리터럴을 그대로 써도 무방하다.
// :name 파라미터는 "같은 쿼리를 값만 바꿔 재사용"하고 싶을 때(예: 뷰그룹 저장 후 나중에
// 값 확인/변경) 쓰는 편의 기능이며, 안 쓴다고 SQL 인젝션 경로가 새로 생기는 것은 아니다.
export default function TaskDbQueryRun() {
  const userInfo = useAuthStore((s) => s.userInfo);
  const [sql, setSql] = useState('');
  const [params, setParams] = useState<(DbQueryParam & { id: number })[]>([]);
  const [result, setResult] = useState<Record<string, unknown>[] | null>(null);
  const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS);
  const [saveOpen, setSaveOpen] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const runQuery = useMutation({ mutationFn: taskboardApi.runDbQuery });

  const { data: savedDefs = [], refetch: refetchDefs } = useGetDbQueryDefList();
  const createDef = useCreateDbQueryDef({});
  const updateDef = useUpdateDbQueryDef({});
  const deleteDef = useDeleteDbQueryDef({});
  const saveMutation = editingId ? updateDef : createDef;

  const addParam = () => setParams((prev) => [...prev, makeEmptyParam()]);
  const removeParam = (id: number) => setParams((prev) => prev.filter((p) => p.id !== id));
  const updateParam = (id: number, patch: Partial<DbQueryParam>) => setParams((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const handleRun = async () => {
    if (!sql.trim()) {
      toast.error('SQL을 입력하세요.');
      return;
    }
    if (params.some((p) => !p.name.trim())) {
      toast.error('파라미터 이름이 비어있습니다.');
      return;
    }
    try {
      const rows = await runQuery.mutateAsync({ sql, params: params.map(({ id: _id, ...rest }) => rest) });
      setResult(rows);
      setVisibleRows(INITIAL_VISIBLE_ROWS);
      toast.success(`${rows.length}건 조회됨`);
    } catch (e) {
      setResult(null);
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '쿼리 실행에 실패했습니다.';
      toast.error(message);
    }
  };

  const handleResultScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_BOTTOM_THRESHOLD_PX) {
      setVisibleRows((prev) => Math.min(prev + VISIBLE_ROWS_STEP, result?.length ?? prev));
    }
  };

  const columns = result && result.length > 0 ? Object.keys(result[0]) : [];
  const visibleResult = result?.slice(0, visibleRows) ?? [];
  // 뷰그룹 체크박스 소스로 저장 가능한 조건 — VALUE/NAME 두 컬럼만 반환해야 함(백엔드도 동일 검증).
  // 파라미터가 있으면 현재 입력된 값이 고정값(freeze)으로 함께 저장된다.
  const isSavable = [...columns.map((c) => c.toUpperCase())].sort().join(',') === [...REQUIRED_OPTION_COLUMNS].sort().join(',');

  const handleSave = async () => {
    if (!queryName.trim()) {
      toast.error('쿼리 이름을 입력하세요.');
      return;
    }
    if (params.some((p) => !p.value.trim())) {
      toast.error('파라미터 값이 비어있습니다 — 저장 시점 값이 고정값으로 저장됩니다.');
      return;
    }
    try {
      const payload = {
        tenantId: userInfo?.tenant ?? '',
        queryName,
        description: description || undefined,
        sqlText: sql,
        params: params.length > 0 ? params.map(({ id: _id, ...rest }) => rest) : undefined,
      };
      if (editingId) {
        await updateDef.mutateAsync({ dbQueryId: editingId, ...payload });
        toast.success('수정되었습니다.');
      } else {
        await createDef.mutateAsync(payload);
        toast.success('저장되었습니다.');
      }
      setSaveOpen(false);
      setQueryName('');
      setDescription('');
      setEditingId(null);
      refetchDefs();
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '저장에 실패했습니다.';
      toast.error(message);
    }
  };

  const handleEdit = (def: DbQueryDef) => {
    setSql(def.sqlText);
    setParams((def.params ?? []).map((p) => ({ ...p, id: (paramSeq += 1) })));
    setQueryName(def.queryName);
    setDescription(def.description ?? '');
    setEditingId(def.dbQueryId);
    setResult(null);
    setVisibleRows(INITIAL_VISIBLE_ROWS);
    setSaveOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setSql('');
    setParams([]);
    setQueryName('');
    setDescription('');
    setResult(null);
    setSaveOpen(false);
  };

  const handleDeleteDef = async (id: number) => {
    try {
      await deleteDef.mutateAsync(id);
      toast.success('삭제되었습니다.');
      if (editingId === id) handleCancelEdit();
      refetchDefs();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="p-6 bg-slate-50 h-screen flex flex-col overflow-hidden font-sans">
      <div className="mb-6 border-b pb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">DB 쿼리 실행</h1>
        <p className="text-sm text-slate-500 mt-1">저장 없이 SELECT 쿼리를 즉석 실행해봅니다. CTIQ/GROUP/DNIS 등 목록용 SQL을 만들 때 사용하세요.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-4 overflow-y-auto min-h-0">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">SQL (SELECT만 허용, 값은 :name 형태 파라미터로)</label>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder={'예: SELECT CTIQ_ID, CTIQ_NAME FROM TB_IC_CTIQMASTER WHERE TENANT_ID = :tenantId'}
              rows={8}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#0f5b9e]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600">파라미터 (:name 값 바인딩)</label>
              <button onClick={addParam} className="flex items-center gap-1 text-xs font-semibold text-[#0f5b9e] hover:bg-blue-50 rounded-md px-2 py-1 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                파라미터 추가
              </button>
            </div>
            {params.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic px-1">파라미터 없음 — SQL에 :name이 있다면 추가하세요.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {params.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <input
                      value={p.name}
                      onChange={(e) => updateParam(p.id, { name: e.target.value })}
                      placeholder="tenantId"
                      className="w-28 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0f5b9e]"
                    />
                    <select
                      value={p.type}
                      onChange={(e) => updateParam(p.id, { type: e.target.value as DbQueryParam['type'] })}
                      className="border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
                    >
                      {PARAM_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={p.value}
                      onChange={(e) => updateParam(p.id, { value: e.target.value })}
                      placeholder={p.type === 'DATE' ? 'yyyy-MM-dd' : '값'}
                      className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
                    />
                    <button onClick={() => removeParam(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="삭제">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {editingId && (
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-700">
              <span>저장된 쿼리를 편집 중입니다 — 실행 후 저장하면 덮어씁니다.</span>
              <button onClick={handleCancelEdit} className="flex items-center gap-1 font-semibold hover:underline flex-shrink-0">
                <X className="w-3 h-3" />
                취소
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={runQuery.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm disabled:opacity-60"
            >
              <Play className="w-3.5 h-3.5" />
              {runQuery.isPending ? '실행 중...' : '실행'}
            </button>
            {result !== null && (
              <button
                onClick={() => setSaveOpen((v) => !v)}
                disabled={!isSavable}
                title={isSavable ? '뷰그룹 체크박스 옵션으로 저장 (파라미터가 있으면 현재 값이 고정값으로 저장됩니다)' : 'VALUE, NAME 두 컬럼만 반환해야 저장할 수 있습니다'}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#0f5b9e] text-[#0f5b9e] rounded-md text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:border-slate-300 disabled:text-slate-400"
              >
                <Save className="w-3.5 h-3.5" />
                {editingId ? '뷰그룹 쿼리 수정' : '뷰그룹용으로 저장'}
              </button>
            )}
          </div>

          {saveOpen && isSavable && (
            <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                placeholder="쿼리 이름 (예: CTIQ 목록)"
                className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="설명 (선택)"
                className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
              />
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="self-start px-3 py-1.5 bg-[#0f5b9e] text-white rounded-md text-xs font-semibold hover:bg-[#0c4a82] transition-colors disabled:opacity-60"
              >
                {saveMutation.isPending ? '저장 중...' : editingId ? '수정' : '저장'}
              </button>
            </div>
          )}

          <p className="text-[10px] text-slate-400 leading-snug border-t border-slate-100 pt-3">
            SELECT 쿼리만 허용됩니다(INSERT/UPDATE/DELETE/DROP 등 차단). 최대 2000건까지 조회되며, 결과 패널에서 스크롤하면 추가로 표시됩니다. WHERE절 값은 위 파라미터로 넘기는
            것을 권장합니다. 뷰그룹 체크박스용으로 저장하려면 <code className="font-mono">VALUE</code>, <code className="font-mono">NAME</code> 두 컬럼만 반환해야 하며, 파라미터가
            있으면 현재 입력된 값이 고정값으로 함께 저장됩니다.
          </p>

          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">저장된 뷰그룹 체크박스 쿼리</label>
            {savedDefs.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">저장된 쿼리 없음</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {savedDefs.map((d) => (
                  <div
                    key={d.dbQueryId}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border ${
                      editingId === d.dbQueryId ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-700 truncate">{d.queryName}</div>
                      {d.description && <div className="text-[10px] text-slate-400 truncate">{d.description}</div>}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => handleEdit(d)} className="p-1 text-slate-400 hover:text-[#0f5b9e] hover:bg-blue-50 rounded-md transition-colors" title="수정">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDef(d.dbQueryId)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col min-h-0">
          <label className="block text-xs font-semibold text-slate-600 mb-2 flex-shrink-0">
            결과{result && result.length > 0 ? ` (${visibleResult.length}/${result.length}건 표시)` : ''}
          </label>
          <div className="overflow-auto min-h-0 flex-1" onScroll={handleResultScroll}>
            {result === null ? (
              <p className="text-[11px] text-slate-400 italic">아직 실행하지 않았습니다.</p>
            ) : result.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">결과 없음</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    {columns.map((col) => (
                      <th key={col} className="text-left font-semibold text-slate-600 px-2 py-1.5 whitespace-nowrap sticky top-0 bg-white">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleResult.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-50' : ''}>
                      {columns.map((col) => (
                        <td key={col} className="px-2 py-1.5 whitespace-nowrap text-slate-700">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
