/**
 * BSR 그룹 관리 — 통합 페이지 (bsr-group-v3 목업 1:1 구현).
 *
 * 레이아웃:
 *  박스1: 헤더 (56px — 타이틀, 선택 테넌트·그룹 표시)
 *  박스2: 테넌트 카드 슬라이더 (기본 접힘)
 *  박스3: 좌 패널(리사이즈) ‖ 핸들 ‖ 우 패널
 *    좌: BSR 그룹 ag-Grid (체크박스+[삭제][등록], 행 더블클릭=수정 드로어)
 *    우: 탭 [CTI큐 배정 | 스케줄]
 *      CTI큐 탭: 업무그룹 트리 패널(240px, 읽기 전용) + CTI큐 그리드(셀렌더러 상시편집, 체크박스)
 *                액션바 [배정][배정 해제(danger)][저장] — BSR 패턴 dirty 행 일괄저장
 *      스케줄 탭: 스케줄 그리드 + 검색 + [배정 해제][배정]
 *
 * 인라인 편집 패턴 (AgentMediaStatusTable BSR 패턴):
 *  - 편집 가능 셀: InputNumber(가중치) + Select(BSR여부/분배여부) 상시 렌더
 *  - 변경 → dirtyMap 기록 + 행 배경 #eff3ff
 *  - [저장] 버튼 → dirty 행 일괄 PUT (무변경이면 토스트)
 */
import { type ChangeEvent, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CellStyle, ColDef, GridOptions, ICellRendererParams, SelectionChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, InputNumber, Select } from 'antd';
import { Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { GridRowColorLegend, ROW_COLOR_PALETTE } from '../../components/GridRowColorLegend';
import BsrCtiqAssignPanel from '../../features/bsr-ctiq-mapping/components/BsrCtiqAssignPanel';
import {
  useAssignBsrCtiq,
  useGetBsrCtiqMappings,
  useSearchBsrCtiq,
  useUnassignBsrCtiq,
  useUpdateBsrCtiqMappings,
} from '../../features/bsr-ctiq-mapping/hooks/useBsrCtiqMappingQueries';
import type { BsrCtiqMappingResponse } from '../../features/bsr-ctiq-mapping/types';
import BsrGroupFormDrawer from '../../features/bsr-group/components/BsrGroupFormDrawer';
import BsrScheduleAssignPanel from '../../features/bsr-group/components/BsrScheduleAssignPanel';
import {
  useAssignBsrSchedules,
  useCreateBsrGroup,
  useCreateBsrSchedule,
  useDeleteBsrGroupBatch,
  useGetBsrGroupSchedules,
  useGetBsrGroupTenants,
  useGetBsrGroups,
  useGetBsrSchedulePool,
  useUnassignBsrScheduleBatch,
  useUpdateBsrGroup,
} from '../../features/bsr-group/hooks/useBsrGroupQueries';
import {
  type BsrGroupCreateRequest,
  type BsrGroupResponse,
  type BsrGroupTenantStat,
  type BsrGroupUpdateRequest,
  type BsrScheduleInfoCreateRequest,
  type BsrScheduleInfoResponse,
  getBsrMethodLabel,
} from '../../features/bsr-group/types';
import { useGetCtiQueueGroups } from '../../features/cti-queue/hooks/useCtiQueueQueries';
import type { CtiQueueGroupResponse } from '../../features/cti-queue/types';
import { TreeCaret, TreeFolderIcon, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

// ──────────────────────────────────────────────────────────
//  Breadcrumb
// ──────────────────────────────────────────────────────────

const breadcrumb = [{ title: '번호자원관리' }, { title: '라우팅 설정' }, { title: 'BSR 그룹 관리', path: '/ipron/bsr-group-manage' }];

// ──────────────────────────────────────────────────────────
//  테넌트 카드 컴포넌트 (AdnList 표준 패턴)
// ──────────────────────────────────────────────────────────

interface BsrTenantCardProps {
  tenantId: number | null;
  tenantName: string;
  bsrGroupCount: number;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function BsrTenantCard({ tenantId, tenantName, bsrGroupCount, selected, onClick }: BsrTenantCardProps) {
  const isAll = tenantId === null;
  return (
    <div
      className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[240px] h-[100px] flex-shrink-0 flex flex-col ${
        selected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {isAll ? (
          <span className={`text-[13px] font-semibold ${selected ? 'text-[#405189]' : 'text-gray-600'}`}>전체</span>
        ) : (
          <>
            <Building2 className={`size-3.5 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
            <span className={`text-[13px] font-semibold truncate ${selected ? 'text-[#405189]' : 'text-gray-800'}`} title={tenantName}>
              {tenantName}
            </span>
          </>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-0.5 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">BSR 그룹</span>
          <span className="font-semibold text-gray-800">{bsrGroupCount.toLocaleString()}건</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
//  업무그룹 트리 패널 — 읽기 전용 (USER-DECISIONS §1)
// ──────────────────────────────────────────────────────────

interface ReadonlyTreePanelProps {
  groups: CtiQueueGroupResponse[];
  selectedTreeId: number | null; // null=전체, 0=미배정
  onSelect: (treeId: number | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** 드래그 리사이즈 — 패널 너비 (px). null 이면 기본 240px */
  width?: number | null;
  onResizeMouseDown?: (e: React.MouseEvent) => void;
  /** 배정 모드에서 '미배정' 칩 숨김 (scope '미배정만'과 용어 충돌 방지 — PLAN §3-2) */
  hideUnassignedChip?: boolean;
}

function ReadonlyTreePanel({ groups, selectedTreeId, onSelect, collapsed, onToggleCollapse, width, onResizeMouseDown, hideUnassignedChip }: ReadonlyTreePanelProps) {
  const [treeSearch, setTreeSearch] = useState('');

  const { items, rootProps, allExpanded, toggleAll } = useTreeView<CtiQueueGroupResponse>({
    data: groups,
    getId: (n) => String(n.treeId),
    getChildren: (n) => n.children,
    getName: (n) => n.treeName,
    searchText: treeSearch,
    ariaLabel: '업무그룹 트리 (읽기 전용)',
  });

  const hasExpandable = groups.some((n) => (n.children ?? []).length > 0);

  const renderRow = useCallback(
    (item: TreeViewItem<CtiQueueGroupResponse>) => {
      const node = item.node;
      const isSelected = selectedTreeId === node.treeId;
      return (
        <TreeRow key={item.id} item={item} selected={isSelected} onClick={() => onSelect(node.treeId)}>
          <TreeCaret item={item} />
          <TreeFolderIcon item={item} selected={isSelected} />
          <TreeLabel selected={isSelected} title={node.treeName}>
            {node.treeName}
          </TreeLabel>
        </TreeRow>
      );
    },
    [selectedTreeId, onSelect],
  );

  if (collapsed) {
    return (
      <div className="flex-shrink-0 border-r border-gray-100 bg-white flex flex-col min-h-0" style={{ width: 36, minWidth: 36 }}>
        {/* 헤더: 펼치기 버튼 */}
        <div className="h-[44px] border-b border-gray-100 flex items-center justify-center flex-shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            title="업무그룹 패널 펼치기"
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-[#405189]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        {/* 세로 라벨 — writing-mode:vertical-rl 로 한글 정립(위→아래). rotate 불필요·역효과 */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <span className="text-[11px] text-gray-400 select-none" style={{ writingMode: 'vertical-rl', whiteSpace: 'nowrap' }}>
            업무그룹
          </span>
        </div>
      </div>
    );
  }

  const panelWidth = width != null ? Math.max(160, width) : 240;

  return (
    <>
      <div className="flex-shrink-0 border-r border-gray-100 bg-white flex flex-col min-h-0" style={{ width: panelWidth, minWidth: 160 }}>
        {/* 헤더: 제목 + 접기 버튼 */}
        <div className="h-[44px] border-b border-gray-100 flex items-center px-2.5 gap-1.5 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700 flex-1">업무그룹</span>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="업무그룹 패널 접기"
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-[#405189]"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>

        {/* 검색 */}
        <div className="px-2.5 py-2 border-b border-gray-100 flex-shrink-0">
          <Input
            allowClear
            prefix={<Search className="size-3.5 text-gray-400" />}
            placeholder="업무그룹 검색"
            value={treeSearch}
            onChange={(e) => setTreeSearch(e.target.value)}
            size="small"
          />
        </div>

        {/* 전체/미배정 칩 + 전체펼침 */}
        <div className="px-2.5 py-1.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition ${
              selectedTreeId === null ? 'border-[#405189] bg-[#405189] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#405189]/40 hover:text-[#405189]'
            }`}
          >
            전체
          </button>
          {!hideUnassignedChip && (
            <button
              type="button"
              onClick={() => onSelect(0)}
              className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition ${
                selectedTreeId === 0 ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-200 bg-white text-amber-600 hover:border-amber-400'
              }`}
            >
              미배정
            </button>
          )}
          {hasExpandable && (
            <button
              type="button"
              onClick={toggleAll}
              title={allExpanded ? '모두 접기' : '모두 펼치기'}
              className="ml-auto w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-white hover:text-[#405189] text-xs border border-transparent hover:border-gray-200"
            >
              {allExpanded ? '⇅' : '⇅'}
            </button>
          )}
        </div>

        {/* 트리 */}
        <div className="flex-1 overflow-auto py-1">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-[11px] text-gray-400">등록된 업무그룹이 없습니다</div>
          ) : (
            <div {...rootProps}>{items.map(renderRow)}</div>
          )}
        </div>
      </div>

      {/* 트리↔그리드 드래그 리사이즈 스플리터 */}
      <div className="flex-[0_0_8px] flex items-center justify-center cursor-col-resize group flex-shrink-0" onMouseDown={onResizeMouseDown}>
        <div className="w-0.5 h-8 rounded-sm bg-gray-200 group-hover:bg-[#405189] transition-colors" />
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────
//  CTI큐 인라인 편집 — BSR dirty 패턴 (AgentMediaStatusTable 표준)
// ──────────────────────────────────────────────────────────

/** dirty 엔트리: ctiqId → 변경된 필드값 */
interface CtiqDirtyEntry {
  bsrWeight?: number;
  bsrYn?: number;
  bsrDistributeYn?: number;
}

interface CtiqEditCtx {
  dirtyMap: Map<number, CtiqDirtyEntry>;
  setDirtyEntry: (ctiqId: number, entry: CtiqDirtyEntry | null) => void;
}

const CtiqEditContext = createContext<CtiqEditCtx | null>(null);

function useCtiqEdit() {
  const ctx = useContext(CtiqEditContext);
  if (!ctx) throw new Error('CtiqEditContext missing');
  return ctx;
}

/** BSR 가중치 — 상시 InputNumber 렌더 */
function BsrWeightCell({ params }: { params: ICellRendererParams<BsrCtiqMappingResponse> }) {
  const { dirtyMap, setDirtyEntry } = useCtiqEdit();
  const data = params.data;
  const dirty = data ? dirtyMap.get(data.ctiqId) : undefined;
  const currentVal = dirty?.bsrWeight ?? data?.bsrWeight ?? 0;
  const [localVal, setLocalVal] = useState<number>(currentVal);

  useEffect(() => {
    setLocalVal(dirty?.bsrWeight ?? data?.bsrWeight ?? 0);
  }, [dirty?.bsrWeight, data?.bsrWeight, data?.ctiqId]);

  if (!data) return null;

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ padding: '2px 4px' }}>
      <InputNumber
        size="small"
        style={{ width: '100%' }}
        min={0}
        max={1000}
        value={localVal}
        onChange={(v) => setLocalVal(typeof v === 'number' ? v : localVal)}
        onBlur={() => {
          const clamped = Math.min(1000, Math.max(0, localVal));
          if (clamped !== localVal) setLocalVal(clamped);
          const orig = data.bsrWeight ?? 0;
          const prev = dirtyMap.get(data.ctiqId) ?? {};
          if (clamped === orig && prev.bsrYn == null && prev.bsrDistributeYn == null) {
            setDirtyEntry(data.ctiqId, null);
          } else {
            setDirtyEntry(data.ctiqId, { ...prev, bsrWeight: clamped });
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLElement).blur();
        }}
      />
    </div>
  );
}

const YN_OPTIONS = [
  { value: 1, label: '설정' },
  { value: 0, label: '해제' },
];

/** BSR 사용여부 — 상시 Select 렌더 */
function BsrYnCell({ params }: { params: ICellRendererParams<BsrCtiqMappingResponse> }) {
  const { dirtyMap, setDirtyEntry } = useCtiqEdit();
  const data = params.data;
  if (!data) return null;
  const dirty = dirtyMap.get(data.ctiqId);
  const currentVal = dirty?.bsrYn ?? data.bsrYn ?? 0;

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ padding: '2px 4px' }}>
      <Select
        size="small"
        style={{ width: '100%' }}
        value={currentVal}
        options={YN_OPTIONS}
        onChange={(v) => {
          const prev = dirtyMap.get(data.ctiqId) ?? {};
          const orig = data.bsrYn ?? 0;
          const prevWeight = prev.bsrWeight;
          const prevDist = prev.bsrDistributeYn;
          if (v === orig && prevWeight == null && prevDist == null) {
            setDirtyEntry(data.ctiqId, null);
          } else {
            setDirtyEntry(data.ctiqId, { ...prev, bsrYn: v });
          }
        }}
      />
    </div>
  );
}

/** BSR 분배여부 — 상시 Select 렌더 */
function BsrDistributeYnCell({ params }: { params: ICellRendererParams<BsrCtiqMappingResponse> }) {
  const { dirtyMap, setDirtyEntry } = useCtiqEdit();
  const data = params.data;
  if (!data) return null;
  const dirty = dirtyMap.get(data.ctiqId);
  const currentVal = dirty?.bsrDistributeYn ?? data.bsrDistributeYn ?? 0;

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ padding: '2px 4px' }}>
      <Select
        size="small"
        style={{ width: '100%' }}
        value={currentVal}
        options={YN_OPTIONS}
        onChange={(v) => {
          const prev = dirtyMap.get(data.ctiqId) ?? {};
          const orig = data.bsrDistributeYn ?? 0;
          const prevWeight = prev.bsrWeight;
          const prevYn = prev.bsrYn;
          if (v === orig && prevWeight == null && prevYn == null) {
            setDirtyEntry(data.ctiqId, null);
          } else {
            setDirtyEntry(data.ctiqId, { ...prev, bsrDistributeYn: v });
          }
        }}
      />
    </div>
  );
}

const CTIQ_EDITABLE_CELL_STYLE: CellStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 6px',
  background: ROW_COLOR_PALETTE.editableCell,
};

const CTIQ_ROW_CLASS_RULES = {
  'bsr-ctiq-dirty-row': (params: { data?: BsrCtiqMappingResponse; context?: { dirtySet?: Set<number> } }) => {
    if (!params.data || !params.context?.dirtySet) return false;
    return params.context.dirtySet.has(params.data.ctiqId);
  },
};

// ──────────────────────────────────────────────────────────
//  유틸
// ──────────────────────────────────────────────────────────

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

/** 트리에서 treeId + 모든 하위 descendant treeId 목록 반환 */
function getDescendantIds(nodes: CtiQueueGroupResponse[], rootId: number): number[] {
  const result: number[] = [];
  function walk(list: CtiQueueGroupResponse[]) {
    for (const n of list) {
      if (n.treeId === rootId || result.includes(rootId)) {
        result.push(n.treeId);
        walk(n.children ?? []);
      } else {
        walk(n.children ?? []);
      }
    }
  }
  // rootId 자신 포함 하위 전체
  function collect(list: CtiQueueGroupResponse[], targetId: number): boolean {
    for (const n of list) {
      if (n.treeId === targetId) {
        result.push(n.treeId);
        (n.children ?? []).forEach((c) => collectAll(c));
        return true;
      }
      if (collect(n.children ?? [], targetId)) return true;
    }
    return false;
  }
  function collectAll(n: CtiQueueGroupResponse) {
    result.push(n.treeId);
    (n.children ?? []).forEach((c) => collectAll(c));
  }
  collect(nodes, rootId);
  return result;
}

// ──────────────────────────────────────────────────────────
//  메인 페이지
// ──────────────────────────────────────────────────────────

export default function BsrGroupManage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const cardScrollRef = useRef<HTMLDivElement>(null);

  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(ctxTenantId);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [grpSearch, setGrpSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<BsrGroupResponse | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'ctiq' | 'sched'>('ctiq');
  /** 배정 모드 상태머신: manage=관리(기본) / assign=CTI큐 배정 / scheduleAssign=스케줄 배정 */
  const [tabMode, setTabMode] = useState<'manage' | 'assign' | 'scheduleAssign'>('manage');

  // 좌 패널 폭 (px, 기본 42%)
  const splitBoxRef = useRef<HTMLDivElement>(null);
  const panelLeftRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState<number | null>(null);

  // CTI큐 탭
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [treePanelWidth, setTreePanelWidth] = useState<number | null>(null); // null=240px 기본
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null); // null=전체, 0=미배정
  const [ctiqSearch, setCtiqSearch] = useState('');
  /** BSR 패턴 dirty 맵 (ctiqId → 변경 필드값) */
  const [ctiqDirtyMap, setCtiqDirtyMap] = useState<Map<number, CtiqDirtyEntry>>(new Map());
  const [selectedCtiqIds, setSelectedCtiqIds] = useState<number[]>([]);

  // 스케줄 탭
  const [schedSearch, setSchedSearch] = useState('');
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<number[]>([]);

  // 드로어
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [groupDrawerMode, setGroupDrawerMode] = useState<'create' | 'edit'>('create');
  const [groupDrawerData, setGroupDrawerData] = useState<BsrGroupResponse | null>(null);

  useEffect(() => {
    if (ctxTenantId != null && selectedTenantId === null) setSelectedTenantId(ctxTenantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTenantId]);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: tenantStats = [] } = useGetBsrGroupTenants();
  const { data: groups = [], isLoading: isGroupsLoading } = useGetBsrGroups({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
  });

  const tenantIdForCtiq = selectedGroup?.tenantId ?? selectedTenantId;

  const { data: ctiqMappings = [], isLoading: isCtiqLoading } = useGetBsrCtiqMappings(selectedGroup?.bsrGroupId, tenantIdForCtiq);

  const { data: schedules = [], isLoading: isSchedulesLoading } = useGetBsrGroupSchedules(selectedGroup?.bsrGroupId ?? null);

  const { data: schedulePool = [], isLoading: isPoolLoading } = useGetBsrSchedulePool({
    params: tenantIdForCtiq != null && selectedGroup != null ? { tenantId: tenantIdForCtiq, bsrGroupId: selectedGroup.bsrGroupId } : undefined,
    queryOptions: { enabled: !!selectedGroup && !!tenantIdForCtiq && tabMode === 'scheduleAssign' },
  });

  // 업무그룹 트리 데이터 — 그룹 선택 시 즉시 로드 (tenantId 우선, fallback: selectedTenantId)
  const tenantIdForTree = selectedGroup?.tenantId ?? selectedTenantId;
  const { data: treeGroups = [] } = useGetCtiQueueGroups({
    params: tenantIdForTree != null ? { tenantId: tenantIdForTree } : undefined,
    queryOptions: { enabled: !!selectedGroup },
  });

  // CTI큐 배정 검색
  const { mutate: searchCtiq, isPending: isSearching, data: searchResult = { total: 0, items: [] } } = useSearchBsrCtiq();

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createGroup, isPending: isCreating } = useCreateBsrGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('BSR 그룹이 등록되었습니다');
        setGroupDrawerOpen(false);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '등록 실패')),
    },
  });
  const { mutate: updateGroup, isPending: isUpdating } = useUpdateBsrGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('BSR 그룹이 수정되었습니다');
        setGroupDrawerOpen(false);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '수정 실패')),
    },
  });
  const { mutate: deleteGroupBatch } = useDeleteBsrGroupBatch({
    mutationOptions: {
      onSuccess: () => {
        toast.success('BSR 그룹이 삭제되었습니다');
        setSelectedGroup(null);
        setSelectedGroupIds([]);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '삭제 실패')),
    },
  });

  const { mutate: updateCtiq, isPending: isSavingCtiq } = useUpdateBsrCtiqMappings({
    mutationOptions: {
      onSuccess: () => {
        toast.success('저장되었습니다');
        setCtiqDirtyMap(new Map());
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '저장 실패')),
    },
  });

  const { mutate: assignCtiq, isPending: isAssigningCtiq } = useAssignBsrCtiq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('배정되었습니다');
        setTabMode('manage'); // 배정 성공 → 관리 모드 자동 복귀 (PLAN §3-1)
        setCtiqDirtyMap(new Map());
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '배정 실패')),
    },
  });

  const { mutate: unassignCtiq, isPending: isUnassigning } = useUnassignBsrCtiq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('배정이 해제되었습니다');
        setSelectedCtiqIds([]);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '해제 실패')),
    },
  });

  const { mutate: assignSchedules, isPending: isAssigningSchedule } = useAssignBsrSchedules({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케줄이 배정되었습니다');
        setTabMode('manage'); // 배정 성공 → 관리 모드 자동 복귀
        setSelectedScheduleIds([]);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '스케줄 배정 실패')),
    },
  });

  const { mutate: unassignScheduleBatch } = useUnassignBsrScheduleBatch({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케줄 배정이 해제되었습니다');
        setSelectedScheduleIds([]);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '해제 실패')),
    },
  });

  const { mutate: createSchedule, isPending: isCreatingSchedule } = useCreateBsrSchedule({
    mutationOptions: {
      onSuccess: (newSched) => {
        if (selectedGroup) {
          // 생성 즉시 배정 (onSuccess에서 assignSchedules 호출 → assignSchedules.onSuccess 에서 manage 복귀)
          assignSchedules({ bsrGroupId: selectedGroup.bsrGroupId, scheduleIds: [newSched.bsrScheduleId] });
        }
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '스케줄 생성 실패')),
    },
  });

  const ctiqGridRef = useRef<import('ag-grid-react').AgGridReact<BsrCtiqMappingResponse>>(null);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const totalGroupCount = useMemo(() => tenantStats.reduce((s: number, t: BsrGroupTenantStat) => s + (t.bsrGroupCount ?? 0), 0), [tenantStats]);

  const filteredGroups = useMemo(() => {
    const kw = grpSearch.trim().toLowerCase();
    if (!kw) return groups;
    return groups.filter((g) => [g.bsrGroupName, g.bsrMethod, g.bsrGroupDesc].some((f) => f && String(f).toLowerCase().includes(kw)));
  }, [groups, grpSearch]);

  /**
   * 메인 화면 업무그룹 트리: CTI큐가 1개라도 속한 노드만 노출.
   * 배정 모달은 treeGroups(전체)를 그대로 사용 — 변경 금지.
   */
  const filteredTreeGroups = useMemo(() => filterTreeWithQueues(treeGroups), [treeGroups]);

  /** 스케줄 그리드 클라이언트 필터 */
  const filteredSchedules = useMemo(() => {
    const kw = schedSearch.trim().toLowerCase();
    if (!kw) return schedules;
    return schedules.filter((s) => s.bsrScheduleName?.toLowerCase().includes(kw));
  }, [schedules, schedSearch]);

  /** 업무그룹 트리 필터: 선택된 treeId 하위 포함 */
  const filteredCtiq = useMemo(() => {
    let base = ctiqMappings;
    if (selectedTreeId !== null) {
      if (selectedTreeId === 0) {
        base = base.filter((c) => !c.treeName);
      } else {
        const ids = getDescendantIds(treeGroups, selectedTreeId);
        base = base.filter((c) => {
          // treeName 기반 매칭 (treeId 직접 없으면 name 비교)
          const node = findNodeByDescendants(treeGroups, ids);
          return ids.length > 0 ? treeNodeMatchesCtiq(treeGroups, c, ids) : true;
        });
      }
    }
    const kw = ctiqSearch.trim().toLowerCase();
    if (kw) base = base.filter((c) => [c.ctiqName, c.gdnNo, c.gdnName, c.treeName].some((f) => f && String(f).toLowerCase().includes(kw)));
    return base;
  }, [ctiqMappings, selectedTreeId, ctiqSearch, treeGroups]);

  // ─── 좌우 패널 리사이즈 핸들 ─────────────────────────────────────────────────
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = panelLeftRef.current?.getBoundingClientRect().width ?? 0;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // ─── 트리↔그리드 리사이즈 핸들 ───────────────────────────────────────────────
  const isTreeDragging = useRef(false);
  const treeDragStartX = useRef(0);
  const treeDragStartW = useRef(0);

  const handleTreeResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isTreeDragging.current = true;
      treeDragStartX.current = e.clientX;
      treeDragStartW.current = treePanelWidth ?? 240;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    },
    [treePanelWidth],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        if (!splitBoxRef.current) return;
        const total = splitBoxRef.current.getBoundingClientRect().width;
        let w = dragStartW.current + (e.clientX - dragStartX.current);
        if (w < 320) w = 320;
        if (w > total - 480 - 16) w = total - 480 - 16;
        setLeftWidth(w);
      }
      if (isTreeDragging.current) {
        let w = treeDragStartW.current + (e.clientX - treeDragStartX.current);
        if (w < 160) w = 160;
        if (w > 480) w = 480;
        setTreePanelWidth(w);
      }
    };
    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (isTreeDragging.current) {
        isTreeDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  // 우측 상세 패널이 따라갈 "활성 행" 전환 (그룹 변경 시 탭/편집 상태 리셋, PLAN §3-2)
  const activateGroup = useCallback((row: BsrGroupResponse) => {
    setSelectedGroup(row);
    setSelectedCtiqIds([]);
    setSelectedScheduleIds([]);
    setCtiqDirtyMap(new Map());
    setSelectedTreeId(null);
    setActiveTab('ctiq');
    setTabMode('manage');
  }, []);

  // 체크박스 멀티셀렉트(일괄삭제용 selectedGroupIds)와 단일 활성행(우패널) 을 onSelectionChanged 하나로 통합.
  // - selectedGroupIds: 체크된 전체 행 (삭제 대상)
  // - selectedGroup: 사용자가 방금 포커스한 행 → 우패널을 그 그룹으로 전환 (열림 상태 유지, hybrid onRowClicked 제거)
  const handleGroupSelectionChanged = useCallback(
    (e: SelectionChangedEvent<BsrGroupResponse>) => {
      setSelectedGroupIds(e.api.getSelectedRows().map((r) => r.bsrGroupId));

      const focused = e.api.getFocusedCell();
      if (focused) {
        const focusedRow = e.api.getDisplayedRowAtIndex(focused.rowIndex)?.data;
        if (focusedRow && focusedRow.bsrGroupId !== selectedGroup?.bsrGroupId) {
          activateGroup(focusedRow);
        }
      }
    },
    [activateGroup, selectedGroup],
  );

  const handleGroupDblClick = useCallback((row: BsrGroupResponse) => {
    setGroupDrawerMode('edit');
    setGroupDrawerData(row);
    setGroupDrawerOpen(true);
  }, []);

  const handleGroupCreate = useCallback(() => {
    if (!selectedTenantId) {
      toast.warning('테넌트를 먼저 선택하세요');
      return;
    }
    setGroupDrawerMode('create');
    setGroupDrawerData(null);
    setGroupDrawerOpen(true);
  }, [selectedTenantId]);

  const handleGroupDelete = useCallback(() => {
    if (selectedGroupIds.length === 0) return;
    modal.confirm.execute({
      onOk: () => deleteGroupBatch(selectedGroupIds),
      options: { title: 'BSR 그룹 삭제', content: `선택한 ${selectedGroupIds.length}건을 삭제하시겠습니까?` },
    });
  }, [selectedGroupIds, modal, deleteGroupBatch]);

  const handleGroupDrawerSubmit = useCallback(
    (req: BsrGroupCreateRequest | BsrGroupUpdateRequest) => {
      if (groupDrawerMode === 'create') createGroup({ ...req, tenantId: selectedTenantId as number });
      else if (groupDrawerData) updateGroup({ id: groupDrawerData.bsrGroupId, body: req as BsrGroupUpdateRequest });
    },
    [groupDrawerMode, groupDrawerData, createGroup, updateGroup, selectedTenantId],
  );

  // CTI큐 dirty 맵 헬퍼 (BSR 패턴)
  const setCtiqDirtyEntry = useCallback((ctiqId: number, entry: CtiqDirtyEntry | null) => {
    setCtiqDirtyMap((prev) => {
      const next = new Map(prev);
      if (entry === null) next.delete(ctiqId);
      else next.set(ctiqId, entry);
      return next;
    });
  }, []);

  const ctiqDirtySet = useMemo(() => new Set(ctiqDirtyMap.keys()), [ctiqDirtyMap]);

  // ctiqDirtyMap 변경 시 ag-Grid dirty 행 강제 리드로 (rowClassRules 갱신)

  useEffect(() => {
    ctiqGridRef.current?.api?.redrawRows();
  }, [ctiqDirtySet]);

  const handleCtiqSave = useCallback(() => {
    if (!selectedGroup) return;
    if (ctiqDirtyMap.size === 0) {
      toast.info('변경할 데이터가 존재하지 않습니다');
      return;
    }
    const items = Array.from(ctiqDirtyMap.entries()).map(([ctiqId, entry]) => ({
      ctiqId,
      ...entry,
    }));
    updateCtiq({
      bsrGroupId: selectedGroup.bsrGroupId,
      body: { items },
    });
  }, [selectedGroup, ctiqDirtyMap, updateCtiq]);

  const handleCtiqUnassign = useCallback(() => {
    if (selectedCtiqIds.length === 0 || !selectedGroup) return;
    modal.confirm.execute({
      onOk: () => unassignCtiq({ bsrGroupId: selectedGroup.bsrGroupId, body: { ctiqIds: selectedCtiqIds } }),
      options: {
        title: '배정 해제 확인',
        content: `선택한 ${selectedCtiqIds.length}건의 CTI큐를 이 그룹에서 해제하시겠습니까?`,
      },
    });
  }, [selectedCtiqIds, selectedGroup, modal, unassignCtiq]);

  const handleCtiqAssign = useCallback(
    (targetBsrGroupId: number, ctiqIds: number[]) => {
      assignCtiq({ targetBsrGroupId, ctiqIds });
    },
    [assignCtiq],
  );

  /**
   * CTI큐 배정 모드 → 관리 모드 복귀 (닫기 버튼 / ESC / 배정 성공).
   * PLAN §3-2: 복귀 시 selectedTreeId가 관리 모드 트리(빈 노드 숨김)에 없으면 null 리셋.
   */
  const handleAssignDone = useCallback(() => {
    setTabMode('manage');
    // 배정 모드에서 선택했던 treeId가 filteredTreeGroups(빈 노드 제외)에 없으면 null
    if (selectedTreeId !== null && selectedTreeId !== 0) {
      const existsInFiltered = (nodes: CtiQueueGroupResponse[], id: number): boolean => {
        for (const n of nodes) {
          if (n.treeId === id) return true;
          if (existsInFiltered(n.children ?? [], id)) return true;
        }
        return false;
      };
      if (!existsInFiltered(filteredTreeGroups, selectedTreeId)) {
        setSelectedTreeId(null);
      }
    }
  }, [selectedTreeId, filteredTreeGroups]);

  /** 스케줄 배정 모드 → 스케줄 관리 모드 복귀 (닫기 버튼 / 배정 성공 자동 복귀) */
  const handleScheduleAssignDone = useCallback(() => {
    setTabMode('manage');
  }, []);

  const handleSchedUnassign = useCallback(() => {
    if (selectedScheduleIds.length === 0 || !selectedGroup) return;
    modal.confirm.execute({
      onOk: () => unassignScheduleBatch({ bsrGroupId: selectedGroup.bsrGroupId, scheduleIds: selectedScheduleIds }),
      options: { title: '스케줄 배정 해제', content: `선택한 ${selectedScheduleIds.length}건의 스케줄 배정을 해제하시겠습니까?` },
    });
  }, [selectedScheduleIds, selectedGroup, modal, unassignScheduleBatch]);

  // ─── Column Defs ────────────────────────────────────────────────────────────
  const groupColDefs: ColDef<BsrGroupResponse>[] = useMemo(
    () => [
      { field: 'bsrGroupName', headerName: 'BSR 그룹명', flex: 1, tooltipField: 'bsrGroupName' },
      {
        field: 'bsrMethod',
        headerName: 'BSR 메소드',
        minWidth: 180,
        flex: 1,
        filterValueGetter: ({ data }) => getBsrMethodLabel((data?.bsrMethod ?? null) as string | null),
        valueFormatter: ({ value }) => getBsrMethodLabel(value as string | null),
        tooltipValueGetter: ({ data }) => getBsrMethodLabel((data?.bsrMethod ?? null) as string | null),
      },
      {
        field: 'activateYn',
        headerName: '활성화',
        width: 80,
        filterValueGetter: ({ data }) => (data?.activateYn === 1 ? '활성' : '비활성'),
        valueFormatter: ({ value }) => (value === 1 ? '활성' : '비활성'),
      },
      { field: 'sortSeq', headerName: '정렬', width: 60, filter: 'agNumberColumnFilter' },
      { field: 'bsrGroupDesc', headerName: '설명', flex: 1, tooltipField: 'bsrGroupDesc' },
    ],
    [],
  );

  const ctiqColDefs: ColDef<BsrCtiqMappingResponse>[] = useMemo(
    () => [
      {
        headerName: '테넌트',
        field: 'tenantName',
        flex: 1,
        minWidth: 120,
        tooltipField: 'tenantName',
        valueFormatter: ({ value }) => value ?? '-',
        hide: selectedTenantId !== null,
      },
      { field: 'ctiqName', headerName: 'CTI큐명', flex: 1, tooltipField: 'ctiqName' },
      { field: 'gdnNo', headerName: '그룹DN 번호', width: 110, tooltipField: 'gdnName' },
      {
        field: 'treeName',
        headerName: '업무그룹명',
        width: 130,
        filterValueGetter: ({ data }) => data?.treeName ?? '-',
        valueFormatter: ({ value }) => value ?? '-',
        tooltipField: 'treeName',
      },
      {
        headerName: 'BSR 가중치',
        colId: 'bsrWeight',
        width: 110,
        filter: 'agNumberColumnFilter',
        filterValueGetter: ({ data }) => data?.bsrWeight ?? 0,
        cellStyle: CTIQ_EDITABLE_CELL_STYLE,
        cellRenderer: (params: ICellRendererParams<BsrCtiqMappingResponse>) => <BsrWeightCell params={params} />,
      },
      {
        headerName: 'BSR 사용여부',
        colId: 'bsrYn',
        width: 120,
        filterValueGetter: ({ data }) => (data?.bsrYn === 1 ? '설정' : '해제'),
        cellStyle: CTIQ_EDITABLE_CELL_STYLE,
        cellRenderer: (params: ICellRendererParams<BsrCtiqMappingResponse>) => <BsrYnCell params={params} />,
      },
      {
        headerName: 'BSR 분배여부',
        colId: 'bsrDistributeYn',
        width: 120,
        filterValueGetter: ({ data }) => (data?.bsrDistributeYn === 1 ? '설정' : '해제'),
        cellStyle: CTIQ_EDITABLE_CELL_STYLE,
        cellRenderer: (params: ICellRendererParams<BsrCtiqMappingResponse>) => <BsrDistributeYnCell params={params} />,
      },
    ],
    [selectedTenantId],
  );

  const schedColDefs: ColDef<BsrScheduleInfoResponse>[] = useMemo(
    () => [
      {
        headerName: '테넌트',
        field: 'tenantName',
        flex: 1,
        minWidth: 120,
        tooltipField: 'tenantName',
        valueFormatter: ({ value }) => value ?? '-',
        hide: selectedTenantId !== null,
      },
      { field: 'bsrScheduleName', headerName: '스케줄명', flex: 1, tooltipField: 'bsrScheduleName' },
      { field: 'startDate', headerName: '시작일', width: 110 },
      { field: 'startTime', headerName: '시작시간', width: 90 },
      { field: 'finshTime', headerName: '종료시간', width: 90 },
      {
        headerName: '요일',
        width: 160,
        valueGetter: ({ data }) => {
          if (!data) return '';
          const days: string[] = [];
          if (data.mon === 1) days.push('월');
          if (data.tue === 1) days.push('화');
          if (data.wed === 1) days.push('수');
          if (data.thu === 1) days.push('목');
          if (data.fri === 1) days.push('금');
          if (data.sat === 1) days.push('토');
          if (data.sun === 1) days.push('일');
          return days.join(' ') || '-';
        },
        tooltipValueGetter: ({ value }) => (value as string) || '-',
      },
    ],
    [selectedTenantId],
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  const hasDirty = ctiqDirtyMap.size > 0;
  const ctiqEditCtxValue = useMemo<CtiqEditCtx>(() => ({ dirtyMap: ctiqDirtyMap, setDirtyEntry: setCtiqDirtyEntry }), [ctiqDirtyMap, setCtiqDirtyEntry]);
  const ctiqGridContext = useMemo(() => ({ dirtySet: ctiqDirtySet }), [ctiqDirtySet]);

  // pagination: false, sideBar: false — 전 그리드 페이징 금지, "상세정보" 툴패널 제거
  const groupGridOptions = useMemo(() => ({ ...gridOptions, pagination: false, statusBar: undefined, sideBar: false }), [gridOptions]);
  const ctiqGridOptions = useMemo(() => ({ ...gridOptions, pagination: false, statusBar: undefined, sideBar: false }), [gridOptions]);
  const schedGridOptions = useMemo(() => ({ ...gridOptions, pagination: false, statusBar: undefined, sideBar: false }), [gridOptions]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ─ 박스1: 헤더 ─ */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-2">
          <span className="text-sm font-semibold text-gray-700">BSR 그룹 관리</span>
          {selectedGroup && (
            <span className="ml-3 text-xs text-gray-500">
              테넌트:{' '}
              <span className="font-medium text-gray-700">
                {tenantStats.find((t: BsrGroupTenantStat) => t.tenantId === (selectedGroup.tenantId ?? selectedTenantId))?.tenantName ?? '-'}
              </span>
              {' / '}BSR 그룹: <span className="font-medium text-[#405189]">{selectedGroup.bsrGroupName}</span>
            </span>
          )}
        </div>
      </div>

      {/* ─ 박스2: 테넌트 카드 슬라이더 ─ */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        {cardExpanded ? (
          <div className="flex items-center h-[140px] px-4 py-3">
            <div className="relative flex items-center gap-2 w-full">
              <Button
                type="text"
                icon={<ChevronLeft className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <BsrTenantCard tenantId={null} tenantName="전체" bsrGroupCount={totalGroupCount} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.map((t: BsrGroupTenantStat) => (
                  <BsrTenantCard
                    key={t.tenantId}
                    tenantId={t.tenantId}
                    tenantName={t.tenantName ?? '-'}
                    bsrGroupCount={t.bsrGroupCount ?? 0}
                    selected={selectedTenantId === t.tenantId}
                    onClick={(e) => {
                      setSelectedTenantId(t.tenantId);
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                  />
                ))}
              </div>
              <Button
                type="text"
                icon={<ChevronRight className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <Button
                type="text"
                icon={<ChevronsUp className="size-4" />}
                onClick={() => setCardExpanded(false)}
                title="카드 접기"
                className="!flex-shrink-0 !w-8 !h-8 !p-0 !text-gray-400 hover:!text-[#405189]"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center h-[44px] px-4">
            <div className="relative flex items-center gap-2 w-full">
              <div className="flex gap-2 overflow-x-auto flex-1 items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <button
                  type="button"
                  onClick={() => setSelectedTenantId(null)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
                    selectedTenantId === null ? 'border-[#405189] bg-[#405189] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
                  }`}
                >
                  <span className="font-medium">전체</span>
                  <span className={`text-[11px] ${selectedTenantId === null ? 'text-white/80' : 'text-gray-400'}`}>{totalGroupCount.toLocaleString()}</span>
                </button>
                {tenantStats.map((t: BsrGroupTenantStat) => (
                  <button
                    key={t.tenantId}
                    type="button"
                    onClick={() => setSelectedTenantId(t.tenantId)}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
                      selectedTenantId === t.tenantId
                        ? 'border-[#405189] bg-[#405189] text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
                    }`}
                  >
                    <span className="font-medium truncate max-w-[120px]">{t.tenantName ?? '-'}</span>
                    <span className={`text-[11px] ${selectedTenantId === t.tenantId ? 'text-white/80' : 'text-gray-400'}`}>{(t.bsrGroupCount ?? 0).toLocaleString()}</span>
                  </button>
                ))}
              </div>
              <Button
                type="text"
                icon={<ChevronsDown className="size-4" />}
                onClick={() => setCardExpanded(true)}
                title="카드 펼치기"
                className="!flex-shrink-0 !w-8 !h-8 !p-0 !text-gray-400 hover:!text-[#405189]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─ 박스3: 좌우 분할 ─ */}
      <div ref={splitBoxRef} className="flex flex-1 min-h-0 gap-0">
        {/* 좌: BSR 그룹 목록 */}
        <div
          ref={panelLeftRef}
          className="bg-white bt-shadow flex flex-col min-h-0"
          style={leftWidth != null ? { flex: `0 0 ${leftWidth}px`, minWidth: 320 } : { flex: '0 0 42%', minWidth: 320 }}
        >
          <div className="px-4 h-[44px] border-b border-gray-100 flex items-center flex-shrink-0 gap-2">
            <span className="text-sm font-semibold text-gray-700">
              BSR 그룹 목록 (<span>{filteredGroups.length.toLocaleString()}</span>건)
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="그룹명/메소드/설명 검색"
                value={grpSearch}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setGrpSearch(e.target.value)}
                style={{ width: 200 }}
              />
              <Button danger icon={<Trash2 className="size-3.5" />} onClick={handleGroupDelete} disabled={selectedGroupIds.length === 0}>
                삭제
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleGroupCreate}>
                등록
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <AgGridReact<BsrGroupResponse>
              {...groupGridOptions}
              rowData={filteredGroups}
              columnDefs={groupColDefs}
              loading={isGroupsLoading}
              getRowId={(p) => String(p.data.bsrGroupId)}
              rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }}
              onRowDoubleClicked={(e) => e.data && handleGroupDblClick(e.data)}
              onSelectionChanged={handleGroupSelectionChanged}
            />
          </div>
        </div>

        {/* 리사이즈 핸들 */}
        <div className="flex-[0_0_16px] flex items-center justify-center cursor-col-resize group" onMouseDown={handleSplitMouseDown} onDoubleClick={() => setLeftWidth(null)}>
          <div className="w-1 h-12 rounded-sm bg-gray-200 group-hover:bg-[#405189] transition-colors" />
        </div>

        {/* 우: 선택 그룹 상세 탭 */}
        {selectedGroup ? (
          <div className="bg-white bt-shadow flex flex-col flex-1 min-w-[480px] min-h-0">
            {/* 탭바 */}
            <div className="flex items-center h-[40px] border-b border-gray-100 px-4 gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ctiq');
                  setTabMode('manage');
                }}
                className={`h-full inline-flex items-center px-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'ctiq' ? 'text-[#405189] border-[#405189]' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                CTI큐 배정
                <span className="ml-1.5 text-[11px] text-gray-400 font-normal">({filteredCtiq.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('sched');
                  setTabMode('manage');
                }}
                className={`h-full inline-flex items-center px-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'sched' ? 'text-[#405189] border-[#405189]' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                스케줄
                <span className="ml-1.5 text-[11px] text-gray-400 font-normal">({filteredSchedules.length})</span>
              </button>
              <Button type="text" size="small" icon={<X className="size-4" />} onClick={() => setSelectedGroup(null)} className="!ml-auto !text-gray-400 hover:!text-[#405189]" />
            </div>

            {/* ── CTI큐 탭 ── */}
            {activeTab === 'ctiq' && (
              <div className="flex flex-1 min-h-0">
                {/* 업무그룹 트리 패널 — 모드에 따라 데이터 스왑 (PLAN §3-2)
                    관리 모드: filteredTreeGroups (큐 있는 노드만)
                    배정 모드: treeGroups (전체 노드 — 후보 검색 대상 전체 확인)
                    '미배정' 칩은 배정 모드에서 숨김 (scope '미배정만'과 충돌, PLAN §3-2) */}
                <ReadonlyTreePanel
                  groups={tabMode === 'assign' ? treeGroups : filteredTreeGroups}
                  selectedTreeId={selectedTreeId}
                  onSelect={setSelectedTreeId}
                  collapsed={treeCollapsed}
                  onToggleCollapse={() => setTreeCollapsed((v) => !v)}
                  width={treePanelWidth}
                  onResizeMouseDown={handleTreeResizeMouseDown}
                  hideUnassignedChip={tabMode === 'assign'}
                />

                {/* 관리 모드 or CTI큐 배정 모드 — 같은 우측 패널 영역에서 스왑 */}
                <div className="flex flex-col flex-1 min-w-0 min-h-0">
                  {tabMode !== 'assign' ? (
                    /* ── 관리 모드: 배정된 CTI큐 + 인라인 편집 ── */
                    <>
                      <div className="px-4 h-[44px] border-b border-gray-100 flex items-center flex-shrink-0 gap-2">
                        <span className="text-sm font-semibold text-gray-700 truncate">
                          [{selectedGroup.bsrGroupName}] CTI큐 목록 ({filteredCtiq.length.toLocaleString()}건)
                        </span>
                        {hasDirty && (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex-shrink-0">
                            미저장 변경 {ctiqDirtyMap.size}건
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                          <GridRowColorLegend items={['dirty']} />
                          <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
                          <Input
                            allowClear
                            prefix={<Search className="size-3.5 text-gray-400" />}
                            placeholder="CTI큐명/GDN번호 검색"
                            value={ctiqSearch}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setCtiqSearch(e.target.value)}
                            style={{ width: 180 }}
                          />
                          {/* 버튼 순서: primary 배정+ → danger 배정해제 → 저장 */}
                          <Button
                            type="primary"
                            icon={<Plus className="size-3.5" />}
                            disabled={(selectedGroup.tenantId ?? selectedTenantId) == null}
                            onClick={() => {
                              setSelectedCtiqIds([]); // 관리 모드 체크 초기화 (수용기준 1)
                              setSelectedTreeId(null); // 배정 진입 시 treeId 리셋 (결함3)
                              setTabMode('assign');
                            }}
                          >
                            배정
                          </Button>
                          <Button danger icon={<X className="size-3.5" />} onClick={handleCtiqUnassign} disabled={selectedCtiqIds.length === 0} loading={isUnassigning}>
                            배정 해제
                          </Button>
                          <Button icon={<Save className="size-3.5" />} onClick={handleCtiqSave} loading={isSavingCtiq}>
                            저장
                          </Button>
                        </div>
                      </div>
                      <style>{`
                        .bsr-ctiq-dirty-row { background-color: ${ROW_COLOR_PALETTE.dirty} !important; }
                        .bsr-ctiq-dirty-row:hover { background-color: ${ROW_COLOR_PALETTE.dirtyHover} !important; }
                      `}</style>
                      <div className="flex-1 min-h-0">
                        <CtiqEditContext.Provider value={ctiqEditCtxValue}>
                          <AgGridReact<BsrCtiqMappingResponse>
                            ref={ctiqGridRef}
                            {...ctiqGridOptions}
                            rowData={filteredCtiq}
                            columnDefs={ctiqColDefs}
                            loading={isCtiqLoading}
                            getRowId={(p) => String(p.data.ctiqId)}
                            rowClassRules={CTIQ_ROW_CLASS_RULES}
                            context={ctiqGridContext}
                            rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }}
                            onSelectionChanged={(e) => setSelectedCtiqIds(e.api.getSelectedRows().map((r) => r.ctiqId))}
                          />
                        </CtiqEditContext.Provider>
                      </div>
                    </>
                  ) : (
                    /* ── 배정 모드: BsrCtiqAssignPanel ── */
                    <BsrCtiqAssignPanel
                      targetBsrGroupId={selectedGroup.bsrGroupId}
                      targetBsrGroupName={selectedGroup.bsrGroupName ?? ''}
                      tenantId={(selectedGroup.tenantId ?? selectedTenantId) as number}
                      selectedTreeId={selectedTreeId}
                      onSearch={(params) =>
                        searchCtiq({
                          tenantId: params.tenantId,
                          keyword: params.keyword,
                          treeIds: params.treeIds,
                          scope: params.scope,
                          limit: params.limit,
                        })
                      }
                      searchResult={searchResult}
                      isSearching={isSearching}
                      onAssign={handleCtiqAssign}
                      isAssigning={isAssigningCtiq}
                      onDone={handleAssignDone}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── 스케줄 탭 ── */}
            {activeTab === 'sched' && (
              <div className="flex flex-col flex-1 min-h-0">
                {tabMode === 'scheduleAssign' ? (
                  /* ── 스케줄 배정 모드 ── */
                  <BsrScheduleAssignPanel
                    targetBsrGroupId={selectedGroup.bsrGroupId}
                    targetBsrGroupName={selectedGroup.bsrGroupName ?? ''}
                    schedulePool={schedulePool}
                    isPoolLoading={isPoolLoading}
                    onAssignExisting={(ids) => assignSchedules({ bsrGroupId: selectedGroup.bsrGroupId, scheduleIds: ids })}
                    isAssigning={isAssigningSchedule}
                    onCreateAndAssign={(req) => createSchedule(req)}
                    isCreating={isCreatingSchedule}
                    onDone={handleScheduleAssignDone}
                    tenantId={(selectedGroup.tenantId ?? selectedTenantId) as number}
                  />
                ) : (
                  /* ── 스케줄 관리 모드 ── */
                  <>
                    <div className="px-4 h-[44px] border-b border-gray-100 flex items-center flex-shrink-0 gap-2">
                      <span className="text-sm font-semibold text-gray-700">
                        [{selectedGroup.bsrGroupName}] 배정 스케줄 ({filteredSchedules.length.toLocaleString()}건)
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <Input
                          allowClear
                          prefix={<Search className="size-3.5 text-gray-400" />}
                          placeholder="스케줄명 검색"
                          value={schedSearch}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setSchedSearch(e.target.value)}
                          style={{ width: 160 }}
                        />
                        <Button
                          type="primary"
                          icon={<Plus className="size-3.5" />}
                          disabled={(selectedGroup.tenantId ?? selectedTenantId) == null}
                          onClick={() => {
                            setSelectedScheduleIds([]); // 관리 모드 체크 초기화
                            setTabMode('scheduleAssign'); // 스케줄 배정 모드 진입
                          }}
                        >
                          배정
                        </Button>
                        <Button danger icon={<X className="size-3.5" />} onClick={handleSchedUnassign} disabled={selectedScheduleIds.length === 0}>
                          배정 해제
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0">
                      <AgGridReact<BsrScheduleInfoResponse>
                        {...schedGridOptions}
                        rowData={filteredSchedules}
                        columnDefs={schedColDefs}
                        loading={isSchedulesLoading}
                        rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }}
                        onSelectionChanged={(e) => setSelectedScheduleIds(e.api.getSelectedRows().map((r) => r.bsrScheduleId))}
                        overlayNoRowsTemplate="<span class='text-gray-400 text-sm'>검색된 데이터가 없습니다.</span>"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white bt-shadow flex flex-col flex-1 min-w-[480px] min-h-0">
            {/* 탭바 (빈 상태) */}
            <div className="flex items-center h-[40px] border-b border-gray-100 px-4 gap-1 flex-shrink-0">
              <button type="button" className="h-full inline-flex items-center px-3 text-sm font-semibold border-b-2 text-[#405189] border-[#405189]">
                CTI큐 배정
              </button>
              <button type="button" className="h-full inline-flex items-center px-3 text-sm font-semibold border-b-2 text-gray-500 border-transparent">
                스케줄
              </button>
            </div>
            {/* 빈 그리드 */}
            <div className="flex-1 min-h-0">
              <AgGridReact<BsrCtiqMappingResponse>
                {...ctiqGridOptions}
                rowData={[]}
                columnDefs={ctiqColDefs}
                loading={false}
                overlayNoRowsTemplate="<span class='text-gray-400 text-sm'>좌측 그룹을 선택하면 CTI큐 목록이 표시됩니다.</span>"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─ BSR 그룹 Drawer ─ */}
      <BsrGroupFormDrawer
        open={groupDrawerOpen}
        mode={groupDrawerMode}
        group={groupDrawerData}
        defaultTenantId={selectedTenantId}
        onCancel={() => setGroupDrawerOpen(false)}
        onSubmit={handleGroupDrawerSubmit}
        loading={isCreating || isUpdating}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
//  내부 유틸 — 빈 노드 숨김 (메인 트리 패널 전용)
// ──────────────────────────────────────────────────────────

/**
 * ctiqCount(직속 큐 수)가 자신 + 모든 하위 합산 0인 노드를 재귀적으로 제거.
 * 배정 모달에는 적용하지 않음 (전체 노드 유지).
 *
 * @returns 큐가 1개 이상 속한 노드만 남긴 새 트리 (원본 불변)
 */
function filterTreeWithQueues(nodes: CtiQueueGroupResponse[]): CtiQueueGroupResponse[] {
  const result: CtiQueueGroupResponse[] = [];
  for (const n of nodes) {
    const filteredChildren = filterTreeWithQueues(n.children ?? []);
    const selfCount = n.ctiqCount ?? 0;
    const descendantCount = sumCtiqCount(filteredChildren);
    if (selfCount + descendantCount > 0) {
      result.push({ ...n, children: filteredChildren });
    }
  }
  return result;
}

/** 노드 배열의 모든 직속 ctiqCount 합산 (재귀). */
function sumCtiqCount(nodes: CtiQueueGroupResponse[]): number {
  let total = 0;
  for (const n of nodes) {
    total += n.ctiqCount ?? 0;
    total += sumCtiqCount(n.children ?? []);
  }
  return total;
}

// ──────────────────────────────────────────────────────────
//  내부 유틸 — treeId 기반 ctiq 필터
// ──────────────────────────────────────────────────────────

function findNodeByDescendants(_nodes: CtiQueueGroupResponse[], _ids: number[]): null {
  return null;
}

/**
 * ctiq 의 treeName 이 treeIds 에 해당하는 노드(또는 그 하위)와 일치하는지 확인.
 * treeId 직접 없이 treeName 으로 매칭 (BE 응답 구조 기반).
 */
function treeNodeMatchesCtiq(all: CtiQueueGroupResponse[], ctiq: BsrCtiqMappingResponse, treeIds: number[]): boolean {
  // treeIds 에 속하는 노드명 수집
  const matchNames = new Set<string>();
  function collect(nodes: CtiQueueGroupResponse[]) {
    for (const n of nodes) {
      if (treeIds.includes(n.treeId)) matchNames.add(n.treeName);
      collect(n.children ?? []);
    }
  }
  collect(all);
  return matchNames.has(ctiq.treeName ?? '');
}
