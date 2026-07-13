/**
 * ACD 그룹DN 관리 페이지 (SWAT IPR20S3010 + IPR20S3030, GDN_TYPE=16).
 *
 * 멀티테넌트 개편(상담사관리/내선프로파일 정합): byNode/byTenant 뷰전환 + 탭바 + 카드 슬라이더 제거
 *   → 상단에 노드 Select + 테넌트 ScopeSelect 두 필터(각 "전체" 포함) + 요약.
 *   데이터는 전량 클라이언트 로드 → 노드/테넌트/ACD타입/검색 클라이언트 필터.
 *
 * 레이아웃:
 *  박스1: 헤더 (노드 Select + 테넌트 ScopeSelect + 요약 + 그리드 검색/ACD타입 필터)
 *  메인 2-패널:
 *    좌(45%) ACD 그룹DN 목록 (단일선택 → 우 패널 갱신) + 등록/삭제
 *    리사이즈 핸들
 *    우(flex) 멤버 EDN/ADN 통합 풀 (multi-select) + 배정상태 세그먼트 + 검색
 *  하단 floating bulk-bar: 선택 N건 → [배정] [해제]
 *  Drawer: 그룹DN 등록/수정
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { ColDef, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import { Network, Plus, Search, Settings, Trash2, Users, X } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AcdGdnFormDrawer from '../../features/acd-gdn/components/AcdGdnFormDrawer';
import AcdGdnMemberGrid from '../../features/acd-gdn/components/AcdGdnMemberGrid';
import { useDeleteAcdGdns, useGetAcdGdnMembersPool, useGetAcdGdns, useSaveAcdGdnMembers } from '../../features/acd-gdn/hooks/useAcdGdnQueries';
import { ACD_TYPE_OPTIONS, type GdnMemberItem, type GdnMemberPoolParams, type GdnMemberResponse, type GdnResponse, getAcdTypeName, getYnName } from '../../features/acd-gdn/types';
import { BOOL_OX_LABEL } from '../../features/dn/utils/dnEnums';
import { useGetDnProfileNodes, useGetDnProfileTenants } from '../../features/dn-profile/hooks/useDnProfileQueries';
import { useGetNodeTenants, useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
import ScopeSelect from '@/components/custom/ScopeSelect';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '교환기 번호관리' }, { title: 'ACD', path: '/ipron/acd-gdn' }];

type AssignFilter = 'all' | 'assigned' | 'unassigned';

export default function AcdGdnList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // 운영자 모드에서만 테넌트 ScopeSelect 노출. 일반 콘솔은 토큰 테넌트로 스코프.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null); // null=전체 노드
  // 운영자 전용 테넌트 필터. 실제 사용하는 selectedTenantId 는 아래 파생값(일반=ctx, 운영자=필터).
  const [tenantFilter, setTenantFilter] = useState<number | null>(null); // null=전체 테넌트
  const selectedTenantId = operatorMode ? tenantFilter : ctxTenantId;

  // 좌 그리드 검색/필터
  const [gdnSearch, setGdnSearch] = useState('');
  const [acdTypeFilter, setAcdTypeFilter] = useState<string>('');
  const [selectedGdn, setSelectedGdn] = useState<GdnResponse | null>(null);

  // 우 멤버 패널 필터
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberQuickFilter, setMemberQuickFilter] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<GdnMemberResponse[]>([]);
  // 교차테넌트 방지: GDN row 선택 시 그 tenantId 로 멤버 풀을 좁힘. 선택 해제 시 null(전체 복귀).
  const [lockedTenantId, setLockedTenantId] = useState<number | null>(null);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [drawerDetail, setDrawerDetail] = useState<GdnResponse | null>(null);

  const memberDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: allNodes = [] } = useGetDnProfileNodes();
  const nodes = useScopedNodes(allNodes, selectedTenantId);
  const { data: tenants = [] } = useGetDnProfileTenants();
  const { data: nodeTenants = [] } = useGetNodeTenants();
  const { data: gdns = [], isLoading: isGdnsLoading } = useGetAcdGdns();

  // 멤버 풀 — 선택 그룹DN 기준. 배정상태 필터는 서버 위임, keyword 는 클라이언트 quickFilter.
  const memberPoolParams = useMemo<GdnMemberPoolParams>(() => ({ assignFilter }), [assignFilter]);
  const { data: memberPool = [], isLoading: isMembersLoading } = useGetAcdGdnMembersPool(selectedGdn?.gdnId ?? null, memberPoolParams);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteGdns, isPending: isDeleting } = useDeleteAcdGdns({
    mutationOptions: {
      onSuccess: () => {
        toast.success('선택한 그룹DN 이 삭제되었습니다');
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

  // ─── Derived: 노드/테넌트 옵션 (DnList 패턴) ──────────────────────────────
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

  // 좌 그리드 표시용 GDN — 노드/테넌트/ACD타입/검색 클라이언트 필터
  const gdnsForGrid = useMemo(() => {
    let rows = gdns;
    if (selectedNodeId != null) rows = rows.filter((g) => g.nodeId === selectedNodeId);
    if (selectedTenantId != null) rows = rows.filter((g) => g.tenantId === selectedTenantId);
    if (acdTypeFilter) rows = rows.filter((g) => String(g.acdType) === acdTypeFilter);
    const kw = gdnSearch.trim().toLowerCase();
    if (kw) rows = rows.filter((g) => g.gdnNo.toLowerCase().includes(kw) || (g.gdnName ?? '').toLowerCase().includes(kw));
    return rows;
  }, [gdns, selectedNodeId, selectedTenantId, acdTypeFilter, gdnSearch]);

  // 헤더 요약 — 현재 필터 기준 총/호분배(acdYn)/블록(blockYn).
  const summary = useMemo(() => {
    let acdActive = 0;
    let blocked = 0;
    for (const g of gdnsForGrid) {
      if (g.acdYn === 1) acdActive += 1;
      if (g.blockYn === 1) blocked += 1;
    }
    return { total: gdnsForGrid.length, acdActive, blocked };
  }, [gdnsForGrid]);

  // 운영자 모드 → 테넌트 모드 전환 시, 선택 노드가 스코프 밖이면 해제
  useEffect(() => {
    if (selectedNodeId != null && nodes.length > 0 && !nodes.some((n) => n.nodeId === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  // 스코프(노드/테넌트) 변경 시 잠금/선택 초기화
  useEffect(() => {
    setLockedTenantId(null);
    setSelectedMembers([]);
  }, [selectedNodeId, selectedTenantId]);

  // 선택이 모두 빈 배열이 되면 lockedTenantId 를 해제
  useEffect(() => {
    if (selectedMembers.length === 0) {
      setLockedTenantId(null);
    }
  }, [selectedMembers]);

  // 선택 그룹DN 이 현재 그리드에서 사라지면 우 패널 닫기
  useEffect(() => {
    if (selectedGdn && !gdnsForGrid.some((g) => g.gdnId === selectedGdn.gdnId)) {
      setSelectedGdn(null);
      setSelectedMembers([]);
    }
  }, [gdnsForGrid, selectedGdn]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
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
      toast.warning('삭제할 ACD 그룹DN 을 선택하세요');
      return;
    }
    modal.confirm.execute({
      onOk: () => deleteGdns([selectedGdn.gdnId]),
      options: {
        title: 'ACD 그룹DN 삭제',
        content: `"${selectedGdn.gdnNo} / ${selectedGdn.gdnName}" 그룹DN을 삭제하시겠습니까?`,
      },
    });
  };

  // 배정 (미배정 멤버 선택 → inserts)
  const handleAssign = () => {
    if (!selectedGdn) return;
    if (selectedGdn.acdType === 3) {
      toast.warning('ACD 타입 = Skill 인 그룹DN 은 멤버를 수동 관리할 수 없습니다');
      return;
    }
    const inserts = selectedMembers.filter((m) => !m.assigned && m.dnId != null).map((m) => ({ dnId: m.dnId as number }));
    if (inserts.length === 0) {
      toast.info('배정할 미배정 DN 을 선택하세요');
      return;
    }
    saveMembers({ id: selectedGdn.gdnId, body: { inserts } }, { onSuccess: () => toast.success(`${inserts.length}건 배정되었습니다.`) });
  };

  // 해제 (기배정 멤버 선택 → deletes)
  const handleRevoke = () => {
    if (!selectedGdn) return;
    const deletes = selectedMembers.filter((m) => m.assigned && m.dnId != null).map((m) => ({ dnId: m.dnId as number }));
    if (deletes.length === 0) {
      toast.info('해제할 기배정 DN 을 선택하세요');
      return;
    }
    saveMembers({ id: selectedGdn.gdnId, body: { deletes } }, { onSuccess: () => toast.success(`${deletes.length}건 해제되었습니다.`) });
  };

  // 갭1: memberPriority 인라인 편집 → updates 저장
  const handlePriorityChanged = useCallback(
    (updates: GdnMemberItem[]) => {
      if (!selectedGdn) return;
      saveMembers({ id: selectedGdn.gdnId, body: { updates } }, { onSuccess: () => toast.success('우선순위가 저장되었습니다'), onError: () => toast.error('우선순위 저장 실패') });
    },
    [selectedGdn, saveMembers],
  );

  const setAssignFilterAndReset = (f: AssignFilter) => {
    setAssignFilter(f);
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
      { headerName: '그룹DN이름', field: 'gdnName', flex: 1, minWidth: 140, tooltipField: 'gdnName' },
      {
        headerName: 'DR노드',
        field: 'backUpNodeName',
        width: 100,
        valueFormatter: (p) => (p.value == null || p.value === '' ? '-' : p.value),
        tooltipField: 'backUpNodeName',
      },
      {
        headerName: '글로벌여부',
        field: 'globalDnYn',
        minWidth: 96,
        maxWidth: 110,
        suppressHeaderMenuButton: true,
        cellStyle: { textAlign: 'center' },
        filterValueGetter: (p) => BOOL_OX_LABEL(p.data?.globalDnYn),
        valueFormatter: (p) => BOOL_OX_LABEL(p.value),
      },
      { headerName: 'ACD타입', field: 'acdType', width: 140, filterValueGetter: (p) => getAcdTypeName(p.data?.acdType), valueFormatter: (p) => getAcdTypeName(p.value) },
      {
        headerName: '호분배여부',
        field: 'acdYn',
        width: 90,
        filterValueGetter: (p) => getYnName(p.data?.acdYn),
        valueFormatter: (p) => getYnName(p.value),
      },
      {
        headerName: '스킬셋',
        field: 'skillsetName',
        flex: 1,
        minWidth: 100,
        valueFormatter: (p) => (p.value == null || p.value === '' ? '-' : p.value),
      },
      {
        headerName: '대기호',
        field: 'maxWaitcnt',
        width: 75,
        type: 'numericColumn',
        filter: 'agNumberColumnFilter',
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)),
      },
      {
        headerName: '대기시간(s)',
        field: 'maxWaittime',
        width: 100,
        type: 'numericColumn',
        filter: 'agNumberColumnFilter',
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)),
      },
      {
        headerName: '헌팅',
        field: 'huntingYn',
        width: 75,
        suppressHeaderMenuButton: true,
        filterValueGetter: (p) => (p.data?.huntingYn === 1 ? '사용' : '미사용'),
        valueFormatter: (p) => (p.value === 1 ? '사용' : '미사용'),
      },
      {
        headerName: '블록 시 라우팅',
        field: 'blockRoutingDnis',
        minWidth: 120,
        flex: 1,
        valueFormatter: (p) => (p.value == null || p.value === '' ? '-' : p.value),
        tooltipField: 'blockRoutingDnis',
      },
      {
        headerName: '장애 시 라우팅',
        field: 'errorRoutingDnis',
        minWidth: 120,
        flex: 1,
        valueFormatter: (p) => (p.value == null || p.value === '' ? '-' : p.value),
        tooltipField: 'errorRoutingDnis',
      },
      {
        headerName: '통화량 초과 시 라우팅',
        field: 'busyRoutingDnis',
        minWidth: 150,
        flex: 1,
        valueFormatter: (p) => (p.value == null || p.value === '' ? '-' : p.value),
        tooltipField: 'busyRoutingDnis',
      },
      {
        headerName: '블록',
        field: 'blockYn',
        width: 75,
        suppressHeaderMenuButton: true,
        cellStyle: { textAlign: 'center' },
        filterValueGetter: (p) => (p.data?.blockYn === 1 ? '설정' : '해제'),
        cellRenderer: (p: ICellRendererParams<GdnResponse>) =>
          p.data?.blockYn === 1 ? <span className="text-red-500 text-[11px] font-semibold">설정</span> : <span className="text-gray-400 text-[11px]">해제</span>,
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
    }),
    [gridOptions],
  );

  // ag-Grid 34: rowSelection 은 gridOptions 밖 직접 prop — 의도적 단일선택(행=우측 패널 갱신, 벌크 없음)
  const gdnRowSelection = useMemo(() => ({ mode: 'singleRow' as const, checkboxes: false, enableClickSelection: true }), []);

  const handleGdnSelectionChanged = useCallback((rows: GdnResponse[]) => {
    const row = rows.length > 0 ? rows[0] : null;
    setSelectedGdn(row);
    setSelectedMembers([]);
    // 전체보기(테넌트 미선택) 에서 GDN 선택 시 그 tenantId 로 멤버 풀 잠금.
    // 단일테넌트 선택 시에는 어차피 같은 테넌트라 필터 무영향.
    if (row != null) {
      setLockedTenantId(row.tenantId ?? null);
    } else {
      setLockedTenantId(null);
    }
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

  // 전체보기에서 GDN row 선택 시 그 tenantId 로 멤버 풀 좁힘 (교차테넌트 배정 방지).
  // lockedTenantId === null 이면 전체 반환 (단일테넌트 선택 상태 or 미선택).
  const filteredMemberPool = useMemo(() => {
    if (lockedTenantId == null) return memberPool;
    return memberPool.filter((m) => m.tenantId === lockedTenantId);
  }, [memberPool, lockedTenantId]);

  const tenantOptions = useMemo(() => tenants.map((t) => ({ value: t.tenantId, label: t.tenantName })), [tenants]);
  // NUM-001: 노드 옵션 — 할당된 노드만 (DnForm:nodeOptions 패턴 정합)
  const nodeOptionsForDrawer = useMemo(() => assignedNodes.map((n) => ({ value: n.nodeId, label: n.nodeName })), [assignedNodes]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스1: 헤더 (노드/테넌트 스코프 + 요약 + 그리드 검색/필터) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          {/* 노드 필터 */}
          <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
            <Network className="size-3.5 shrink-0 text-blue-600" />
            <Select
              size="small"
              variant="borderless"
              value={selectedNodeId ?? '__all__'}
              onChange={(v) => setSelectedNodeId(v === '__all__' ? null : Number(v))}
              options={[{ value: '__all__', label: '전체 노드' }, ...assignedNodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))]}
              style={{ width: 150 }}
              popupMatchSelectWidth={false}
            />
          </div>
          {/* 테넌트 필터 — 운영자 모드에서만 노출 */}
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
              value={tenantFilter == null ? null : String(tenantFilter)}
              onChange={(id) => setTenantFilter(id == null ? null : Number(id))}
            />
          )}
          {/* 요약 — 총/호분배/블록 */}
          <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
            <span className="text-gray-500">
              총 그룹DN <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              호분배 <b className="text-blue-600 font-semibold">{summary.acdActive.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              블록 <b className="text-red-500 font-semibold">{summary.blocked.toLocaleString()}</b>
            </span>
          </div>
          {/* 우측: 그리드 검색 + ACD타입 필터 */}
          <div className="ml-auto flex items-center gap-2">
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

      {/* ===== 메인 2-패널 ===== */}
      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* 좌: ACD 그룹DN 목록 */}
        <Panel defaultSize={45} minSize={25}>
          <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
            <div className="h-11 flex items-center px-4 border-b border-gray-100 gap-2 flex-shrink-0">
              <Settings className="size-4 text-[#405189]" />
              <span className="text-[13px] font-semibold text-gray-700">ACD 그룹DN</span>
              <span className="text-xs text-gray-500">
                총 <strong className="text-[#405189]">{gdnsForGrid.length.toLocaleString()}</strong>건
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
                rowSelection={gdnRowSelection}
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
                  총<strong className="ml-1 text-[#405189]">{selectedGdn ? filteredMemberPool.length.toLocaleString() : '-'}</strong>건
                </span>
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
                <MemberGridWithFilter
                  rowData={filteredMemberPool}
                  isLoading={isMembersLoading}
                  quickFilter={memberQuickFilter}
                  onSelectionChanged={setSelectedMembers}
                  onPriorityChanged={handlePriorityChanged}
                />
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>

      {/* ===== floating Bulk Action Bar (항상 렌더 — 선택 없으면 버튼 disabled + opacity 0.38) ===== */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-xl shadow-xl flex items-center gap-3 px-4 py-2.5 text-sm"
        style={{ backgroundColor: 'rgba(51,65,85,0.9)' }}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-[#e2e8f0] text-xs">DN</span>
          <span className={`px-2 py-0.5 rounded-full font-bold min-w-[24px] text-center text-white ${selectedMembers.length > 0 ? 'bg-[#405189]' : 'bg-slate-600'}`}>
            {selectedMembers.length}
          </span>
          <span className="text-[#e2e8f0] text-xs">건 선택됨</span>
        </span>
        <span className="text-[#94a3b8]">·</span>
        <Button
          type="primary"
          icon={<Plus className="size-3.5" />}
          onClick={handleAssign}
          loading={isSavingMembers}
          disabled={!selectedGdn || unassignedSelCount === 0}
          style={{ opacity: selectedGdn && unassignedSelCount > 0 ? 1 : 0.38 }}
        >
          배정
        </Button>
        <Button
          danger
          icon={<X className="size-3.5" />}
          onClick={handleRevoke}
          loading={isSavingMembers}
          disabled={!selectedGdn || assignedSelCount === 0}
          style={{ opacity: selectedGdn && assignedSelCount > 0 ? 1 : 0.38 }}
        >
          해제
        </Button>
        <Button
          type="text"
          onClick={() => setSelectedMembers([])}
          disabled={selectedMembers.length === 0}
          style={{ color: '#e2e8f0', opacity: selectedMembers.length > 0 ? 1 : 0.38 }}
          className="hover:!text-white"
        >
          선택 해제
        </Button>
      </div>

      {/* ===== 등록/수정 Drawer ===== */}
      <AcdGdnFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        detail={drawerDetail}
        defaultTenantId={selectedTenantId}
        defaultNodeId={selectedNodeId}
        tenantOptions={tenantOptions}
        nodeOptions={nodeOptionsForDrawer}
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
  onPriorityChanged,
}: {
  rowData: GdnMemberResponse[];
  isLoading: boolean;
  quickFilter: string;
  onSelectionChanged: (rows: GdnMemberResponse[]) => void;
  onPriorityChanged?: (updates: GdnMemberItem[]) => void;
}) {
  // quickFilter 는 클라이언트 필터 — AcdGdnMemberGrid 가 자체 ag-Grid 라 prop 으로 전달 불가.
  // 간단히 keyword 로 rowData 사전 필터.
  const filtered = useMemo(() => {
    const kw = quickFilter.trim().toLowerCase();
    if (!kw) return rowData;
    return rowData.filter((m) => (m.dnNo ?? '').toLowerCase().includes(kw) || (m.loginAdn ?? '').toLowerCase().includes(kw));
  }, [rowData, quickFilter]);
  return <AcdGdnMemberGrid rowData={filtered} isLoading={isLoading} onSelectionChanged={onSelectionChanged} onPriorityChanged={onPriorityChanged} />;
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
