import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { MultiSelectDropdown } from '../../features/board/components/MultiSelectDropdown';
import {
  useCreateTaskboardDisplay,
  useDeleteTaskboardDisplay,
  useGetCtiQueueList,
  useGetDbQueryDefList,
  useGetDbQueryDefOptionsMulti,
  useGetTaskboardDisplayList,
  useUpdateTaskboardDisplay,
} from '../../features/board/hooks/useTaskboardQueries';
import DataSourceQueryTab from '../../features/board/tabs/DataSourceQueryTab';
import type { DbQueryDef, TaskboardDisplay, TaskboardDisplaySelection } from '../../features/board/types/taskboard.types';
import { extractNameValueItems } from '../../features/board/utils/redisValue';
import { IconEdit, IconTrash } from '@/components/custom/Icons';
import { Checkbox } from '@/components/ui/checkbox';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

function parseSelection(selectionJson?: string): TaskboardDisplaySelection {
  if (!selectionJson) return {};
  try {
    return JSON.parse(selectionJson) as TaskboardDisplaySelection;
  } catch {
    return {};
  }
}

/**
 * 미디어타입 데이터소스 판별 — 데이터소스 관리 탭에서 플레이스홀더 이름 "mediatype"(대소문자 무관)으로
 * 등록한 것. YAML(application-redis-key-map.yml)의 `{mediatype}` 토큰과 짝이며, 위젯의 마스킹된 해시키
 * (IC:CTIQ:{mediatype} 등)가 실행 시점에 이 데이터소스의 선택값으로 치환된다. 뷰그룹 등록 시 이 선택은
 * 필수(2026-07-10 사용자 요건) — 다른 플레이스홀더(groupid 등)와 달리 뷰그룹 폼에 노출한다.
 */
function isMediaTypeDef(def: DbQueryDef): boolean {
  return (def.placeholderName ?? '').trim().toLowerCase() === 'mediatype';
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
  nameMaps: { queue: Map<string, string> };
  dbQueryDefs: DbQueryDef[];
  dbQueryNameMaps: Map<number, Map<string, string>>;
}) {
  const categories: SelectionCategory[] = [
    { label: '큐', color: '#0891b2', ids: selection.queueIds ?? [], nameMap: nameMaps.queue },
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
  // 쿼리(데이터 소스)별 사용 여부 체크박스 — 초기값은 기존 선택값이 있던 쿼리를 사용 중으로 간주
  const [enabledDbQueryIds, setEnabledDbQueryIds] = useState<Set<number>>(
    new Set(
      Object.entries(initialSelection.dbQuerySelections ?? {})
        .filter(([, v]) => v.length > 0)
        .map(([id]) => Number(id)),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);

  const [openDbQueryId, setOpenDbQueryId] = useState<number | null>(null);
  const dbQueryDropdownRefs = useRef<Map<number, React.RefObject<HTMLDivElement | null>>>(new Map());

  function getDbQueryDropdownRef(id: number) {
    if (!dbQueryDropdownRefs.current.has(id)) {
      dbQueryDropdownRefs.current.set(id, { current: null });
    }
    return dbQueryDropdownRefs.current.get(id)!;
  }

  // 데이터 소스 관리 탭(DataSourceQueryTab)에서 등록한 뷰그룹 체크박스 옵션 소스 — 저장된 쿼리 개수만큼 옵션(VALUE/NAME) 조회.
  // 플레이스홀더로 등록된 것(placeholderName 있음, 예: nodeId)은 뷰그룹마다 고를 필요 없는 값이라 여기서 제외한다.
  // 상담그룹도 별도 직접선택 필드 없이 여기 체크박스(IC:GROUP:{mediaType} 등록 데이터소스)로 처리한다.
  // 예외 — 미디어타입(placeholderName='mediatype')은 플레이스홀더지만 뷰그룹마다 반드시 골라야 하는 필수값이라
  // 별도 "미디어타입 (필수)" 섹션으로 노출한다(2026-07-10 요건).
  const { data: allDbQueryDefs = [] } = useGetDbQueryDefList();
  const mediaTypeDefs = allDbQueryDefs.filter(isMediaTypeDef);
  const dbQueryDefs = allDbQueryDefs.filter((d) => !d.placeholderName);
  // 옵션 조회는 [미디어타입 defs, 일반 defs] 순으로 하나의 훅 호출에 합침 — 인덱스 접근 시 이 순서 기준
  const optionDefs = [...mediaTypeDefs, ...dbQueryDefs];
  const dbQueryOptionsResults = useGetDbQueryDefOptionsMulti(optionDefs.map((d) => d.dbQueryId));
  const modal = useModal();

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

  const toggleDbQueryEnabled = (dbQueryId: number) =>
    setEnabledDbQueryIds((prev) => {
      const next = new Set(prev);
      if (next.has(dbQueryId)) next.delete(dbQueryId);
      else next.add(dbQueryId);
      return next;
    });

  // 값을 하나라도 고르면 "사용" 체크박스를 자동으로 켠다 — 별도 체크박스와 드롭다운 선택을 각각
  // 건드려야 하는 2단계 조작이라, 드롭다운만 채우고 체크박스를 안 켠 채로 저장하면 handleSubmit이
  // enabledDbQueryIds 기준으로 이 항목을 통째로 걸러내(값은 골랐는데 저장 안 됨) 에러 없이 조용히
  // 선택이 사라지는 현상이 있었다(2026-07-10 실측 — 뷰그룹에 큐 리스트를 체크했다고 생각했는데
  // 실제 저장된 selectionJson엔 없었음). 값이 비면(전부 해제) 기존처럼 자동으로 끄진 않는다 —
  // 사용자가 명시적으로 껐다가 다시 켤 때 이전 선택을 잃지 않게 하려는 의도적 비대칭.
  const toggleDbQueryValue = (dbQueryId: number, value: string) => {
    setDbQuerySelections((prev) => {
      const current = prev[dbQueryId] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [dbQueryId]: next };
    });
    setEnabledDbQueryIds((prev) => (prev.has(dbQueryId) ? prev : new Set(prev).add(dbQueryId)));
  };
  const toggleAllDbQueryValues = (dbQueryId: number, allValues: string[]) => {
    setDbQuerySelections((prev) => {
      const current = prev[dbQueryId] ?? [];
      const next = current.length === allValues.length && allValues.length > 0 ? [] : allValues;
      return { ...prev, [dbQueryId]: next };
    });
    setEnabledDbQueryIds((prev) => (prev.has(dbQueryId) ? prev : new Set(prev).add(dbQueryId)));
  };

  const createDisplay = useCreateTaskboardDisplay({});
  const updateDisplay = useUpdateTaskboardDisplay({});

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast.error('뷰 그룹 이름을 입력해 주세요.');
      return;
    }
    // ── 필수 검증 (2026-07-10 요건): ①미디어타입 데이터소스 등록 자체가 없으면 안내 ②미디어타입 미선택 ③일반 리스트 미선택 ──
    if (mediaTypeDefs.length === 0) {
      modal.show.info(
        '미디어타입 데이터소스가 등록되어 있지 않습니다. 데이터 소스 관리 탭에서 플레이스홀더 이름 "mediatype"으로 미디어타입 목록을 먼저 등록해 주세요.',
        '미디어타입 등록 필요',
      );
      return;
    }
    const mediaTypeIds = new Set(mediaTypeDefs.map((d) => d.dbQueryId));
    const hasMediaTypeSelection = mediaTypeDefs.some((d) => (dbQuerySelections[d.dbQueryId] ?? []).length > 0);
    if (!hasMediaTypeSelection) {
      modal.show.info('미디어타입은 필수 선택입니다. 이 뷰 그룹에서 보여줄 미디어타입을 1개 이상 선택해 주세요.', '미디어타입 선택 필요');
      return;
    }
    const hasListSelection = Object.entries(dbQuerySelections).some(([id, v]) => v.length > 0 && enabledDbQueryIds.has(Number(id)) && !mediaTypeIds.has(Number(id)));
    if (!hasListSelection) {
      modal.show.info('미디어타입 외에 이 뷰 그룹에서 보여줄 데이터 리스트를 1개 이상 선택해 주세요.', '데이터 리스트 선택 필요');
      return;
    }
    const selectionJson = JSON.stringify({
      // 일반 데이터소스는 사용 체크된 것만, 미디어타입은 체크박스 없이 항상 저장(필수값)
      dbQuerySelections: Object.fromEntries(
        Object.entries(dbQuerySelections).filter(([id, v]) => v.length > 0 && (enabledDbQueryIds.has(Number(id)) || mediaTypeIds.has(Number(id)))),
      ),
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
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              미디어타입 <span className="text-red-500">*</span> <span className="font-normal text-slate-400">(필수 — 이 뷰 그룹에서 보여줄 미디어타입)</span>
            </label>
            <div className="flex flex-col gap-3 p-3 bg-sky-50 rounded-lg border border-sky-200">
              {mediaTypeDefs.map((def, idx) => {
                const optionsQuery = dbQueryOptionsResults[idx];
                const items = extractNameValueItems(optionsQuery?.data ?? []);
                const selected = dbQuerySelections[def.dbQueryId] ?? [];
                return (
                  <div key={def.dbQueryId} className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-sky-700 w-40 flex-shrink-0 truncate" title={def.queryName}>
                      {def.queryName}
                    </span>
                    <MultiSelectDropdown
                      label={def.queryName}
                      color="#0369a1"
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
              {mediaTypeDefs.length === 0 && (
                <p className="text-[10px] text-red-500 px-1">
                  미디어타입 데이터소스가 없습니다. 데이터 소스 관리 탭에서 플레이스홀더 이름 &quot;mediatype&quot;으로 먼저 등록해 주세요 (등록 전에는 뷰 그룹을 저장할 수
                  없습니다).
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">이 뷰 그룹에서 보여줄 데이터 (데이터 소스 관리 등록 데이터)</label>
            <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              {dbQueryDefs.map((def, idx) => {
                const optionsQuery = dbQueryOptionsResults[mediaTypeDefs.length + idx];
                const items = extractNameValueItems(optionsQuery?.data ?? []);
                const selected = dbQuerySelections[def.dbQueryId] ?? [];
                const enabled = enabledDbQueryIds.has(def.dbQueryId);
                return (
                  <div key={def.dbQueryId} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={() => toggleDbQueryEnabled(def.dbQueryId)}
                        className="flex-shrink-0 border-slate-300 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        title="이 뷰 그룹에서 이 데이터 소스 사용 여부"
                      />
                      <span className="text-[11px] font-semibold text-amber-700 w-40 flex-shrink-0 truncate" title={def.queryName}>
                        {def.queryName}
                      </span>
                      <div className={enabled ? '' : 'opacity-50 pointer-events-none'}>
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
                    </div>
                  </div>
                );
              })}

              {dbQueryDefs.length === 0 && (
                <p className="text-[10px] text-slate-400 italic px-1">데이터 소스 관리 탭에서 VALUE/NAME 쿼리를 등록하면 여기 선택 항목으로 추가됩니다.</p>
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
type MainTab = 'displays' | 'dataSource';

export default function TaskDisplayManage() {
  const { data: displays = [], isLoading, refetch } = useGetTaskboardDisplayList();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDisplay, setEditingDisplay] = useState<TaskboardDisplay | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<MainTab>('displays');

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    const title = activeTab === 'displays' ? '뷰 그룹 관리' : '데이터 소스 관리';
    setBreadcrumb([{ title: '전광판 관리' }, { title, path: '/taskboard/board/task-display' }]);
    return () => clearBreadcrumb();
  }, [activeTab, setBreadcrumb, clearBreadcrumb]);

  const { data: queueRows = [] } = useGetCtiQueueList({ queryOptions: { refetchInterval: false } });
  const nameMaps = {
    queue: new Map(queueRows.map((q) => [q.ctiqId, q.ctiqName])),
  };

  // 카드/목록 요약에 TASK-DB-QUERY 선택값도 함께 보여주기 위한 이름 매핑 (플레이스홀더 등록분은 뷰그룹 선택 대상이 아니라
  // 제외하되, 미디어타입(placeholderName='mediatype')은 뷰그룹 필수 선택값이라 요약에도 포함)
  const { data: allDbQueryDefsForSummary = [] } = useGetDbQueryDefList();
  const dbQueryDefs = allDbQueryDefsForSummary.filter((d) => !d.placeholderName || isMediaTypeDef(d));
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
    <div className="p-6 bg-slate-50 h-full flex flex-col overflow-hidden font-sans">
      <div className="mb-4 border-b pb-4 flex-shrink-0">
        {activeTab === 'displays' ? (
          <>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">뷰 그룹 관리</h1>
            <p className="text-sm text-slate-500 mt-1">전광판에 표시할 데이터를 묶어 뷰 그룹으로 만들고, 어떤 전광판(레이아웃)에든 그대로 입혀 재사용할 수 있습니다.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">데이터 소스 관리</h1>
            <p className="text-sm text-slate-500 mt-1">직접 등록한 데이터를 뷰 그룹에서 선택할 수 있도록 SELECT 쿼리로 만들어 저장합니다.</p>
          </>
        )}
      </div>

      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-white flex-shrink-0">
          <button
            onClick={() => setActiveTab('displays')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'displays' ? 'bg-[#0f5b9e] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            뷰 그룹
          </button>
          <button
            onClick={() => setActiveTab('dataSource')}
            className={`px-4 py-2 text-sm font-semibold border-l border-slate-200 transition-colors ${
              activeTab === 'dataSource' ? 'bg-[#0f5b9e] text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            데이터 소스 관리
          </button>
        </div>

        {activeTab === 'displays' && (
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
        )}
      </div>

      <div className={`flex-1 min-h-0 ${activeTab === 'dataSource' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {activeTab === 'dataSource' ? (
          <DataSourceQueryTab />
        ) : isLoading ? (
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
              <div
                key={d.displayId}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
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
      </div>

      {formOpen && <DisplayForm initial={editingDisplay} onSave={handleFormSave} onCancel={() => setFormOpen(false)} />}
    </div>
  );
}
