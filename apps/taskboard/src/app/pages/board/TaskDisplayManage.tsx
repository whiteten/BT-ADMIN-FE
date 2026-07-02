import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { MultiSelectDropdown } from '../../features/board/components/MultiSelectDropdown';
import {
  useCreateTaskboardDisplay,
  useDeleteTaskboardDisplay,
  useGetCtiGroupList,
  useGetCtiQueueList,
  useGetDbQueryDefList,
  useGetDbQueryDefOptionsMulti,
  useGetTaskboardDisplayList,
  useUpdateTaskboardDisplay,
} from '../../features/board/hooks/useTaskboardQueries';
import type { DbQueryDef, TaskboardDisplay, TaskboardDisplaySelection } from '../../features/board/types/taskboard.types';
import { IconEdit, IconTrash } from '@/components/custom/Icons';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

function parseSelection(selectionJson?: string): TaskboardDisplaySelection {
  if (!selectionJson) return {};
  try {
    return JSON.parse(selectionJson) as TaskboardDisplaySelection;
  } catch {
    return {};
  }
}

// TASK-DB-QUERY(TaskDbQueryRun)에 저장된 쿼리 실행 결과(VALUE/NAME 두 컬럼)를 멀티선택 items로 변환.
// Oracle은 별칭을 대문자로 돌려주는 경우가 많아 컬럼명을 대소문자 무시로 찾는다.
function extractNameValueItems(rows: Record<string, unknown>[]): { id: string; name: string }[] {
  if (!rows || rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  const valueKey = keys.find((k) => k.toUpperCase() === 'VALUE');
  const nameKey = keys.find((k) => k.toUpperCase() === 'NAME');
  if (!valueKey || !nameKey) return [];
  return rows.map((r) => ({ id: String(r[valueKey] ?? ''), name: String(r[nameKey] ?? '') }));
}

// ─── 선택값 요약 칩 — 큐/상담그룹/상담사 각각 일부 이름 + 나머지 개수만 간략히 보여준다 ──
interface SelectionCategory {
  label: string;
  color: string;
  ids: string[];
  nameMap: Map<string, string>;
}

function SelectionSummary({
  selection,
  nameMaps,
  dbQueryDefs,
  dbQueryNameMaps,
}: {
  selection: TaskboardDisplaySelection;
  nameMaps: { queue: Map<string, string>; group: Map<string, string> };
  dbQueryDefs: DbQueryDef[];
  dbQueryNameMaps: Map<number, Map<string, string>>;
}) {
  const categories: SelectionCategory[] = [
    { label: '큐', color: '#0891b2', ids: selection.queueIds ?? [], nameMap: nameMaps.queue },
    { label: '상담그룹', color: '#7c3aed', ids: selection.groupIds ?? [], nameMap: nameMaps.group },
    ...dbQueryDefs.map((def) => ({
      label: def.queryName,
      color: '#b45309',
      ids: selection.dbQuerySelections?.[def.dbQueryId] ?? [],
      nameMap: dbQueryNameMaps.get(def.dbQueryId) ?? new Map<string, string>(),
    })),
  ];
  const active = categories.filter((c) => c.ids.length > 0);

  if (active.length === 0) {
    return <span className="text-[11px] text-slate-400 italic">선택된 데이터 없음</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map((c) => {
        const previewNames = c.ids.slice(0, 2).map((id) => c.nameMap.get(id) ?? id);
        const restCount = c.ids.length - previewNames.length;
        return (
          <span
            key={c.label}
            className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full truncate max-w-full"
            style={{ backgroundColor: `${c.color}14`, color: c.color, border: `1px solid ${c.color}40` }}
            title={`${c.label}: ${c.ids.map((id) => c.nameMap.get(id) ?? id).join(', ')}`}
          >
            {c.label} {previewNames.join(', ')}
            {restCount > 0 ? ` +${restCount}` : ''}
          </span>
        );
      })}
    </div>
  );
}

// ─── 뷰 그룹 등록/수정 폼 ──────────────────────────────────────────

interface DisplayFormProps {
  initial: TaskboardDisplay | null;
  onSave: () => void;
  onCancel: () => void;
}

function DisplayForm({ initial, onSave, onCancel }: DisplayFormProps) {
  const initialSelection = parseSelection(initial?.selectionJson);
  const userInfo = useAuthStore((s) => s.userInfo);

  const [displayName, setDisplayName] = useState(initial?.displayName ?? '새 뷰 그룹');
  const [dbQuerySelections, setDbQuerySelections] = useState<Record<number, string[]>>(initialSelection.dbQuerySelections ?? {});
  const [isSaving, setIsSaving] = useState(false);

  const [openDbQueryId, setOpenDbQueryId] = useState<number | null>(null);
  const dbQueryDropdownRefs = useRef<Map<number, React.RefObject<HTMLDivElement | null>>>(new Map());

  function getDbQueryDropdownRef(id: number) {
    if (!dbQueryDropdownRefs.current.has(id)) {
      dbQueryDropdownRefs.current.set(id, { current: null });
    }
    return dbQueryDropdownRefs.current.get(id)!;
  }

  // TASK-DB-QUERY(TaskDbQueryRun)에서 등록한 뷰그룹 체크박스 옵션 소스 — 저장된 쿼리 개수만큼 옵션(VALUE/NAME) 조회
  const { data: dbQueryDefs = [] } = useGetDbQueryDefList();
  const dbQueryOptionsResults = useGetDbQueryDefOptionsMulti(dbQueryDefs.map((d) => d.dbQueryId));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openDbQueryId !== null) {
        const ref = dbQueryDropdownRefs.current.get(openDbQueryId);
        if (ref?.current && !ref.current.contains(e.target as Node)) setOpenDbQueryId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDbQueryId]);

  const toggleDbQueryValue = (dbQueryId: number, value: string) =>
    setDbQuerySelections((prev) => {
      const current = prev[dbQueryId] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [dbQueryId]: next };
    });
  const toggleAllDbQueryValues = (dbQueryId: number, allValues: string[]) =>
    setDbQuerySelections((prev) => {
      const current = prev[dbQueryId] ?? [];
      const next = current.length === allValues.length && allValues.length > 0 ? [] : allValues;
      return { ...prev, [dbQueryId]: next };
    });

  const createDisplay = useCreateTaskboardDisplay({});
  const updateDisplay = useUpdateTaskboardDisplay({});

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast.error('뷰 그룹 이름을 입력해 주세요.');
      return;
    }
    const selectionJson = JSON.stringify({
      dbQuerySelections: Object.fromEntries(Object.entries(dbQuerySelections).filter(([, v]) => v.length > 0)),
    });
    setIsSaving(true);
    try {
      if (initial?.displayId) {
        await updateDisplay.mutateAsync({ displayId: initial.displayId, displayName, selectionJson });
        toast.success('뷰 그룹이 수정되었습니다.');
      } else {
        await createDisplay.mutateAsync({ tenantId: userInfo?.tenant ?? '', displayName, selectionJson });
        toast.success('뷰 그룹이 등록되었습니다.');
      }
      onSave();
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">{initial ? '뷰 그룹 수정' : '뷰 그룹 등록'}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">뷰 그룹 이름</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 1팀 그룹, 본사 로비"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">이 뷰 그룹에서 보여줄 데이터 (TASK-DB-QUERY 등록 데이터)</label>
            <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              {dbQueryDefs.map((def, idx) => {
                const optionsQuery = dbQueryOptionsResults[idx];
                const items = extractNameValueItems(optionsQuery?.data ?? []);
                const selected = dbQuerySelections[def.dbQueryId] ?? [];
                return (
                  <div key={def.dbQueryId} className="flex items-center gap-4">
                    <span className="text-[11px] font-semibold text-amber-700 w-40 flex-shrink-0 truncate" title={def.queryName}>
                      {def.queryName}
                    </span>
                    <MultiSelectDropdown
                      label={def.queryName}
                      color="#b45309"
                      isFetching={optionsQuery?.isFetching ?? false}
                      items={items}
                      selectedIds={selected}
                      isOpen={openDbQueryId === def.dbQueryId}
                      dropdownRef={getDbQueryDropdownRef(def.dbQueryId)}
                      onToggleOpen={() => setOpenDbQueryId((v) => (v === def.dbQueryId ? null : def.dbQueryId))}
                      onToggleItem={(id) => toggleDbQueryValue(def.dbQueryId, id)}
                      onToggleAll={() =>
                        toggleAllDbQueryValues(
                          def.dbQueryId,
                          items.map((i) => i.id),
                        )
                      }
                      emptyText="옵션 없음"
                    />
                  </div>
                );
              })}

              {dbQueryDefs.length === 0 && (
                <p className="text-[10px] text-slate-400 italic px-1">TASK-DB-QUERY 화면에서 VALUE/NAME 쿼리를 등록하면 여기 선택 항목으로 추가됩니다.</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-md transition-colors">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm disabled:opacity-60"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TaskDisplayManage (메인) ─────────────────────────────────────────────────
// 뷰 그룹(큐/그룹/상담사 선택값)은 전광판(레이아웃)과 매핑되지 않는 독립된 풀이다.
// 어떤 전광판에든 자유롭게 입혀 쓸 수 있으므로 여기서는 전광판 연결 관리를 하지 않는다.
type ViewMode = 'grid' | 'list';

export default function TaskDisplayManage() {
  const { data: displays = [], isLoading, refetch } = useGetTaskboardDisplayList();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDisplay, setEditingDisplay] = useState<TaskboardDisplay | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const { data: queueRows = [] } = useGetCtiQueueList({ queryOptions: { refetchInterval: false } });
  const { data: groupRows = [] } = useGetCtiGroupList({ queryOptions: { refetchInterval: false } });
  const nameMaps = {
    queue: new Map(queueRows.map((q) => [q.ctiqId, q.ctiqName])),
    group: new Map(groupRows.map((g) => [g.groupId, g.groupName])),
  };

  // 카드/목록 요약에 TASK-DB-QUERY 선택값도 함께 보여주기 위한 이름 매핑
  const { data: dbQueryDefs = [] } = useGetDbQueryDefList();
  const dbQueryOptionsResults = useGetDbQueryDefOptionsMulti(dbQueryDefs.map((d) => d.dbQueryId));
  const dbQueryNameMaps = new Map<number, Map<string, string>>(
    dbQueryDefs.map((def, idx) => [def.dbQueryId, new Map(extractNameValueItems(dbQueryOptionsResults[idx]?.data ?? []).map((i) => [i.id, i.name]))]),
  );

  const deleteDisplay = useDeleteTaskboardDisplay({});
  const modal = useModal();

  const handleAdd = () => {
    setEditingDisplay(null);
    setFormOpen(true);
  };

  const handleEdit = (display: TaskboardDisplay) => {
    setEditingDisplay(display);
    setFormOpen(true);
  };

  const handleFormSave = () => {
    setFormOpen(false);
    refetch();
  };

  const handleDelete = (display: TaskboardDisplay) => {
    modal.confirm.delete({ onOk: () => doDelete(display) });
  };

  const doDelete = async (display: TaskboardDisplay) => {
    try {
      await deleteDisplay.mutateAsync(display.displayId);
      toast.success('삭제되었습니다.');
      refetch();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">뷰 그룹 관리</h1>
          <p className="text-sm text-slate-500 mt-1">큐/그룹/상담사 선택값(뷰 그룹)을 만들고, 어떤 전광판(레이아웃)에든 그대로 입혀 재사용할 수 있습니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-md overflow-hidden flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              title="카드형으로 보기"
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#0f5b9e] text-white' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="목록형으로 보기"
              className={`p-2 transition-colors border-l border-slate-200 ${viewMode === 'list' ? 'bg-[#0f5b9e] text-white' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />뷰 그룹 등록
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-slate-400">불러오는 중...</div>
      ) : displays.length === 0 ? (
        <div className="py-24 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-white">
          <p className="text-lg font-medium">등록된 뷰 그룹이 없습니다.</p>
          <p className="text-sm mt-1">오른쪽 상단의 &quot;뷰 그룹 등록&quot; 버튼을 눌러 추가하세요.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displays.map((d) => (
            <div key={d.displayId} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{d.displayName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">#{d.displayId}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(d)} className="p-1.5 text-slate-400 hover:text-[#0f5b9e] hover:bg-blue-50 rounded-md transition-colors" title="수정">
                    <IconEdit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(d)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="삭제">
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <SelectionSummary selection={parseSelection(d.selectionJson)} nameMaps={nameMaps} dbQueryDefs={dbQueryDefs} dbQueryNameMaps={dbQueryNameMaps} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {displays.map((d) => (
            <div key={d.displayId} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="min-w-0 w-44 flex-shrink-0">
                <div className="font-bold text-slate-800 truncate">{d.displayName}</div>
                <div className="text-[10px] text-slate-400 font-mono">#{d.displayId}</div>
              </div>
              <div className="flex-1 min-w-0">
                <SelectionSummary selection={parseSelection(d.selectionJson)} nameMaps={nameMaps} dbQueryDefs={dbQueryDefs} dbQueryNameMaps={dbQueryNameMaps} />
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleEdit(d)} className="p-1.5 text-slate-400 hover:text-[#0f5b9e] hover:bg-blue-50 rounded-md transition-colors" title="수정">
                  <IconEdit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(d)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="삭제">
                  <IconTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && <DisplayForm initial={editingDisplay} onSave={handleFormSave} onCancel={() => setFormOpen(false)} />}
    </div>
  );
}
