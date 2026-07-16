import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, LayoutGrid, List, Plus, Search, Settings2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { fuzzyFilter, toast } from '@/shared-util';
import TaskboardTenantBar from '../../features/board/components/TaskboardTenantBar';
import TenantBadge from '../../features/board/components/TenantBadge';
import {
  useCreateTaskboardDisplay,
  useDeleteTaskboardDisplay,
  useGetDbQueryDefList,
  useGetDbQueryDefOptionsMulti,
  useGetTaskboardDisplayList,
  useUpdateTaskboardDisplay,
} from '../../features/board/hooks/useTaskboardQueries';
import { useTaskboardWriteGuard } from '../../features/board/hooks/useTaskboardWriteGuard';
import DataSourceQueryTab from '../../features/board/tabs/DataSourceQueryTab';
import type { DbQueryDef, TaskboardDisplay, TaskboardDisplaySelection } from '../../features/board/types/taskboard.types';
import { extractNameValueItems } from '../../features/board/utils/redisValue';
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

/**
 * 미디어타입 데이터소스 판별 — 데이터소스 관리 탭에서 플레이스홀더 이름 "mediatype"(대소문자 무관)으로
 * 등록한 것. YAML(application-redis-key-map.yml)의 `{mediatype}` 토큰과 짝이며, 위젯의 마스킹된 해시키
 * (IC:CTIQ:{mediatype} 등)가 실행 시점에 이 데이터소스의 선택값으로 치환된다. 뷰그룹 등록 시 이 선택은
 * 필수(2026-07-10 사용자 요건) — 다른 플레이스홀더(groupid 등)와 달리 뷰그룹 폼에 노출한다.
 */
function isMediaTypeDef(def: DbQueryDef): boolean {
  return (def.placeholderName ?? '').trim().toLowerCase() === 'mediatype';
}

/** 값 개수가 이보다 많은 데이터 소스는 칩 위에 검색창을 노출한다(긴 목록을 스크롤로만 훑지 않게). */
const SEARCH_THRESHOLD = 10;

// ─── 선택값 요약 칩 — 데이터소스별 일부 이름 + 나머지 개수만 간략히 보여준다(카드/목록용) ──
interface SelectionCategory {
  label: string;
  color: string;
  ids: string[];
  nameMap: Map<string, string>;
}

function SelectionSummary({
  selection,
  dbQueryDefs,
  dbQueryNameMaps,
}: {
  selection: TaskboardDisplaySelection;
  dbQueryDefs: DbQueryDef[];
  dbQueryNameMaps: Map<number, Map<string, string>>;
}) {
  const categories: SelectionCategory[] = [
    ...dbQueryDefs.map((def) => ({
      label: def.queryName,
      color: isMediaTypeDef(def) ? '#0369a1' : '#b45309',
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

// ─── 개념 흐름 스트립 — 데이터 소스(재료) → 뷰 그룹(조합) → 전광판(표시)의 위계를 화면 맨 위에 고정해
// 처음 쓰는 사람이 "누가 무엇을 만들고 무엇을 고르는지"를 한눈에 잡게 한다. ──
function ConceptFlow() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] shadow-sm">
      <span className="inline-flex items-center gap-1.5">
        <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">재료 · 관리자</span>
        <b className="text-slate-700">데이터 소스</b>
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
      <span className="inline-flex items-center gap-1.5">
        <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0f5b9e] font-semibold">조합 · 운영자</span>
        <b className="text-slate-700">뷰 그룹</b>
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
      <span className="inline-flex items-center gap-1.5">
        <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">표시</span>
        <b className="text-slate-700">전광판</b>
      </span>
      <span className="ml-auto text-slate-400 hidden sm:inline">데이터 소스에서 고른 묶음(뷰 그룹)을 어떤 전광판에든 입힙니다.</span>
    </div>
  );
}

// ─── 미디어타입 토글 알약 — 보통 2~3개뿐인 필수값이라 드롭다운 대신 눌러서 켜는 알약이 더 빠르다 ──
function MediaTypePills({ items, selected, onToggle }: { items: { id: string; name: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const on = selected.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onToggle(it.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
              on ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-sky-300 text-sky-700 hover:bg-sky-50'
            }`}
          >
            {on && <span className="text-[11px]">✓</span>}
            {it.name}
          </button>
        );
      })}
      {items.length === 0 && <span className="text-[11px] text-slate-400 italic">옵션 없음</span>}
    </div>
  );
}

// ─── 데이터 소스 카드 — 스위치를 켜면 값 선택(칩)이 바로 펼쳐진다. 체크박스+드롭다운 2단 조작을 없애
// "값만 고르고 저장→조용히 누락"되던 사고를 원천 차단하고, 무엇을 골랐는지 닫지 않고도 보이게 한다. ──
function SourceCard({
  def,
  items,
  isFetching,
  enabled,
  expanded,
  selected,
  search,
  onToggleEnabled,
  onToggleExpanded,
  onToggleValue,
  onToggleShown,
  onSearch,
}: {
  def: DbQueryDef;
  items: { id: string; name: string }[];
  isFetching: boolean;
  enabled: boolean;
  expanded: boolean;
  selected: string[];
  search: string;
  onToggleEnabled: () => void;
  onToggleExpanded: () => void;
  onToggleValue: (id: string) => void;
  onToggleShown: (shownIds: string[]) => void;
  onSearch: (v: string) => void;
}) {
  const allSelected = items.length > 0 && selected.length === items.length;
  const shown = search.trim() ? fuzzyFilter(search, items, (i) => i.name) : items;
  // 현재 화면에 보이는(검색 필터된) 항목이 전부 선택됐는지 — "전체 선택"은 이 shown 기준으로만 동작한다.
  const allShownSelected = shown.length > 0 && shown.every((i) => selected.includes(i.id));

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${enabled ? 'border-amber-200 bg-white' : 'border-slate-200 bg-slate-50'}`}>
      {/* 스위치(on/off)와 펼치기(값 보기)는 별개 — 값 고른 뒤 접어도 스위치는 켜진 상태를 유지한다. */}
      <div className="w-full flex items-center gap-3 px-3.5 py-3">
        <button
          type="button"
          onClick={onToggleEnabled}
          title={enabled ? '이 데이터 끄기' : '이 데이터 켜기'}
          className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ${enabled ? 'bg-amber-600' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : ''}`} />
        </button>
        <button type="button" onClick={onToggleExpanded} className="flex-1 min-w-0 flex items-center gap-2 text-left">
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-bold text-slate-700 truncate">{def.queryName}</span>
            {def.description && <span className="block text-[11px] font-medium text-slate-400 truncate">{def.description}</span>}
          </span>
          <span className={`text-[11px] font-bold flex-shrink-0 ${enabled ? 'text-amber-700' : 'text-slate-400 font-medium'}`}>
            {!enabled ? '꺼짐' : allSelected ? '전체' : `${selected.length}개 선택`}
          </span>
          <ChevronRight className={`w-4 h-4 flex-shrink-0 text-slate-300 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-3 border-t border-slate-100 flex flex-col gap-2" style={{ paddingLeft: 48 }}>
          {items.length > SEARCH_THRESHOLD && (
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="값 검색..."
                className="w-full pl-6 pr-2 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:border-amber-400"
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5 max-h-44 overflow-y-auto">
            {shown.length > 0 && (
              <button
                type="button"
                onClick={() => onToggleShown(shown.map((i) => i.id))}
                className={`px-2.5 py-1 rounded-full text-[12px] border border-dashed transition-colors ${
                  allShownSelected ? 'bg-amber-600 border-amber-600 text-white font-semibold' : 'bg-white border-slate-300 text-slate-500 hover:border-amber-400'
                }`}
              >
                {allShownSelected ? '선택 해제' : search.trim() ? '검색결과 전체선택' : '전체 선택'}
              </button>
            )}
            {shown.map((it) => {
              const on = selected.includes(it.id);
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onToggleValue(it.id)}
                  className={`px-2.5 py-1 rounded-full text-[12px] border transition-colors ${
                    on ? 'bg-amber-600 border-amber-600 text-white font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                  }`}
                  title={it.id}
                >
                  {it.name}
                </button>
              );
            })}
            {isFetching && <span className="text-[11px] text-slate-400">불러오는 중...</span>}
            {!isFetching && items.length === 0 && <span className="text-[11px] text-slate-400 italic">옵션 없음</span>}
            {!isFetching && items.length > 0 && shown.length === 0 && <span className="text-[11px] text-slate-400 italic">검색 결과 없음</span>}
          </div>
          {enabled && selected.length === 0 && <span className="text-[11px] text-amber-600">값을 1개 이상 선택하세요 (없으면 저장 시 이 데이터는 빠집니다).</span>}
        </div>
      )}
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
  const { guardWrite } = useTaskboardWriteGuard();

  const [displayName, setDisplayName] = useState(initial?.displayName ?? '새 뷰 그룹');

  const [dbQuerySelections, setDbQuerySelections] = useState<Record<number, string[]>>(initialSelection.dbQuerySelections ?? {});
  // 데이터 소스별 사용 여부(스위치) — 초기값은 기존 선택값이 있던 소스를 사용 중으로 간주
  const [enabledDbQueryIds, setEnabledDbQueryIds] = useState<Set<number>>(
    new Set(
      Object.entries(initialSelection.dbQuerySelections ?? {})
        .filter(([, v]) => v.length > 0)
        .map(([id]) => Number(id)),
    ),
  );
  // 데이터 소스별 값 검색어 (긴 목록에서만 노출)
  const [srcSearch, setSrcSearch] = useState<Record<number, string>>({});
  // 데이터 소스별 펼침 상태 — 스위치(on/off)와 독립. 접어도 스위치는 유지된다(값 고른 뒤 접으면 꺼지던 버그 수정).
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // 데이터 소스 관리 탭에서 등록한 소스 목록. 플레이스홀더(placeholderName 있음)는 뷰그룹에서 고를 값이 아니라 제외하되,
  // 미디어타입(placeholderName='mediatype')은 뷰그룹 필수 선택값이라 별도 섹션으로 노출한다(2026-07-10 요건).
  const { data: allDbQueryDefs = [] } = useGetDbQueryDefList();
  const mediaTypeDefs = allDbQueryDefs.filter(isMediaTypeDef);
  const dbQueryDefs = allDbQueryDefs.filter((d) => !d.placeholderName);
  // 옵션 조회는 [미디어타입 defs, 일반 defs] 순으로 하나의 훅 호출에 합침 — 인덱스 접근 시 이 순서 기준
  const optionDefs = [...mediaTypeDefs, ...dbQueryDefs];
  const dbQueryOptionsResults = useGetDbQueryDefOptionsMulti(optionDefs.map((d) => d.dbQueryId));
  const modal = useModal();

  const toggleExpanded = (dbQueryId: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(dbQueryId)) next.delete(dbQueryId);
      else next.add(dbQueryId);
      return next;
    });

  // 스위치 on/off. 켤 때는 값 선택을 바로 할 수 있게 자동으로 펼친다. 끌 때는 펼침 상태를 건드리지 않는다.
  const toggleDbQueryEnabled = (dbQueryId: number) => {
    const wasEnabled = enabledDbQueryIds.has(dbQueryId);
    setEnabledDbQueryIds((prev) => {
      const next = new Set(prev);
      if (next.has(dbQueryId)) next.delete(dbQueryId);
      else next.add(dbQueryId);
      return next;
    });
    if (!wasEnabled) setExpandedIds((prev) => (prev.has(dbQueryId) ? prev : new Set(prev).add(dbQueryId)));
  };

  // 값을 하나라도 고르면 스위치를 자동으로 켠다 — 값만 고르고 스위치를 안 켜 저장 시 통째로 걸러지던(값은
  // 골랐는데 저장 안 됨) 사고를 막는다. 값이 비어도(전부 해제) 자동으로 끄진 않는다 — 명시적으로 껐다가
  // 다시 켤 때 이전 선택을 잃지 않게 하려는 의도적 비대칭.
  const toggleDbQueryValue = (dbQueryId: number, value: string) => {
    setDbQuerySelections((prev) => {
      const current = prev[dbQueryId] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [dbQueryId]: next };
    });
    setEnabledDbQueryIds((prev) => (prev.has(dbQueryId) ? prev : new Set(prev).add(dbQueryId)));
  };
  // 화면에 보이는(검색 필터된) 항목만 대상으로 일괄 토글 — 검색 후 "전체 선택"하면 검색된 항목만 체크된다.
  // 이미 shown 전부 선택돼 있으면 그것만 해제(다른 선택값은 유지), 아니면 shown을 기존 선택에 합친다.
  const toggleShownDbQueryValues = (dbQueryId: number, shownIds: string[]) => {
    setDbQuerySelections((prev) => {
      const current = prev[dbQueryId] ?? [];
      const allShownSelected = shownIds.length > 0 && shownIds.every((id) => current.includes(id));
      const next = allShownSelected ? current.filter((id) => !shownIds.includes(id)) : [...new Set([...current, ...shownIds])];
      return { ...prev, [dbQueryId]: next };
    });
    setEnabledDbQueryIds((prev) => (prev.has(dbQueryId) ? prev : new Set(prev).add(dbQueryId)));
  };

  const createDisplay = useCreateTaskboardDisplay({});
  const updateDisplay = useUpdateTaskboardDisplay({});

  const handleSubmit = async () => {
    if (!guardWrite()) return; // 다중 테넌트 View 중엔 뷰 그룹 생성·수정 차단
    if (!displayName.trim()) {
      toast.error('뷰 그룹 이름을 입력해 주세요.');
      return;
    }
    // ── 필수 검증 (2026-07-10 요건): ①미디어타입 데이터소스 등록 자체가 없으면 안내 ②미디어타입 미선택 ③일반 리스트 미선택 ──
    if (mediaTypeDefs.length === 0) {
      modal.show.info(
        '미디어타입 데이터소스가 등록되어 있지 않습니다. 데이터 소스 관리(고급)에서 플레이스홀더 이름 "mediatype"으로 미디어타입 목록을 먼저 등록해 주세요.',
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
      modal.show.info('미디어타입 외에 이 뷰 그룹에서 보여줄 데이터를 1개 이상 선택해 주세요.', '데이터 선택 필요');
      return;
    }
    const selectionJson = JSON.stringify({
      // 일반 데이터소스는 스위치가 켜진 것만, 미디어타입은 스위치 없이 항상 저장(필수값)
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

  // ── 실시간 요약: 저장 전에 "이 뷰 그룹이 실제로 보여줄 것"을 문장형 칩으로 확인 ──
  const mediaSummary = mediaTypeDefs.flatMap((def, idx) => {
    const items = extractNameValueItems(dbQueryOptionsResults[idx]?.data ?? []);
    return (dbQuerySelections[def.dbQueryId] ?? []).map((id) => items.find((i) => i.id === id)?.name ?? id);
  });
  const sourceSummary = dbQueryDefs
    .map((def, idx) => {
      const items = extractNameValueItems(dbQueryOptionsResults[mediaTypeDefs.length + idx]?.data ?? []);
      const sel = dbQuerySelections[def.dbQueryId] ?? [];
      const on = enabledDbQueryIds.has(def.dbQueryId) && sel.length > 0;
      const all = items.length > 0 && sel.length === items.length;
      return { name: def.queryName, on, text: all ? '전체' : `${sel.length}개` };
    })
    .filter((s) => s.on);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{initial ? '뷰 그룹 수정' : '새 뷰 그룹'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">전광판에 무엇을 보여줄지 고르는 묶음입니다.</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-[18px] h-[18px] rounded-full bg-[#0f5b9e] text-white text-[10px] flex items-center justify-center">1</span>이름
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-[18px] h-[18px] rounded-full bg-[#0f5b9e] text-white text-[10px] flex items-center justify-center">2</span>미디어타입
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-[18px] h-[18px] rounded-full bg-[#0f5b9e] text-white text-[10px] flex items-center justify-center">3</span>데이터
              </span>
            </div>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
              &times;
            </button>
          </div>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">뷰 그룹 이름</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 1팀 상황판, 본사 로비"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f5b9e] bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="text-[11px] font-bold text-[#0f5b9e] uppercase tracking-wide mb-2">이 뷰 그룹이 보여줄 것</div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                미디어 <b className="text-slate-800">{mediaSummary.length > 0 ? mediaSummary.join(' · ') : '미선택'}</b>
              </span>
              {sourceSummary.map((s) => (
                <span key={s.name} className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                  {s.name} <b className="text-slate-800">{s.text}</b>
                </span>
              ))}
              {sourceSummary.length === 0 && <span className="text-[12px] px-2.5 py-1 text-slate-400 italic">데이터 미선택</span>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              보여줄 데이터 <span className="font-normal text-slate-400">— 스위치를 켜면 값 선택이 열립니다</span>
            </label>
            <div className="flex flex-col gap-2">
              {dbQueryDefs.map((def, idx) => (
                <SourceCard
                  key={def.dbQueryId}
                  def={def}
                  items={extractNameValueItems(dbQueryOptionsResults[mediaTypeDefs.length + idx]?.data ?? [])}
                  isFetching={dbQueryOptionsResults[mediaTypeDefs.length + idx]?.isFetching ?? false}
                  enabled={enabledDbQueryIds.has(def.dbQueryId)}
                  expanded={expandedIds.has(def.dbQueryId)}
                  selected={dbQuerySelections[def.dbQueryId] ?? []}
                  search={srcSearch[def.dbQueryId] ?? ''}
                  onToggleEnabled={() => toggleDbQueryEnabled(def.dbQueryId)}
                  onToggleExpanded={() => toggleExpanded(def.dbQueryId)}
                  onToggleValue={(id) => toggleDbQueryValue(def.dbQueryId, id)}
                  onToggleShown={(shownIds) => toggleShownDbQueryValues(def.dbQueryId, shownIds)}
                  onSearch={(v) => setSrcSearch((prev) => ({ ...prev, [def.dbQueryId]: v }))}
                />
              ))}
              {dbQueryDefs.length === 0 && (
                <p className="text-[11px] text-slate-400 italic px-1 py-3">데이터 소스 관리(고급)에서 VALUE/NAME 쿼리를 등록하면 여기 선택 항목으로 추가됩니다.</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 flex flex-col gap-3">
            <label className="block text-xs font-semibold text-sky-700">
              미디어타입 <span className="text-red-500">*</span> <span className="font-normal text-sky-500">— 눌러서 켜기 (최소 1개)</span>
            </label>
            {mediaTypeDefs.length === 0 ? (
              <p className="text-[11px] text-red-500">
                미디어타입 데이터소스가 없습니다. 데이터 소스 관리(고급)에서 플레이스홀더 이름 &quot;mediatype&quot;으로 먼저 등록해 주세요 (등록 전에는 저장할 수 없습니다).
              </p>
            ) : (
              mediaTypeDefs.map((def, idx) => (
                <MediaTypePills
                  key={def.dbQueryId}
                  items={extractNameValueItems(dbQueryOptionsResults[idx]?.data ?? [])}
                  selected={dbQuerySelections[def.dbQueryId] ?? []}
                  onToggle={(id) => toggleDbQueryValue(def.dbQueryId, id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-md transition-colors">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm disabled:opacity-60"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TaskDisplayManage (메인) ─────────────────────────────────────────────────
// 뷰 그룹(데이터 선택값)은 전광판(레이아웃)과 매핑되지 않는 독립된 풀이다. 어떤 전광판에든 자유롭게
// 입혀 쓸 수 있으므로 여기서는 전광판 연결 관리를 하지 않는다.
// 데이터 소스 관리(SQL·Redis키·플레이스홀더)는 관리자 1회 세팅용이라 뷰 그룹과 동등 탭으로 두지 않고
// "고급 · 데이터 소스 관리" 진입 버튼으로 강등해 운영자의 첫인상 부담을 줄인다.
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
    const title = activeTab === 'displays' ? '뷰 그룹 관리' : '데이터 소스 관리 (고급)';
    setBreadcrumb([{ title: '전광판 관리' }, { title, path: '/taskboard/board/task-display' }]);
    return () => clearBreadcrumb();
  }, [activeTab, setBreadcrumb, clearBreadcrumb]);

  // 카드/목록 요약에 데이터소스 선택값 이름을 보여주기 위한 매핑 (플레이스홀더 등록분 제외, 미디어타입은 포함)
  const { data: allDbQueryDefsForSummary = [] } = useGetDbQueryDefList();
  const dbQueryDefs = allDbQueryDefsForSummary.filter((d) => !d.placeholderName || isMediaTypeDef(d));
  const dbQueryOptionsResults = useGetDbQueryDefOptionsMulti(dbQueryDefs.map((d) => d.dbQueryId));
  const dbQueryNameMaps = new Map<number, Map<string, string>>(
    dbQueryDefs.map((def, idx) => [def.dbQueryId, new Map(extractNameValueItems(dbQueryOptionsResults[idx]?.data ?? []).map((i) => [i.id, i.name]))]),
  );

  const deleteDisplay = useDeleteTaskboardDisplay({});
  const modal = useModal();
  const { guardWrite } = useTaskboardWriteGuard();

  const handleAdd = () => {
    if (!guardWrite()) return; // 다중 테넌트 View 중엔 뷰 그룹 생성 진입 차단
    setEditingDisplay(null);
    setFormOpen(true);
  };

  const handleEdit = (display: TaskboardDisplay) => {
    if (!guardWrite()) return; // 다중 테넌트 View 중엔 수정 진입 차단
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

  // ── 고급: 데이터 소스 관리 화면 ──
  if (activeTab === 'dataSource') {
    return (
      <div className="p-6 bg-slate-50 h-full flex flex-col overflow-hidden font-sans">
        <div className="mb-4 border-b pb-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab('displays')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#0f5b9e] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />뷰 그룹 관리로
          </button>
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-slate-400" />
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">데이터 소스 관리</h1>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <DataSourceQueryTab />
        </div>
      </div>
    );
  }

  // ── 뷰 그룹 관리 (메인) ──
  return (
    <div className="p-6 bg-slate-50 h-full flex flex-col overflow-hidden font-sans">
      <TaskboardTenantBar />
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">뷰 그룹 관리</h1>
      </div>

      <div className="flex-shrink-0">
        <ConceptFlow />
      </div>

      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />뷰 그룹 등록
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-md overflow-hidden flex-shrink-0 bg-white">
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
            onClick={() => setActiveTab('dataSource')}
            title="데이터 소스 관리 (관리자 세팅용)"
            className="px-3 py-2 border border-slate-200 rounded-md text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center gap-1.5 bg-white"
          >
            <Settings2 className="w-4 h-4" />
            고급 · 데이터 소스
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="py-24 text-center text-slate-400">불러오는 중...</div>
        ) : displays.length === 0 ? (
          <div className="py-24 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-white">
            <p className="text-lg font-medium">등록된 뷰 그룹이 없습니다.</p>
            <p className="text-sm mt-1">위의 &quot;뷰 그룹 등록&quot; 버튼을 눌러 추가하세요.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displays.map((d) => (
              <div key={d.displayId} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{d.displayName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">#{d.displayId}</div>
                    <div className="mt-1">
                      <TenantBadge tenantId={d.tenantId} />
                    </div>
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
                  <SelectionSummary selection={parseSelection(d.selectionJson)} dbQueryDefs={dbQueryDefs} dbQueryNameMaps={dbQueryNameMaps} />
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
                  <div className="mt-1">
                    <TenantBadge tenantId={d.tenantId} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <SelectionSummary selection={parseSelection(d.selectionJson)} dbQueryDefs={dbQueryDefs} dbQueryNameMaps={dbQueryNameMaps} />
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
