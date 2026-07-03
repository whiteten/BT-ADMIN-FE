import { type UIEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Pencil, Play, Plus, Save, Trash2, X } from 'lucide-react';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { taskboardApi } from '../api/taskboardApi';
import { useCreateDbQueryDef, useDeleteDbQueryDef, useGetDbQueryDefList, useUpdateDbQueryDef } from '../hooks/useTaskboardQueries';
import type { DbQueryDef, DbQueryParam } from '../types/taskboard.types';

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

// ─── PlaceholderQueryTab (task-display의 "플레이스홀더" 탭) ─────────────────
// 다른 데이터소스의 연동 Redis 키에 "{이름}" 토큰으로 참조되는, 재사용 가능한 값 목록을 등록하는 전용 탭.
// 예: IC:GROUP:REASON:{groupId}:0 처럼 해시키 자체에 그룹ID가 박힌 경우 — 그룹ID 목록을 여기 등록해두면
// 다른 데이터소스가 {groupId}로 참조해 뷰그룹이 선택한 그룹 수만큼 해시키를 자동으로 펼친다.
// 일반 "데이터 소스 관리" 탭과 완전히 분리된 목록 — 여기서 등록한 항목은 그 탭 목록엔 안 보인다.
export default function PlaceholderQueryTab() {
  const userInfo = useAuthStore((s) => s.userInfo);
  const [sql, setSql] = useState('');
  const [params, setParams] = useState<(DbQueryParam & { id: number })[]>([]);
  const [result, setResult] = useState<Record<string, unknown>[] | null>(null);
  const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS);
  const [saveOpen, setSaveOpen] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [description, setDescription] = useState('');
  const [placeholderName, setPlaceholderName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const runQuery = useMutation({ mutationFn: taskboardApi.runDbQuery });

  // 플레이스홀더로 등록된 것만 이 탭에 보인다 — 일반 데이터소스는 "데이터 소스 관리" 탭에서 관리
  const { data: allDefs = [], refetch: refetchDefs } = useGetDbQueryDefList();
  const savedDefs = allDefs.filter((d) => !!d.placeholderName);
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
  const isSavable = [...columns.map((c) => c.toUpperCase())].sort().join(',') === [...REQUIRED_OPTION_COLUMNS].sort().join(',');

  const handleSave = async () => {
    if (!queryName.trim()) {
      toast.error('이름을 입력하세요.');
      return;
    }
    if (!placeholderName.trim()) {
      toast.error('플레이스홀더 이름을 입력하세요 — 이 탭은 플레이스홀더 전용입니다.');
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
        placeholderName: placeholderName.trim(),
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
      setPlaceholderName('');
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
    setPlaceholderName(def.placeholderName ?? '');
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
    setPlaceholderName('');
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-4 overflow-y-auto min-h-0">
          <p className="text-[11px] text-slate-500 leading-snug bg-sky-50 border border-sky-200 rounded-md px-3 py-2">
            여기서 등록한 값 목록은{' '}
            <span className="font-mono">
              {'{'}이름{'}'}
            </span>
            으로 다른 데이터소스의 연동 Redis 키에서 참조됩니다. 예: <span className="font-mono">IC:GROUP:REASON:{'{groupId}'}:0</span>처럼 해시키 자체에 값이 박혀있어서,
            뷰그룹마다 다른 조합(그룹 A/B/C 또는 D/E/F 등)을 고를 수 있게 하고 싶을 때 사용하세요.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">SQL (SELECT만 허용, 값은 :name 형태 파라미터로)</label>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder={'예: SELECT GROUP_ID AS VALUE, GROUP_NAME AS NAME FROM TB_IC_GROUPMASTER'}
              rows={4}
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
              <span>저장된 플레이스홀더를 편집 중입니다 — 실행 후 저장하면 덮어씁니다.</span>
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
                title={isSavable ? '플레이스홀더로 저장' : 'VALUE, NAME 두 컬럼만 반환해야 저장할 수 있습니다'}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#0f5b9e] text-[#0f5b9e] rounded-md text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:border-slate-300 disabled:text-slate-400"
              >
                <Save className="w-3.5 h-3.5" />
                {editingId ? '플레이스홀더 수정' : '플레이스홀더로 저장'}
              </button>
            )}
          </div>

          {saveOpen && isSavable && (
            <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                placeholder="이름 (예: 그룹 목록)"
                className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="설명 (선택)"
                className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
              />
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">플레이스홀더 이름 (필수)</label>
                <input
                  value={placeholderName}
                  onChange={(e) => setPlaceholderName(e.target.value)}
                  placeholder="예: groupId"
                  className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0f5b9e]"
                />
              </div>
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
            SELECT 쿼리만 허용됩니다(INSERT/UPDATE/DELETE/DROP 등 차단). 최대 2000건까지 조회되며, 결과 패널에서 스크롤하면 추가로 표시됩니다. 플레이스홀더로 저장하려면{' '}
            <code className="font-mono">VALUE</code>, <code className="font-mono">NAME</code> 두 컬럼만 반환해야 하며, 파라미터가 있으면 현재 입력된 값이 고정값으로 함께
            저장됩니다.
          </p>

          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">등록된 플레이스홀더</label>
            {savedDefs.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">등록된 플레이스홀더 없음</p>
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
                      <div className="text-[10px] text-sky-600 font-mono truncate">{`{${d.placeholderName}}`}</div>
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
