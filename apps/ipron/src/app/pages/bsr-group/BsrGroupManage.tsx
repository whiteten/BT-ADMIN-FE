/**
 * BSR 그룹 관리 — 통합 페이지 (bsr-group-v3 목업 1:1 구현).
 *
 * 레이아웃:
 *  박스1: 헤더 (56px — 타이틀, 선택 테넌트·그룹 표시)
 *  박스2: 테넌트 카드 슬라이더 (기본 접힘)
 *  박스3: 좌 패널(리사이즈) ‖ 핸들 ‖ 우 패널
 *    좌: BSR 그룹 ag-Grid (체크박스+[삭제][등록], 행 더블클릭=수정 드로어)
 *    우: 탭 [CTI큐 배정 | 스케줄]
 *      CTI큐 탭: 업무그룹 트리 패널(240px, 읽기 전용) + CTI큐 그리드(인라인 편집, 체크박스)
 *                액션바 [배정 해제(danger)][저장][배정(primary)]
 *      스케줄 탭: 스케줄 그리드 + [배정 해제][배정]
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CellValueChangedEvent, ColDef, GridReadyEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input } from 'antd';
import { Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import BsrCtiqAssignModal from '../../features/bsr-ctiq-mapping/components/BsrCtiqAssignModal';
import {
  useAssignBsrCtiq,
  useGetBsrCtiqMappings,
  useSearchBsrCtiq,
  useUnassignBsrCtiq,
  useUpdateBsrCtiqMappings,
} from '../../features/bsr-ctiq-mapping/hooks/useBsrCtiqMappingQueries';
import type { BsrCtiqMappingResponse, BsrCtiqMappingUpdateItem } from '../../features/bsr-ctiq-mapping/types';
import BsrGroupFormDrawer from '../../features/bsr-group/components/BsrGroupFormDrawer';
import BsrScheduleAssignModal from '../../features/bsr-group/components/BsrScheduleAssignModal';
import {
  useAssignBsrSchedules,
  useCreateBsrGroup,
  useCreateBsrSchedule,
  useDeleteBsrGroup,
  useGetBsrGroupSchedules,
  useGetBsrGroupTenants,
  useGetBsrGroups,
  useGetBsrSchedulePool,
  useUnassignBsrSchedule,
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

const breadcrumb = [{ title: '번호자원관리' }, { title: '그룹DN' }, { title: 'BSR 그룹 관리', path: '/ipron/bsr-group-manage' }];

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
}

function ReadonlyTreePanel({ groups, selectedTreeId, onSelect, collapsed, onToggleCollapse }: ReadonlyTreePanelProps) {
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
      <div className="relative w-9 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col items-center pt-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="패널 펼치기"
          className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[9px] text-gray-400 hover:border-[#405189] hover:text-[#405189] shadow-sm z-10"
        >
          ▶
        </button>
        <span className="text-[11px] text-gray-400 mt-2" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
          업무그룹
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-[240px] flex-shrink-0 border-r border-gray-100 bg-white flex flex-col min-h-0">
      {/* 접기 버튼 */}
      <button
        type="button"
        onClick={onToggleCollapse}
        title="패널 접기"
        className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[9px] text-gray-400 hover:border-[#405189] hover:text-[#405189] shadow-sm z-10"
      >
        ◀
      </button>

      {/* 검색 */}
      <div className="px-2.5 py-2 border-b border-gray-100">
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
        <button
          type="button"
          onClick={() => onSelect(0)}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition ${
            selectedTreeId === 0 ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-200 bg-white text-amber-600 hover:border-amber-400'
          }`}
        >
          미배정
        </button>
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
        {items.length === 0 ? <div className="px-3 py-6 text-center text-[11px] text-gray-400">등록된 업무그룹이 없습니다</div> : <div {...rootProps}>{items.map(renderRow)}</div>}
      </div>
    </div>
  );
}

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

  // 좌 패널 폭 (px, 기본 42%)
  const splitBoxRef = useRef<HTMLDivElement>(null);
  const panelLeftRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState<number | null>(null);

  // CTI큐 탭
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null); // null=전체, 0=미배정
  const [ctiqSearch, setCtiqSearch] = useState('');
  const [pendingItems, setPendingItems] = useState<BsrCtiqMappingUpdateItem[]>([]);
  const [selectedCtiqIds, setSelectedCtiqIds] = useState<number[]>([]);
  const [ctiqAssignOpen, setCtiqAssignOpen] = useState(false);

  // 스케줄 탭
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<number[]>([]);
  const [schedAssignOpen, setSchedAssignOpen] = useState(false);

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
    queryOptions: { enabled: !!selectedGroup && !!tenantIdForCtiq && schedAssignOpen },
  });

  // 업무그룹 트리 데이터
  const { data: treeGroups = [] } = useGetCtiQueueGroups({
    params: selectedGroup?.tenantId != null ? { tenantId: selectedGroup.tenantId } : undefined,
    queryOptions: { enabled: !!selectedGroup?.tenantId },
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
  const { mutate: deleteGroup } = useDeleteBsrGroup({
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
        setPendingItems([]);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '저장 실패')),
    },
  });

  const { mutate: assignCtiq, isPending: isAssigningCtiq } = useAssignBsrCtiq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('배정되었습니다');
        setCtiqAssignOpen(false);
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
        setSchedAssignOpen(false);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '스케줄 배정 실패')),
    },
  });

  const { mutate: unassignSchedule } = useUnassignBsrSchedule({
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
          assignSchedules({ bsrGroupId: selectedGroup.bsrGroupId, scheduleIds: [newSched.bsrScheduleId] });
        }
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '스케줄 생성 실패')),
    },
  });

  // ─── Derived ────────────────────────────────────────────────────────────────
  const totalGroupCount = useMemo(() => tenantStats.reduce((s: number, t: BsrGroupTenantStat) => s + (t.bsrGroupCount ?? 0), 0), [tenantStats]);

  const filteredGroups = useMemo(() => {
    const kw = grpSearch.trim().toLowerCase();
    if (!kw) return groups;
    return groups.filter((g) => [g.bsrGroupName, g.bsrMethod, g.bsrGroupDesc].some((f) => f && String(f).toLowerCase().includes(kw)));
  }, [groups, grpSearch]);

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

  // ─── 리사이즈 핸들 ─────────────────────────────────────────────────────────
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

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !splitBoxRef.current) return;
      const total = splitBoxRef.current.getBoundingClientRect().width;
      let w = dragStartW.current + (e.clientX - dragStartX.current);
      if (w < 320) w = 320;
      if (w > total - 480 - 16) w = total - 480 - 16;
      setLeftWidth(w);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleGroupSelect = useCallback((row: BsrGroupResponse) => {
    setSelectedGroup(row);
    setSelectedCtiqIds([]);
    setSelectedScheduleIds([]);
    setPendingItems([]);
    setSelectedTreeId(null);
    setActiveTab('ctiq');
  }, []);

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
      onOk: () => selectedGroupIds.forEach((id) => deleteGroup(id)),
      options: { title: 'BSR 그룹 삭제', content: `선택한 ${selectedGroupIds.length}건을 삭제하시겠습니까?` },
    });
  }, [selectedGroupIds, modal, deleteGroup]);

  const handleGroupDrawerSubmit = useCallback(
    (req: BsrGroupCreateRequest | BsrGroupUpdateRequest) => {
      if (groupDrawerMode === 'create') createGroup({ ...req, tenantId: selectedTenantId as number });
      else if (groupDrawerData) updateGroup({ id: groupDrawerData.bsrGroupId, body: req as BsrGroupUpdateRequest });
    },
    [groupDrawerMode, groupDrawerData, createGroup, updateGroup, selectedTenantId],
  );

  // CTI큐 인라인 편집
  const handleCtiqCellChanged = useCallback((e: CellValueChangedEvent<BsrCtiqMappingResponse>) => {
    if (!e.data) return;
    const ctiqId = e.data.ctiqId;
    const field = e.colDef.field as keyof BsrCtiqMappingResponse;
    const value = e.newValue;
    setPendingItems((prev) => {
      const existing = prev.find((p) => p.ctiqId === ctiqId);
      if (existing) return prev.map((p) => (p.ctiqId === ctiqId ? { ...p, [field]: value } : p));
      return [...prev, { ctiqId, [field]: value }];
    });
  }, []);

  const handleCtiqSave = useCallback(() => {
    if (!selectedGroup) return;
    if (pendingItems.length === 0) {
      toast.info('변경할 데이터가 존재하지 않습니다');
      return;
    }
    updateCtiq({ bsrGroupId: selectedGroup.bsrGroupId, body: { items: pendingItems } });
  }, [selectedGroup, pendingItems, updateCtiq]);

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

  const handleSchedUnassign = useCallback(() => {
    if (selectedScheduleIds.length === 0 || !selectedGroup) return;
    modal.confirm.execute({
      onOk: () => selectedScheduleIds.forEach((sid) => unassignSchedule({ bsrGroupId: selectedGroup.bsrGroupId, scheduleId: sid })),
      options: { title: '스케줄 배정 해제', content: `선택한 ${selectedScheduleIds.length}건의 스케줄 배정을 해제하시겠습니까?` },
    });
  }, [selectedScheduleIds, selectedGroup, modal, unassignSchedule]);

  // ─── Column Defs ────────────────────────────────────────────────────────────
  const groupColDefs: ColDef<BsrGroupResponse>[] = useMemo(
    () => [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 44,
        pinned: 'left' as const,
        suppressHeaderMenuButton: true,
        headerCheckboxSelectionFilteredOnly: true,
      },
      { field: 'bsrGroupName', headerName: 'BSR 그룹명', flex: 1 },
      { field: 'bsrMethod', headerName: 'BSR 메소드', width: 180, valueFormatter: ({ value }) => getBsrMethodLabel(value as string | null) },
      { field: 'activateYn', headerName: '활성화', width: 80, valueFormatter: ({ value }) => (value === 1 ? '활성' : '비활성') },
      { field: 'sortSeq', headerName: '정렬', width: 60 },
      { field: 'bsrGroupDesc', headerName: '설명', flex: 1 },
    ],
    [],
  );

  const ctiqColDefs: ColDef<BsrCtiqMappingResponse>[] = useMemo(
    () => [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 44,
        pinned: 'left' as const,
        suppressHeaderMenuButton: true,
        headerCheckboxSelectionFilteredOnly: true,
      },
      { field: 'ctiqName', headerName: 'CTI큐명', flex: 1 },
      { field: 'gdnNo', headerName: '그룹DN 번호', width: 110 },
      { field: 'gdnName', headerName: '그룹DN 명', width: 130 },
      { field: 'treeName', headerName: '업무그룹명', width: 120, valueFormatter: ({ value }) => value ?? '미배정' },
      {
        field: 'bsrWeight',
        headerName: 'BSR 가중치',
        width: 100,
        editable: true,
        cellStyle: { background: '#d1fdfd', cursor: 'text' },
        valueParser: ({ newValue }) => Number(newValue),
      },
      {
        field: 'bsrYn',
        headerName: 'BSR 사용여부',
        width: 110,
        editable: true,
        cellStyle: { background: '#d1fdfd', cursor: 'pointer' },
        valueFormatter: ({ value }) => (value === 1 ? '설정' : '해제'),
        valueParser: ({ newValue }) => (newValue === '설정' || Number(newValue) === 1 ? 1 : 0),
      },
      {
        field: 'bsrDistributeYn',
        headerName: 'BSR 분배여부',
        width: 110,
        editable: true,
        cellStyle: { background: '#d1fdfd', cursor: 'pointer' },
        valueFormatter: ({ value }) => (value === 1 ? '설정' : '해제'),
        valueParser: ({ newValue }) => (newValue === '설정' || Number(newValue) === 1 ? 1 : 0),
      },
    ],
    [],
  );

  const schedColDefs: ColDef<BsrScheduleInfoResponse>[] = useMemo(
    () => [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 44,
        pinned: 'left' as const,
        suppressHeaderMenuButton: true,
        headerCheckboxSelectionFilteredOnly: true,
      },
      { field: 'bsrScheduleName', headerName: '스케줄명', flex: 1 },
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
          return days.join(' ');
        },
      },
    ],
    [],
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  const hasPending = pendingItems.length > 0;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ─ 박스1: 헤더 ─ */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-2">
          <span className="text-xs text-gray-400 mr-2">번호자원관리 › 그룹DN ›</span>
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
            {selectedGroupIds.length > 0 && <span className="text-xs text-gray-500">{selectedGroupIds.length}건 선택</span>}
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
              {...gridOptions}
              rowData={filteredGroups}
              columnDefs={groupColDefs}
              loading={isGroupsLoading}
              rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false }}
              suppressRowClickSelection
              onRowClicked={(e) => e.data && handleGroupSelect(e.data)}
              onRowDoubleClicked={(e) => e.data && handleGroupDblClick(e.data)}
              onSelectionChanged={(e) => setSelectedGroupIds(e.api.getSelectedRows().map((r) => r.bsrGroupId))}
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
                onClick={() => setActiveTab('ctiq')}
                className={`h-full inline-flex items-center px-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'ctiq' ? 'text-[#405189] border-[#405189]' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                CTI큐 배정
                <span className="ml-1.5 text-[11px] text-gray-400 font-normal">({filteredCtiq.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sched')}
                className={`h-full inline-flex items-center px-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'sched' ? 'text-[#405189] border-[#405189]' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                스케줄
                <span className="ml-1.5 text-[11px] text-gray-400 font-normal">({schedules.length})</span>
              </button>
              <span className="ml-auto text-[11px] text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
                선택 그룹: <span className="text-[#405189] font-medium">{selectedGroup.bsrGroupName}</span>
              </span>
              <Button type="text" size="small" icon={<X className="size-4" />} onClick={() => setSelectedGroup(null)} className="!ml-1 !text-gray-400 hover:!text-[#405189]" />
            </div>

            {/* ── CTI큐 탭 ── */}
            {activeTab === 'ctiq' && (
              <div className="flex flex-1 min-h-0">
                {/* 업무그룹 트리 패널 (읽기 전용) */}
                <ReadonlyTreePanel
                  groups={treeGroups}
                  selectedTreeId={selectedTreeId}
                  onSelect={setSelectedTreeId}
                  collapsed={treeCollapsed}
                  onToggleCollapse={() => setTreeCollapsed((v) => !v)}
                />

                {/* CTI큐 그리드 영역 */}
                <div className="flex flex-col flex-1 min-w-0 min-h-0">
                  <div className="px-4 h-[44px] border-b border-gray-100 flex items-center flex-shrink-0 gap-2">
                    <span className="text-sm font-semibold text-gray-700 truncate">
                      [{selectedGroup.bsrGroupName}] CTI큐 목록 ({filteredCtiq.length.toLocaleString()}건)
                    </span>
                    {selectedCtiqIds.length > 0 && <span className="text-xs text-gray-500 flex-shrink-0">{selectedCtiqIds.length}건 선택</span>}
                    {hasPending && <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex-shrink-0">미저장 변경 있음</span>}
                    <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                      <Input
                        allowClear
                        prefix={<Search className="size-3.5 text-gray-400" />}
                        placeholder="CTI큐명/GDN번호 검색"
                        value={ctiqSearch}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setCtiqSearch(e.target.value)}
                        style={{ width: 180 }}
                      />
                      {/* 버튼 순서: danger → 보조 → primary */}
                      <Button danger icon={<X className="size-3.5" />} onClick={handleCtiqUnassign} disabled={selectedCtiqIds.length === 0} loading={isUnassigning}>
                        배정 해제
                      </Button>
                      <Button icon={<Save className="size-3.5" />} onClick={handleCtiqSave} loading={isSavingCtiq}>
                        저장
                      </Button>
                      <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => setCtiqAssignOpen(true)}>
                        배정
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <AgGridReact<BsrCtiqMappingResponse>
                      {...gridOptions}
                      rowData={filteredCtiq}
                      columnDefs={ctiqColDefs}
                      loading={isCtiqLoading}
                      rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false }}
                      suppressRowClickSelection
                      onSelectionChanged={(e) => setSelectedCtiqIds(e.api.getSelectedRows().map((r) => r.ctiqId))}
                      onCellValueChanged={handleCtiqCellChanged}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── 스케줄 탭 ── */}
            {activeTab === 'sched' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-4 h-[44px] border-b border-gray-100 flex items-center flex-shrink-0 gap-2">
                  <span className="text-sm font-semibold text-gray-700">
                    [{selectedGroup.bsrGroupName}] 배정 스케줄 ({schedules.length.toLocaleString()}건)
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button danger icon={<X className="size-3.5" />} onClick={handleSchedUnassign} disabled={selectedScheduleIds.length === 0}>
                      배정 해제
                    </Button>
                    <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => setSchedAssignOpen(true)}>
                      배정
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <AgGridReact<BsrScheduleInfoResponse>
                    {...gridOptions}
                    rowData={schedules}
                    columnDefs={schedColDefs}
                    loading={isSchedulesLoading}
                    rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false }}
                    suppressRowClickSelection
                    onSelectionChanged={(e) => setSelectedScheduleIds(e.api.getSelectedRows().map((r) => r.bsrScheduleId))}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white bt-shadow flex flex-col flex-1 min-w-[480px] min-h-0 items-center justify-center text-gray-400 text-sm">
            <span className="text-3xl mb-2 opacity-25">←</span>
            좌측 그룹을 선택하면 상세가 표시됩니다.
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

      {/* ─ CTI큐 배정 모달 ─ */}
      {selectedGroup && ctiqAssignOpen && (
        <BsrCtiqAssignModal
          open={ctiqAssignOpen}
          targetBsrGroupId={selectedGroup.bsrGroupId}
          targetBsrGroupName={selectedGroup.bsrGroupName ?? ''}
          tenantId={selectedGroup.tenantId ?? (selectedTenantId as number)}
          prefillTreeId={selectedTreeId}
          treeGroups={treeGroups}
          onClose={() => setCtiqAssignOpen(false)}
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
        />
      )}

      {/* ─ 스케줄 배정 모달 ─ */}
      {selectedGroup && (
        <BsrScheduleAssignModal
          open={schedAssignOpen}
          schedulePool={schedulePool}
          isPoolLoading={isPoolLoading}
          tenantId={selectedGroup.tenantId ?? selectedTenantId}
          onClose={() => setSchedAssignOpen(false)}
          onAssignExisting={(ids) => assignSchedules({ bsrGroupId: selectedGroup.bsrGroupId, scheduleIds: ids })}
          isAssigning={isAssigningSchedule}
          onCreateAndAssign={(req) => createSchedule(req)}
          isCreating={isCreatingSchedule}
        />
      )}
    </div>
  );
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
