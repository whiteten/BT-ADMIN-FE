import { type DragEvent, type UIEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight, Pencil, Play, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { taskboardApi } from '../api/taskboardApi';
import { useCreateDbQueryDef, useDeleteDbQueryDef, useGetDbQueryDefList, useGetRedisHashKeys, useUpdateDbQueryDef } from '../hooks/useTaskboardQueries';
import type { DbQueryDef, DbQueryParam, DbQueryRedisKeyEntry } from '../types/taskboard.types';
import { type RedisKeyNode, filterRedisTree, groupRedisKeys } from '../utils/redisKeyPattern';

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

/** 드래그 중인 Redis 키를 dataTransfer에 실어 보낼 때 쓰는 MIME 타입 — 이 탭 안에서만 쓰는 값이라 커스텀 타입 사용 */
const REDIS_KEY_DND_TYPE = 'application/x-taskboard-redis-key';

// ─── Redis 키 트리 피커 — task-create "Redis 탐색기"와 같은 트리 구조(groupRedisKeys)를 재사용.
// task-create는 dnd-kit 기반 캔버스 DnD 컨텍스트를 쓰지만 이 탭은 그게 없으므로, 대신 브라우저
// 표준 HTML5 Drag and Drop API(draggable/onDragStart+onDrop)로 실제 드래그&드롭을 구현한다.
// 클릭으로도 채울 수 있게 남겨둬 마우스 드래그가 번거로운 경우의 대안도 유지. ──
function RedisKeyTreePicker({ onPick }: { onPick: (key: string) => void }) {
  const [search, setSearch] = useState('');
  const { data: hashKeys = [], isLoading } = useGetRedisHashKeys();
  const tree = hashKeys.length > 0 ? groupRedisKeys(hashKeys, '', 0) : [];
  const filteredTree = filterRedisTree(tree, search, null);

  return (
    <div className="border border-slate-200 rounded-md bg-white">
      <div className="p-1.5 border-b border-slate-100">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="키 검색..."
            className="w-full pl-6 pr-2 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:border-sky-300"
          />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto p-1">
        {isLoading ? (
          <p className="text-[10px] text-slate-400 text-center py-3">불러오는 중...</p>
        ) : filteredTree.length === 0 ? (
          <p className="text-[10px] text-slate-400 text-center py-3">{search.trim() ? '검색 결과 없음' : 'Hash 타입 키가 없습니다'}</p>
        ) : (
          filteredTree.map((node) => <RedisKeyPickerNode key={node.label} node={node} depth={0} onPick={onPick} forceExpand={!!search.trim()} />)
        )}
      </div>
    </div>
  );
}

function RedisKeyPickerNode({ node, depth, onPick, forceExpand }: { node: RedisKeyNode; depth: number; onPick: (key: string) => void; forceExpand?: boolean }) {
  const [open, setOpen] = useState(false);
  const isLeaf = node.children.length === 0;

  if (isLeaf) {
    return (
      <button
        draggable={!!node.fullKey}
        onDragStart={(e) => {
          if (!node.fullKey) return;
          e.dataTransfer.setData(REDIS_KEY_DND_TYPE, node.fullKey);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onClick={() => node.fullKey && onPick(node.fullKey)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className="w-full text-left text-[10px] font-mono px-2 py-1 hover:bg-sky-50 hover:text-sky-700 rounded truncate transition-colors cursor-grab active:cursor-grabbing"
        title={`${node.fullKey} (드래그하거나 클릭)`}
      >
        {node.label}
      </button>
    );
  }

  const expanded = forceExpand || open;
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: `${depth * 12}px` }}
        className="w-full text-left text-[10px] font-semibold text-slate-600 px-2 py-1 hover:bg-slate-50 rounded flex items-center gap-1 transition-colors"
      >
        <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        <span className="truncate">{node.label}</span>
        <span className="text-slate-400 font-normal flex-shrink-0">({node.leafCount})</span>
      </button>
      {expanded && node.children.map((c) => <RedisKeyPickerNode key={c.label} node={c} depth={depth + 1} onPick={onPick} forceExpand={forceExpand} />)}
    </div>
  );
}

// ─── DataSourceQueryTab (task-display의 "데이터 소스 관리" 탭) ─────────────────
// CTIQ/GROUP/AGENT/DNIS/ACS/AOE/DID 등 앞으로 어떤 테이블이 생길지 모르는 상황에서,
// 관리자가 SELECT 쿼리를 직접 짜서 리스트를 만들어야 할 때 저장 없이 즉석 실행해보는 탭.
// SQL 텍스트 전체가 이미 관리자 본인이 입력한 신뢰된 값이라 리터럴을 그대로 써도 무방하다.
// :name 파라미터는 "같은 쿼리를 값만 바꿔 재사용"하고 싶을 때(예: 뷰 그룹 저장 후 나중에
// 값 확인/변경) 쓰는 편의 기능이며, 안 쓴다고 SQL 인젝션 경로가 새로 생기는 것은 아니다.
export default function DataSourceQueryTab() {
  const userInfo = useAuthStore((s) => s.userInfo);
  const [sql, setSql] = useState('');
  const [params, setParams] = useState<(DbQueryParam & { id: number })[]>([]);
  const [result, setResult] = useState<Record<string, unknown>[] | null>(null);
  const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS);
  const [saveOpen, setSaveOpen] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [description, setDescription] = useState('');
  const [redisKeys, setRedisKeys] = useState<DbQueryRedisKeyEntry[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyTemplate, setNewKeyTemplate] = useState('');
  const [isKeyDropTarget, setIsKeyDropTarget] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const runQuery = useMutation({ mutationFn: taskboardApi.runDbQuery });

  // 플레이스홀더 전용 데이터소스(placeholderName 등록된 것)는 "플레이스홀더" 탭에서 별도로 관리 — 여기 목록엔 안 보이게 제외
  const { data: allDefs = [], refetch: refetchDefs } = useGetDbQueryDefList();
  const savedDefs = allDefs.filter((d) => !d.placeholderName);
  const createDef = useCreateDbQueryDef({});
  const updateDef = useUpdateDbQueryDef({});
  const deleteDef = useDeleteDbQueryDef({});
  const saveMutation = editingId ? updateDef : createDef;

  const addParam = () => setParams((prev) => [...prev, makeEmptyParam()]);
  const removeParam = (id: number) => setParams((prev) => prev.filter((p) => p.id !== id));
  const updateParam = (id: number, patch: Partial<DbQueryParam>) => setParams((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const handleAddRedisKey = () => {
    if (!newKeyLabel.trim() || !newKeyValue.trim()) {
      toast.error('라벨과 Redis 키를 모두 입력하세요.');
      return;
    }
    setRedisKeys((prev) => [...prev, { label: newKeyLabel.trim(), key: newKeyValue.trim(), keyTemplate: newKeyTemplate.trim() || undefined }]);
    setNewKeyLabel('');
    setNewKeyValue('');
    setNewKeyTemplate('');
  };
  const removeRedisKey = (index: number) => setRedisKeys((prev) => prev.filter((_, i) => i !== index));

  const handleKeyDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsKeyDropTarget(false);
    const key = e.dataTransfer.getData(REDIS_KEY_DND_TYPE);
    if (key) setNewKeyValue(key);
  };

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
  // 뷰 그룹 체크박스 소스로 저장 가능한 조건 — VALUE/NAME 두 컬럼만 반환해야 함(백엔드도 동일 검증).
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
        redisKeys: redisKeys.length > 0 ? redisKeys : undefined,
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
      setRedisKeys([]);
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
    setRedisKeys(def.redisKeys ?? []);
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
    setRedisKeys([]);
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
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">SQL (SELECT만 허용, 값은 :name 형태 파라미터로)</label>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder={'예: SELECT CTIQ_ID, CTIQ_NAME FROM TB_IC_CTIQMASTER WHERE TENANT_ID = :tenantId'}
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
                title={isSavable ? '뷰 그룹 체크박스 옵션으로 저장 (파라미터가 있으면 현재 값이 고정값으로 저장됩니다)' : 'VALUE, NAME 두 컬럼만 반환해야 저장할 수 있습니다'}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#0f5b9e] text-[#0f5b9e] rounded-md text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:border-slate-300 disabled:text-slate-400"
              >
                <Save className="w-3.5 h-3.5" />
                {editingId ? '뷰 그룹 데이터 수정' : '뷰 그룹용으로 저장'}
              </button>
            )}
          </div>

          {saveOpen && isSavable && (
            <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                placeholder="이름 (예: CTIQ 목록)"
                className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="설명 (선택)"
                className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
              />
              <div className="flex flex-col gap-1.5 p-2.5 bg-white rounded-md border border-slate-200">
                <label className="text-[10px] font-semibold text-slate-500">연동 Redis 키 (라벨별로 여러 개 가능)</label>
                <p className="text-[10px] text-slate-400 leading-snug">
                  아래 트리에서 키를 드래그하거나 클릭 → 라벨 입력 → 추가. 그룹요약/이석사유처럼 여러 해시에 걸치면 라벨별로 나눠 등록하세요.
                </p>

                {redisKeys.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {redisKeys.map((rk, idx) => (
                      <div key={`${rk.label}-${idx}`} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px]">
                        <span className="font-semibold text-slate-600 flex-shrink-0 max-w-[25%] truncate" title={rk.label}>
                          {rk.label}
                        </span>
                        <span className="font-mono text-slate-500 flex-1 min-w-0 truncate" title={rk.key}>
                          {rk.key}
                        </span>
                        {rk.keyTemplate && (
                          <span className="font-mono text-sky-600 flex-shrink-0 max-w-[30%] truncate" title={`필드키: ${rk.keyTemplate}`}>
                            ={rk.keyTemplate}
                          </span>
                        )}
                        <button onClick={() => removeRedisKey(idx)} className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors" title="삭제">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <RedisKeyTreePicker onPick={(key) => setNewKeyValue(key)} />

                <div
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes(REDIS_KEY_DND_TYPE)) return;
                    e.preventDefault();
                    setIsKeyDropTarget(true);
                  }}
                  onDragLeave={() => setIsKeyDropTarget(false)}
                  onDrop={handleKeyDrop}
                  className={`flex gap-1.5 p-1 -m-1 rounded-md border-2 border-dashed transition-colors ${isKeyDropTarget ? 'border-sky-400 bg-sky-50' : 'border-transparent'}`}
                >
                  <input
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="라벨 (예: 그룹요약)"
                    className="w-24 flex-shrink-0 border border-slate-200 rounded-md px-2 py-1 text-[10px] focus:outline-none focus:border-[#0f5b9e]"
                  />
                  <input
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    placeholder="Redis 키 (위 트리에서 드래그/클릭 또는 직접 입력)"
                    className="flex-1 min-w-0 border border-slate-200 rounded-md px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-[#0f5b9e]"
                  />
                  <button
                    onClick={handleAddRedisKey}
                    className="flex-shrink-0 px-2 py-1 text-[10px] font-semibold rounded border bg-slate-700 text-white border-slate-700 hover:bg-slate-800 transition-colors"
                  >
                    + 추가
                  </button>
                </div>
                <div>
                  <input
                    value={newKeyTemplate}
                    onChange={(e) => setNewKeyTemplate(e.target.value)}
                    placeholder="필드키 조합식 (선택, 예: {nodeId:6}||{value})"
                    className="w-full border border-slate-200 rounded-md px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-[#0f5b9e]"
                  />
                  <p className="text-[10px] text-slate-400 leading-snug mt-1">
                    미입력 시 이 쿼리의 VALUE를 필드로 그대로 씀(대부분 이 경우). 해시 필드 자체가 복합값(예: 노드ID+사유코드)이면 다른 플레이스홀더 이름과{' '}
                    <code className="font-mono">{'{value}'}</code>(이 쿼리 자신의 VALUE)를 <code className="font-mono">||</code>로 이어붙여 조합. 자릿수 지정(
                    <code className="font-mono">{'{nodeId:6}'}</code>)하면 0으로 왼쪽 채움.
                  </p>
                </div>
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
            SELECT 쿼리만 허용됩니다(INSERT/UPDATE/DELETE/DROP 등 차단). 최대 2000건까지 조회되며, 결과 패널에서 스크롤하면 추가로 표시됩니다. WHERE절 값은 위 파라미터로 넘기는
            것을 권장합니다. 뷰 그룹 선택 항목으로 저장하려면 <code className="font-mono">VALUE</code>, <code className="font-mono">NAME</code> 두 컬럼만 반환해야 하며, 파라미터가
            있으면 현재 입력된 값이 고정값으로 함께 저장됩니다.
          </p>

          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">저장된 뷰 그룹 데이터</label>
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
                      {(d.redisKeys?.length ?? 0) > 0 && (
                        <div className="text-[10px] text-emerald-600 font-mono truncate" title={d.redisKeys!.map((rk) => `${rk.label}=${rk.key}`).join(', ')}>
                          ↔ {d.redisKeys!.map((rk) => rk.label).join(', ')}
                        </div>
                      )}
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
