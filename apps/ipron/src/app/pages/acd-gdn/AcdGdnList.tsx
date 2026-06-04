/**
 * ACD 그룹DN 관리 페이지 (SWAT IPR20S3010 + IPR20S3030, GDN_TYPE=16).
 * 목업: C:\bt-admin-ipron-work\ipron-acd-gdn\mockups\acd-v2.html (v2 — 1:1 정합).
 *
 * 레이아웃 (IPRON 표준):
 *  박스1: 노드 탭바 (viewMode 전환 + 노드 탭 + 그리드 검색 + ACD타입 필터)
 *  박스2: 테넌트 카드 슬라이더 (DnList 정식 패턴, 노드별 테넌트 카드)
 *  메인 2-패널:
 *    좌(45%) ACD 그룹DN 목록 (단일선택 → 우 패널 갱신) + 등록/삭제
 *    리사이즈 핸들
 *    우(flex) 멤버 EDN/ADN 통합 풀 (multi-select) + 배정상태/DN타입 세그먼트 + 검색
 *  하단 floating bulk-bar: 선택 N건 → [배정] [해제]
 *  Drawer: 그룹DN 등록/수정
 *
 * viewMode:
 *  - byNode: 탭=노드 / 카드=테넌트 (기본)
 *  - byTenant: 탭=테넌트 / 카드=노드
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { ColDef, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input, Select } from 'antd';
import { ArrowUpDown, Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Network, Plus, Search, Settings, Trash2, Users, X } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AcdGdnFormDrawer from '../../features/acd-gdn/components/AcdGdnFormDrawer';
import AcdGdnMemberGrid from '../../features/acd-gdn/components/AcdGdnMemberGrid';
import AcdGdnTenantCard from '../../features/acd-gdn/components/AcdGdnTenantCard';
import { useDeleteAcdGdns, useGetAcdGdnMembersPool, useGetAcdGdns, useSaveAcdGdnMembers } from '../../features/acd-gdn/hooks/useAcdGdnQueries';
import { ACD_TYPE_OPTIONS, type GdnMemberPoolParams, type GdnMemberResponse, type GdnResponse, getAcdTypeName } from '../../features/acd-gdn/types';
import { useGetDnProfileNodeTenants, useGetDnProfileNodes, useGetDnProfileTenants } from '../../features/dn-profile/hooks/useDnProfileQueries';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '번호자원관리', path: '/ipron/acd-gdn' },
  { title: '그룹DN', path: '/ipron/acd-gdn' },
  { title: 'ACD', path: '/ipron/acd-gdn' },
];

type AssignFilter = 'all' | 'assigned' | 'unassigned';
type DnTypeFilter = '' | '11' | '12';

export default function AcdGdnList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // ─── State ────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'byNode' | 'byTenant'>('byNode');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [cardExpanded, setCardExpanded] = useState(true);

  // 좌 그리드 검색/필터
  const [gdnSearch, setGdnSearch] = useState('');
  const [acdTypeFilter, setAcdTypeFilter] = useState<string>('');
  const [selectedGdn, setSelectedGdn] = useState<GdnResponse | null>(null);

  // 우 멤버 패널 필터
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('all');
  const [dnTypeFilter, setDnTypeFilter] = useState<DnTypeFilter>('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberQuickFilter, setMemberQuickFilter] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<GdnMemberResponse[]>([]);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [drawerDetail, setDrawerDetail] = useState<GdnResponse | null>(null);

  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const memberDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitNodeRef = useRef(false);
  const hasInitTenantRef = useRef(false);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetDnProfileNodes();
  const { data: tenants = [] } = useGetDnProfileTenants();
  const { data: nodeTenants = [] } = useGetDnProfileNodeTenants();
  const { data: gdns = [], isLoading: isGdnsLoading } = useGetAcdGdns();

  // 멤버 풀 — 선택 그룹DN 기준. 필터는 서버 위임(assignFilter/dnType), keyword 는 클라이언트 quickFilter.
  const memberPoolParams = useMemo<GdnMemberPoolParams>(() => ({ assignFilter, dnType: dnTypeFilter }), [assignFilter, dnTypeFilter]);
  const { data: memberPool = [], isLoading: isMembersLoading } = useGetAcdGdnMembersPool(selectedGdn?.gdnId ?? null, memberPoolParams);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteGdns, isPending: isDeleting } = useDeleteAcdGdns({
    mutationOptions: {
      onSuccess: () => {
        toast.success('선택한 그룹DN 이 삭제되었습니다.');
        setSelectedGdn(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: saveMembers, isPending: isSavingMembers } = useSaveAcdGdnMembers({
    mutationOptions: {
      onSuccess: () => {
        setSelectedMembers([]);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '저장 실패';
        toast.error(msg);
      },
    },
  });

  // ─── Derived: 노드/테넌트 매핑 (DnList 패턴) ──────────────────────────────
  const assignedNodes = useMemo(() => {
    const nodeIds = new Set(nodeTenants.map((nt) => nt.nodeId));
    return nodes.filter((n) => nodeIds.has(n.nodeId));
  }, [nodes, nodeTenants]);

  const assignedTenants = useMemo(() => {
    const map = new Map<number, { tenantId: number; tenantName: string }>();
    for (const nt of nodeTenants) {
      if (!map.has(nt.tenantId)) map.set(nt.tenantId, { tenantId: nt.tenantId, tenantName: nt.tenantName });
    }
    return Array.from(map.values()).sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [nodeTenants]);

  const tabItems = useMemo(
    () => (viewMode === 'byNode' ? assignedNodes.map((n) => ({ id: n.nodeId, name: n.nodeName })) : assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))),
    [viewMode, assignedNodes, assignedTenants],
  );

  // 카드 통계 (선택 탭 범위에서 (노드,테넌트) 조합 집계)
  const cardStats = useMemo(() => {
    const map = new Map<number, { id: number; name: string; totalCnt: number; acdActiveCnt: number; blockedCnt: number; huntingCnt: number }>();

    // 시드: 현재 탭에 매핑된 테넌트/노드를 0건으로 먼저 넣음
    if (viewMode === 'byNode' && selectedNodeId) {
      for (const nt of nodeTenants) {
        if (nt.nodeId !== selectedNodeId) continue;
        map.set(nt.tenantId, { id: nt.tenantId, name: nt.tenantName ?? '-', totalCnt: 0, acdActiveCnt: 0, blockedCnt: 0, huntingCnt: 0 });
      }
    } else if (viewMode === 'byTenant' && selectedTenantId) {
      for (const nt of nodeTenants) {
        if (nt.tenantId !== selectedTenantId) continue;
        if (!map.has(nt.nodeId)) {
          const nodeName = nodes.find((n) => n.nodeId === nt.nodeId)?.nodeName ?? '-';
          map.set(nt.nodeId, { id: nt.nodeId, name: nodeName, totalCnt: 0, acdActiveCnt: 0, blockedCnt: 0, huntingCnt: 0 });
        }
      }
    }

    // GDN 순회 카운트 (선택 탭 범위만)
    for (const g of gdns) {
      if (viewMode === 'byNode') {
        if (selectedNodeId && g.nodeId !== selectedNodeId) continue;
      } else {
        if (selectedTenantId && g.tenantId !== selectedTenantId) continue;
      }
      const key = viewMode === 'byNode' ? g.tenantId : g.nodeId;
      if (key == null) continue;
      const name = (viewMode === 'byNode' ? g.tenantName : nodes.find((n) => n.nodeId === g.nodeId)?.nodeName) ?? '-';
      if (!map.has(key)) map.set(key, { id: key, name, totalCnt: 0, acdActiveCnt: 0, blockedCnt: 0, huntingCnt: 0 });
      const s = map.get(key)!;
      s.totalCnt += 1;
      if (g.acdYn === 1) s.acdActiveCnt += 1;
      if (g.blockYn === 1) s.blockedCnt += 1;
      if (g.huntingYn === 1) s.huntingCnt += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [gdns, viewMode, nodeTenants, selectedNodeId, selectedTenantId, nodes]);

  const selectedCardId = viewMode === 'byNode' ? selectedTenantId : selectedNodeId;
  const setSelectedCardId = useCallback(
    (id: number | null) => {
      if (viewMode === 'byNode') setSelectedTenantId(id);
      else setSelectedNodeId(id);
    },
    [viewMode],
  );

  // 좌 그리드 표시용 GDN — 탭 + 카드 + ACD타입 + 검색 필터
  const gdnsForGrid = useMemo(() => {
    let rows = gdns;
    if (viewMode === 'byNode') {
      if (selectedNodeId) rows = rows.filter((g) => g.nodeId === selectedNodeId);
      if (selectedCardId != null) rows = rows.filter((g) => g.tenantId === selectedCardId);
    } else {
      if (selectedTenantId) rows = rows.filter((g) => g.tenantId === selectedTenantId);
      if (selectedCardId != null) rows = rows.filter((g) => g.nodeId === selectedCardId);
    }
    if (acdTypeFilter) rows = rows.filter((g) => String(g.acdType) === acdTypeFilter);
    const kw = gdnSearch.trim().toLowerCase();
    if (kw) rows = rows.filter((g) => g.gdnNo.toLowerCase().includes(kw) || (g.gdnName ?? '').toLowerCase().includes(kw));
    return rows;
  }, [gdns, viewMode, selectedNodeId, selectedTenantId, selectedCardId, acdTypeFilter, gdnSearch]);

  // ─── Auto-select ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (viewMode === 'byNode') {
      if (assignedNodes.length > 0 && !hasInitNodeRef.current && selectedNodeId == null) {
        hasInitNodeRef.current = true;
        setSelectedNodeId(assignedNodes[0].nodeId);
      } else if (selectedNodeId != null) {
        hasInitNodeRef.current = true;
      }
    } else {
      if (assignedTenants.length > 0 && !hasInitTenantRef.current && selectedTenantId == null) {
        hasInitTenantRef.current = true;
        setSelectedTenantId(assignedTenants[0].tenantId);
      } else if (selectedTenantId != null) {
        hasInitTenantRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, assignedNodes, assignedTenants]);

  // 선택 카드가 현재 cardStats 에 없으면 해제
  useEffect(() => {
    if (selectedCardId === null) return;
    if (cardStats.length === 0) return;
    if (!cardStats.some((g) => g.id === selectedCardId)) setSelectedCardId(null);
  }, [cardStats, selectedCardId, setSelectedCardId]);

  // 선택 그룹DN 이 현재 그리드에서 사라지면 우 패널 닫기
  useEffect(() => {
    if (selectedGdn && !gdnsForGrid.some((g) => g.gdnId === selectedGdn.gdnId)) {
      setSelectedGdn(null);
      setSelectedMembers([]);
    }
  }, [gdnsForGrid, selectedGdn]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleTabSelect = useCallback(
    (id: number | null) => {
      if (viewMode === 'byNode') {
        setSelectedNodeId(id);
        setSelectedTenantId(null);
      } else {
        setSelectedTenantId(id);
        setSelectedNodeId(null);
      }
      setGdnSearch('');
      setSelectedGdn(null);
      setSelectedMembers([]);
    },
    [viewMode],
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'byNode' ? 'byTenant' : 'byNode'));
    setSelectedNodeId(null);
    setSelectedTenantId(null);
    hasInitNodeRef.current = false;
    hasInitTenantRef.current = false;
    setGdnSearch('');
    setSelectedGdn(null);
    setSelectedMembers([]);
  }, []);

  const handleMemberSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMemberSearch(val);
    if (memberDebounceRef.current) clearTimeout(memberDebounceRef.current);
    memberDebounceRef.current = setTimeout(() => setMemberQuickFilter(val), 200);
  }, []);

  const openCreate = () => {
    setDrawerMode('create');
    setDrawerDetail(null);
    setDrawerOpen(true);
  };

  const openEdit = (gdn: GdnResponse) => {
    setDrawerMode('edit');
    setDrawerDetail(gdn);
    setDrawerOpen(true);
  };

  const handleDelete = () => {
    if (!selectedGdn) {
      toast.warning('삭제할 ACD 그룹DN 을 선택하세요.');
      return;
    }
    modal.confirm.execute({
      onOk: () => deleteGdns([selectedGdn.gdnId]),
      options: {
        title: 'ACD 그룹DN 삭제',
        content: `"${selectedGdn.gdnNo} / ${selectedGdn.gdnName}" 그룹DN 을 삭제하시겠습니까?\n배정된 멤버가 함께 해제됩니다.`,
      },
    });
  };

  // 배정 (미배정 멤버 선택 → inserts)
  const handleAssign = () => {
    if (!selectedGdn) return;
    if (selectedGdn.acdType === 3) {
      toast.warning('ACD 타입 = Skill 인 그룹DN 은 멤버를 수동 관리할 수 없습니다.');
      return;
    }
    const inserts = selectedMembers.filter((m) => !m.assigned && m.dnId != null).map((m) => ({ dnId: m.dnId as number }));
    if (inserts.length === 0) {
      toast.info('배정할 미배정 DN 을 선택하세요.');
      return;
    }
    saveMembers({ id: selectedGdn.gdnId, body: { inserts } }, { onSuccess: () => toast.success(`${inserts.length}건 배정되었습니다.`) });
  };

  // 해제 (기배정 멤버 선택 → deletes)
  const handleRevoke = () => {
    if (!selectedGdn) return;
    const deletes = selectedMembers.filter((m) => m.assigned && m.dnId != null).map((m) => ({ dnId: m.dnId as number }));
    if (deletes.length === 0) {
      toast.info('해제할 기배정 DN 을 선택하세요.');
      return;
    }
    saveMembers({ id: selectedGdn.gdnId, body: { deletes } }, { onSuccess: () => toast.success(`${deletes.length}건 해제되었습니다.`) });
  };

  const setAssignFilterAndReset = (f: AssignFilter) => {
    setAssignFilter(f);
    setSelectedMembers([]);
  };
  const setDnTypeFilterAndReset = (t: DnTypeFilter) => {
    setDnTypeFilter(t);
    setSelectedMembers([]);
  };

  // ─── 좌 GDN 그리드 ────────────────────────────────────────────────────────
  const gdnColumnDefs = useMemo<ColDef<GdnResponse>[]>(
    () => [
      {
        headerName: '그룹DN번호',
        field: 'gdnNo',
        width: 120,
        cellRenderer: (p: ICellRendererParams<GdnResponse>) => <span className="font-mono font-semibold text-gray-800">{p.data?.gdnNo}</span>,
      },
      { headerName: '그룹DN이름', field: 'gdnName', flex: 1, minWidth: 140 },
      {
        headerName: 'DR노드',
        field: 'backUpNodeId',
        width: 90,
        valueFormatter: (p) => (p.value == null || p.value === 0 ? '-' : String(p.value)),
      },
      {
        headerName: '글로벌',
        field: 'globalDnYn',
        width: 80,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: (p: ICellRendererParams<GdnResponse>) =>
          p.data?.globalDnYn === 1 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-700 bg-amber-100">전노드</span>
          ) : (
            <span className="text-gray-400 text-[11px]">-</span>
          ),
      },
      { headerName: 'ACD타입', field: 'acdType', flex: 1, minWidth: 120, valueFormatter: (p) => getAcdTypeName(p.value) },
      {
        headerName: '대기호',
        field: 'maxWaitcnt',
        width: 80,
        type: 'numericColumn',
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)),
      },
      {
        headerName: '블록',
        field: 'blockYn',
        width: 75,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: ICellRendererParams<GdnResponse>) =>
          p.data?.blockYn === 1 ? <span className="text-red-500 text-[11px] font-semibold">ON</span> : <span className="text-gray-400 text-[11px]">OFF</span>,
      },
    ],
    [],
  );

  const gdnGridOptions = useMemo<GridOptions<GdnResponse>>(
    () => ({
      ...gridOptions,
      statusBar: undefined,
      pagination: false,
      sideBar: false,
      rowNumbers: false,
      rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
      defaultColDef: { sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true },
    }),
    [gridOptions],
  );

  const handleGdnSelectionChanged = useCallback((rows: GdnResponse[]) => {
    const row = rows.length > 0 ? rows[0] : null;
    setSelectedGdn(row);
    setSelectedMembers([]);
  }, []);

  // ─── 멤버 컨텍스트 칩 ─────────────────────────────────────────────────────
  const dnTypeChip = useMemo(() => {
    if (!selectedGdn) return null;
    if (selectedGdn.acdType === 1) return { label: '상담원(ADN) 배정', cls: 'bg-blue-100 text-blue-700' };
    if (selectedGdn.acdType === 2) return { label: '내선(EDN) 배정', cls: 'bg-purple-100 text-purple-700' };
    return { label: 'Skill — 직접 배정 없음', cls: 'bg-amber-100 text-amber-700' };
  }, [selectedGdn]);

  const assignedSelCount = selectedMembers.filter((m) => m.assigned).length;
  const unassignedSelCount = selectedMembers.filter((m) => !m.assigned).length;

  const tenantOptions = useMemo(() => tenants.map((t) => ({ value: t.tenantId, label: t.tenantName })), [tenants]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스1: 노드 탭바 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
          {/* viewMode 전환 */}
          <button
            type="button"
            onClick={toggleViewMode}
            title={`현재: 탭=${viewMode === 'byNode' ? '노드' : '테넌트'} / 카드=${viewMode === 'byNode' ? '테넌트' : '노드'}. 클릭 시 전환`}
            className="flex-shrink-0 flex flex-col items-center justify-center w-[44px] h-[56px] border-r border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
          >
            {viewMode === 'byNode' ? <Network size={14} className="text-blue-600" /> : <Building2 size={14} className="text-blue-600" />}
            <ArrowUpDown size={12} className="text-blue-500 my-0.5" />
            {viewMode === 'byNode' ? <Building2 size={14} className="text-gray-500" /> : <Network size={14} className="text-gray-500" />}
          </button>

          <button
            type="button"
            className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
            onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
            aria-label="이전 탭"
          >
            <ChevronLeft className="size-4 text-gray-500" />
          </button>

          <div
            ref={tabScrollRef}
            className="flex items-stretch max-w-[900px] min-w-0 overflow-x-auto divide-x divide-gray-200"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {tabItems.map((item) => {
              const currentSelected = viewMode === 'byNode' ? selectedNodeId : selectedTenantId;
              const isActive = currentSelected === item.id;
              const Icon = viewMode === 'byNode' ? Network : Building2;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] w-[140px] flex-shrink-0 transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700 border-b-current' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                  }`}
                  onClick={(e) => {
                    handleTabSelect(item.id);
                    (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }}
                >
                  <Icon className="size-3.5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
            onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            aria-label="다음 탭"
          >
            <ChevronRight className="size-4 text-gray-500" />
          </button>

          {/* 우측: 그리드 검색 + ACD타입 필터 */}
          <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="그룹DN번호/이름"
              value={gdnSearch}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setGdnSearch(e.target.value)}
              style={{ width: 180 }}
            />
            <Select
              value={acdTypeFilter}
              onChange={setAcdTypeFilter}
              style={{ width: 160 }}
              options={[{ value: '', label: 'ACD타입 전체' }, ...ACD_TYPE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))]}
            />
          </div>
        </div>
      </div>

      {/* ===== 박스2: 테넌트 카드 슬라이더 ===== */}
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
                {cardStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">등록된 ACD 그룹DN 이 없습니다</span>
                  </div>
                ) : (
                  cardStats.map((g) => (
                    <AcdGdnTenantCard
                      key={g.id}
                      tenantId={g.id}
                      tenantName={g.name}
                      stats={{ totalCnt: g.totalCnt, acdActiveCnt: g.acdActiveCnt, blockedCnt: g.blockedCnt, huntingCnt: g.huntingCnt }}
                      selected={selectedCardId === g.id}
                      onClick={(e) => {
                        setSelectedCardId(selectedCardId === g.id ? null : g.id);
                        (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }}
                    />
                  ))
                )}
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
                {cardStats.map((g) => (
                  <CompactTenantPill
                    key={g.id}
                    name={g.name}
                    count={g.totalCnt}
                    selected={selectedCardId === g.id}
                    onClick={() => setSelectedCardId(selectedCardId === g.id ? null : g.id)}
                  />
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

      {/* ===== 메인 2-패널 ===== */}
      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* 좌: ACD 그룹DN 목록 */}
        <Panel defaultSize={45} minSize={25}>
          <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
            <div className="h-11 flex items-center px-4 border-b border-gray-100 gap-2 flex-shrink-0">
              <Settings className="size-4 text-[#405189]" />
              <span className="text-[13px] font-semibold text-gray-700">ACD 그룹DN</span>
              <span className="text-xs text-gray-500">
                총 <strong className="text-[#405189]">{gdnsForGrid.length.toLocaleString()}</strong>건 · 선택:{' '}
                <strong className="text-[#405189]">{selectedGdn ? `${selectedGdn.gdnNo} · ${getAcdTypeName(selectedGdn.acdType)}` : '없음'}</strong>
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={openCreate}>
                  등록
                </Button>
                <Button danger size="small" icon={<Trash2 className="size-3.5" />} onClick={handleDelete} loading={isDeleting} disabled={!selectedGdn}>
                  삭제
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 ag-theme-quartz">
              <AgGridReact<GdnResponse>
                rowData={gdnsForGrid}
                columnDefs={gdnColumnDefs}
                gridOptions={gdnGridOptions}
                loading={isGdnsLoading}
                getRowId={(p) => String(p.data.gdnId)}
                onSelectionChanged={(e) => handleGdnSelectionChanged(e.api.getSelectedRows())}
                onRowDoubleClicked={(e) => e.data && openEdit(e.data)}
              />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />

        {/* 우: 멤버 EDN/ADN */}
        <Panel defaultSize={55} minSize={30}>
          <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
            <div className="h-11 flex items-center px-4 border-b border-gray-100 gap-2 flex-shrink-0 flex-wrap min-w-0">
              <Users className="size-4 text-[#405189] flex-shrink-0" />
              <span className="text-[13px] font-semibold text-gray-700 flex-shrink-0">멤버 DN</span>
              {selectedGdn ? (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full bg-[#eef0f7] text-[#405189] font-medium truncate min-w-0 max-w-[220px]"
                  title={`그룹DN ${selectedGdn.gdnNo} · ${selectedGdn.gdnName}`}
                >
                  그룹DN {selectedGdn.gdnNo} · {selectedGdn.gdnName}
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">그룹DN을 선택하세요</span>
              )}
              {dnTypeChip && <span className={`text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${dnTypeChip.cls}`}>{dnTypeChip.label}</span>}

              <div className="ml-auto flex items-center gap-2 flex-wrap">
                {/* 배정상태 세그먼트 */}
                <div className="flex gap-1">
                  <SegBtn active={assignFilter === 'all'} onClick={() => setAssignFilterAndReset('all')}>
                    전체
                  </SegBtn>
                  <SegBtn active={assignFilter === 'assigned'} onClick={() => setAssignFilterAndReset('assigned')}>
                    기배정
                  </SegBtn>
                  <SegBtn active={assignFilter === 'unassigned'} onClick={() => setAssignFilterAndReset('unassigned')}>
                    미배정
                  </SegBtn>
                </div>
                <span className="text-xs text-gray-400">
                  총<strong className="ml-1 text-[#405189]">{selectedGdn ? memberPool.length.toLocaleString() : '-'}</strong>건 · 선택
                  <strong className="ml-1 text-[#405189]">{selectedMembers.length}</strong>건
                </span>
                {/* DN타입 세그먼트 */}
                <div className="flex gap-1">
                  <SegBtn active={dnTypeFilter === ''} onClick={() => setDnTypeFilterAndReset('')}>
                    전체
                  </SegBtn>
                  <SegBtn active={dnTypeFilter === '11'} onClick={() => setDnTypeFilterAndReset('11')}>
                    EDN
                  </SegBtn>
                  <SegBtn active={dnTypeFilter === '12'} onClick={() => setDnTypeFilterAndReset('12')}>
                    ADN
                  </SegBtn>
                </div>
                <Input
                  size="small"
                  allowClear
                  prefix={<Search className="size-3 text-gray-400" />}
                  placeholder="DN번호/이름 검색"
                  value={memberSearch}
                  onChange={handleMemberSearchChange}
                  onClear={() => {
                    setMemberSearch('');
                    setMemberQuickFilter('');
                  }}
                  style={{ width: 150 }}
                />
              </div>
            </div>

            {!selectedGdn ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                <Users className="size-10 text-gray-200" />
                <span className="text-sm">좌측에서 ACD 그룹DN 을 클릭하세요</span>
              </div>
            ) : (
              <div className="flex-1 min-h-0 ag-theme-quartz">
                <MemberGridWithFilter rowData={memberPool} isLoading={isMembersLoading} quickFilter={memberQuickFilter} onSelectionChanged={setSelectedMembers} />
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>

      {/* ===== floating Bulk Action Bar ===== */}
      {selectedGdn && selectedMembers.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white rounded-xl shadow-xl flex items-center gap-3 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="text-white/60 text-xs">DN</span>
            <span className="bg-[#405189] px-2 py-0.5 rounded-full font-bold min-w-[24px] text-center">{selectedMembers.length}</span>
            <span className="text-white/60 text-xs">건 선택됨</span>
          </span>
          <span className="text-white/30">·</span>
          <Button
            type="primary"
            icon={<Plus className="size-3.5" />}
            onClick={handleAssign}
            loading={isSavingMembers}
            disabled={unassignedSelCount === 0}
            style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
          >
            배정 ({unassignedSelCount})
          </Button>
          <Button danger icon={<X className="size-3.5" />} onClick={handleRevoke} loading={isSavingMembers} disabled={assignedSelCount === 0}>
            해제 ({assignedSelCount})
          </Button>
          <Button type="text" onClick={() => setSelectedMembers([])} className="!text-white/60 hover:!text-white">
            선택 해제
          </Button>
        </div>
      )}

      {/* ===== 등록/수정 Drawer ===== */}
      <AcdGdnFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        detail={drawerDetail}
        defaultTenantId={selectedTenantId}
        defaultNodeId={selectedNodeId}
        tenantOptions={tenantOptions}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setDrawerOpen(false)}
      />
    </div>
  );
}

// 멤버 그리드 + quickFilter 래퍼 (page 내 grid ref 없이 quickFilterText 전달)
function MemberGridWithFilter({
  rowData,
  isLoading,
  quickFilter,
  onSelectionChanged,
}: {
  rowData: GdnMemberResponse[];
  isLoading: boolean;
  quickFilter: string;
  onSelectionChanged: (rows: GdnMemberResponse[]) => void;
}) {
  // quickFilter 는 클라이언트 필터 — AcdGdnMemberGrid 가 자체 ag-Grid 라 prop 으로 전달 불가.
  // 간단히 keyword 로 rowData 사전 필터.
  const filtered = useMemo(() => {
    const kw = quickFilter.trim().toLowerCase();
    if (!kw) return rowData;
    return rowData.filter((m) => (m.dnNo ?? '').toLowerCase().includes(kw) || (m.loginAdn ?? '').toLowerCase().includes(kw));
  }, [rowData, quickFilter]);
  return <AcdGdnMemberGrid rowData={filtered} isLoading={isLoading} onSelectionChanged={onSelectionChanged} />;
}

// ─── 세그먼트 버튼 ────────────────────────────────────────────────────────────
function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-6 px-2.5 text-xs rounded border transition ${
        active ? 'bg-[#405189] border-[#405189] text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
      }`}
    >
      {children}
    </button>
  );
}

// ─── 컴팩트 테넌트 pill (카드 축소 모드) ──────────────────────────────────────
function CompactTenantPill({ name, count, selected, onClick }: { name: string; count: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${name} · ${count.toLocaleString()}건`}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
        selected
          ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
      }`}
    >
      <span className="font-medium truncate max-w-[120px]">{name}</span>
      <span className={`text-[11px] ${selected ? 'text-white/80' : 'text-gray-400'}`}>{count.toLocaleString()}</span>
    </button>
  );
}
