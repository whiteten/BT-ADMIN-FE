/**
 * SIP 트렁크(테넌트) 관리 페이지 (SWAT IPR20S3030, GDN_TYPE=18).
 *
 * 레이아웃 (sip-trunk-v2 목업 1:1):
 *  - 박스1: 노드 탭바 (⇅ viewMode swap + 노드 탭 + 검색)
 *  - 박스2: 테넌트 카드 슬라이더 (DnList 정식 패턴, 채널 사용률 게이지)
 *  - 박스3: 메인 2-패널 (좌 그룹DN 단일선택 / 우 SIP 트렁크 다중선택 — N:N 데이터, 1:N 행위)
 *  - floating bulk-bar: 그룹DN 1 × 트렁크 N → 배정 / 해제 / 선택 해제
 *
 * 우 패널은 선택된 그룹DN 기준 멤버 풀(배정중/미배정)을 노출. 그룹DN 미선택 시 안내.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { CellStyle, ColDef, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact, type AgGridReact as AgGridReactType } from 'ag-grid-react';
import { Button, Empty, Input, Select } from 'antd';
import { ArrowUpDown, Building2, Cable, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, LayoutGrid, Network, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { BOOL_OX_LABEL } from '../../features/dn/utils/dnEnums';
import { useGetDnProfileNodeTenants, useGetDnProfileNodes } from '../../features/dn-profile/hooks/useDnProfileQueries';
import SipGdnDrawer, { type SipGdnDrawerRef } from '../../features/sip-trunk/components/SipGdnDrawer';
import SipTrunkAssignDrawer from '../../features/sip-trunk/components/SipTrunkAssignDrawer';
import SipTrunkDrawer, { type SipTrunkDrawerRef } from '../../features/sip-trunk/components/SipTrunkDrawer';
import {
  useDeleteSipGdns,
  useDeleteSipTrunks,
  useGetSipGdns,
  useGetSipTrunkMembers,
  useGetSipTrunkNodes,
  useGetSipTrunks,
  useSaveSipTrunkMembers,
} from '../../features/sip-trunk/hooks/useSipTrunkQueries';
import { type SipGdnResponse, type SipTrunkMemberResponse, type SipTrunkResponse, getSipTrunkKindName } from '../../features/sip-trunk/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '교환기 번호관리' }, { title: 'SIP TRUNK', path: '/ipron/sip-trunk' }];

type AssignFilter = 'all' | 'assigned' | 'unassigned';

function gaugeColor(used: number, max: number): string {
  const pct = max > 0 ? (used / max) * 100 : 0;
  return pct < 60 ? '#52c41a' : pct <= 85 ? '#faad14' : '#ff4d4f';
}

export default function SipTrunkList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const { gridOptions: baseGridOptions } = useAggridOptions();
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const trunkGridRef = useRef<AgGridReactType<SipTrunkMemberResponse>>(null);
  const hasInitNodeRef = useRef(false);

  // ─── State ────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'byNode' | 'byTenant'>('byNode');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [topSearch, setTopSearch] = useState('');
  const [gdnSearch, setGdnSearch] = useState('');
  const [selectedGdn, setSelectedGdn] = useState<SipGdnResponse | null>(null);
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('all');
  const [kindFilter, setKindFilter] = useState<string>('');
  const [selectedTrunks, setSelectedTrunks] = useState<SipTrunkMemberResponse[]>([]);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);

  const gdnDrawerRef = useRef<SipGdnDrawerRef>(null);
  const trunkDrawerRef = useRef<SipTrunkDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetDnProfileNodes();
  const { data: nodeTenants = [] } = useGetDnProfileNodeTenants();
  const { data: nodeSummaries = [] } = useGetSipTrunkNodes({ params: { tenantScope: 'tenant' } });

  const gdnListParams = useMemo(() => {
    const p: { nodeId?: number; tenantScope: 'tenant'; keyword?: string } = { tenantScope: 'tenant' };
    if (selectedNodeId) p.nodeId = selectedNodeId;
    if (gdnSearch.trim()) p.keyword = gdnSearch.trim();
    return p;
  }, [selectedNodeId, gdnSearch]);
  const { data: gdns = [], isLoading: gdnsLoading } = useGetSipGdns({ params: gdnListParams });

  // 우 패널: 선택 그룹DN 기준 멤버 풀
  const memberParams = useMemo(
    () => (selectedGdn?.gdnId && selectedNodeId ? { gdnId: selectedGdn.gdnId, nodeId: selectedNodeId, assignFilter, tenantScope: 'tenant' as const } : null),
    [selectedGdn?.gdnId, selectedNodeId, assignFilter],
  );
  const { data: members = [], isLoading: membersLoading } = useGetSipTrunkMembers(memberParams);

  // 그룹DN 미선택 시 카드 통계용 — 노드 전체 트렁크 목록
  const { data: allTrunks = [] } = useGetSipTrunks({ params: selectedNodeId ? { nodeId: selectedNodeId, tenantScope: 'tenant' } : { tenantScope: 'tenant' } });

  // ag-Grid 는 grid 레벨 이벤트 콜백(onRowDoubleClicked)을 마운트 시 1회 바인딩하므로
  // memoized gridOptions 가 바뀌어도 재등록하지 않는다 → 클로저가 init 시점 배열에 고정됨.
  // 갓 생성한 행도 최신 마스터에서 찾을 수 있도록 ref 로 최신 배열을 항상 노출.
  const allTrunksRef = useRef(allTrunks);
  allTrunksRef.current = allTrunks;

  // ─── Derived: 탭 / 카드 ───────────────────────────────────────────────────
  const assignedNodes = useMemo(() => {
    const ids = new Set(nodeTenants.map((nt) => nt.nodeId));
    const filtered = nodes.filter((n) => ids.has(n.nodeId));
    return filtered.length > 0 ? filtered : nodes;
  }, [nodes, nodeTenants]);

  const assignedTenants = useMemo(() => {
    const map = new Map<number, { tenantId: number; tenantName: string }>();
    for (const nt of nodeTenants) if (!map.has(nt.tenantId)) map.set(nt.tenantId, { tenantId: nt.tenantId, tenantName: nt.tenantName });
    return Array.from(map.values()).sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [nodeTenants]);

  const tabItems = useMemo(
    () => (viewMode === 'byNode' ? assignedNodes.map((n) => ({ id: n.nodeId, name: n.nodeName })) : assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))),
    [viewMode, assignedNodes, assignedTenants],
  );

  // 테넌트 카드 — 선택된 노드의 테넌트별 트렁크/채널 집계
  const cardStats = useMemo(() => {
    const map = new Map<number, { id: number; name: string; trunkCnt: number; totalChnl: number; usedChnl: number }>();
    // 시드: 노드에 매핑된 테넌트
    if (viewMode === 'byNode' && selectedNodeId) {
      for (const nt of nodeTenants) {
        if (nt.nodeId !== selectedNodeId) continue;
        if (!map.has(nt.tenantId)) map.set(nt.tenantId, { id: nt.tenantId, name: nt.tenantName ?? '-', trunkCnt: 0, totalChnl: 0, usedChnl: 0 });
      }
    } else if (viewMode === 'byTenant' && selectedTenantId) {
      for (const nt of nodeTenants) {
        if (nt.tenantId !== selectedTenantId) continue;
        if (!map.has(nt.nodeId)) map.set(nt.nodeId, { id: nt.nodeId, name: nt.nodeName ?? '-', trunkCnt: 0, totalChnl: 0, usedChnl: 0 });
      }
    }
    for (const t of allTrunks) {
      const key = viewMode === 'byNode' ? t.tenantId : t.nodeId;
      if (key == null) continue;
      // 노드-테넌트 마스터 시드에 없는 테넌트(미매핑/orphan)는 카드로 노출하지 않음.
      // → SIP트렁크(테넌트)는 "전체"(노드별 테넌트 전체) 카드 개념이 없으므로 orphan "-" 카드 제거.
      if (!map.has(key)) continue;
      const g = map.get(key)!;
      g.trunkCnt += 1;
      g.totalChnl += t.chnlCnt ?? 0;
      g.usedChnl += t.totChannelCount ?? 0;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allTrunks, viewMode, nodeTenants, selectedNodeId, selectedTenantId]);

  const selectedCardId = viewMode === 'byNode' ? selectedTenantId : selectedNodeId;
  const setSelectedCardId = useCallback(
    (id: number | null) => {
      if (viewMode === 'byNode') setSelectedTenantId(id);
      else setSelectedNodeId(id);
    },
    [viewMode],
  );

  // ─── Auto-select 첫 노드 ──────────────────────────────────────────────────
  useEffect(() => {
    if (viewMode !== 'byNode') return;
    if (assignedNodes.length > 0 && !hasInitNodeRef.current && selectedNodeId == null) {
      hasInitNodeRef.current = true;
      setSelectedNodeId(assignedNodes[0].nodeId);
    }
  }, [viewMode, assignedNodes, selectedNodeId]);

  // 첫 테넌트 카드 자동 선택 (로드 시)
  useEffect(() => {
    if (selectedCardId != null) return;
    if (cardStats.length > 0) setSelectedCardId(cardStats[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardStats]);

  // 그룹DN 목록 변경 시 선택 무효화만 (자동 선택 제거 — 사용자가 클릭 선택)
  useEffect(() => {
    if (gdns.length === 0) {
      setSelectedGdn(null);
      return;
    }
    // 현재 선택된 GDN이 새 목록에 없으면(노드·테넌트 전환 등) 선택 해제
    if (selectedGdn && !gdns.some((g) => g.gdnId === selectedGdn.gdnId)) {
      setSelectedGdn(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gdns]);

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
      setSelectedGdn(null);
      setSelectedTrunks([]);
    },
    [viewMode],
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'byNode' ? 'byTenant' : 'byNode'));
    setSelectedNodeId(null);
    setSelectedTenantId(null);
    hasInitNodeRef.current = false;
    setSelectedGdn(null);
    setSelectedTrunks([]);
  }, []);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: deleteGdns } = useDeleteSipGdns({
    mutationOptions: { onSuccess: () => toast.success('그룹DN이 삭제되었습니다') },
  });
  const { mutate: deleteTrunks } = useDeleteSipTrunks({
    mutationOptions: { onSuccess: () => toast.success('SIP 트렁크가 삭제되었습니다') },
  });
  const { mutate: saveMembers } = useSaveSipTrunkMembers({
    mutationOptions: {
      onSuccess: (result) => {
        toast.success(`해제 완료 — 해제 ${result.removed}건`);
        setSelectedTrunks([]);
        trunkGridRef.current?.api?.deselectAll();
      },
      onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '해제 실패'),
    },
  });

  // 단일선택 삭제 — 선택된 그룹DN 1건 삭제 (AcdGdnList 정합)
  const handleGdnDelete = useCallback(() => {
    if (!selectedGdn) {
      toast.warning('삭제할 그룹DN을 선택하세요');
      return;
    }
    modal.confirm.execute({
      onOk: () => {
        deleteGdns([selectedGdn.gdnId]);
        setSelectedGdn(null);
      },
      options: {
        title: '그룹DN 삭제',
        content: `"${selectedGdn.gdnNo}" 그룹DN을 삭제하시겠습니까?`,
      },
    });
  }, [modal, deleteGdns, selectedGdn]);

  const handleTrunkDeleteSelected = useCallback(
    (trunks: SipTrunkMemberResponse[]) => {
      if (trunks.length === 0) return;
      modal.confirm.execute({
        onOk: () => {
          deleteTrunks(trunks.map((t) => t.sipTrunkId));
          setSelectedTrunks([]);
          trunkGridRef.current?.api?.deselectAll();
        },
        options: {
          title: 'SIP 트렁크 삭제',
          content: trunks.length === 1 ? `"${trunks[0].targetName}" 트렁크를 삭제하시겠습니까?` : `선택한 트렁크 ${trunks.length}건을 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteTrunks],
  );

  const handleRevoke = useCallback(() => {
    if (!selectedGdn?.gdnId || selectedTrunks.length === 0) return;
    modal.confirm.execute({
      onOk: () =>
        saveMembers({
          gdnId: selectedGdn.gdnId,
          agreeChannelOverflow: false,
          rows: selectedTrunks.map((t) => ({ sipTrunkId: t.sipTrunkId, assignYn: false, memberPriority: t.memberPriority ?? 0, channelLimitCount: t.channelLimitCount ?? 0 })),
        }),
      options: { title: '배정 해제', content: `선택한 트렁크 ${selectedTrunks.length}건의 배정을 해제하시겠습니까?` },
    });
  }, [selectedGdn, selectedTrunks, modal, saveMembers]);

  const clearSelection = useCallback(() => {
    setSelectedTrunks([]);
    trunkGridRef.current?.api?.deselectAll();
  }, []);

  // ─── Grid: 좌 그룹DN (단일선택) ───────────────────────────────────────────
  const gdnColumns = useMemo<ColDef<SipGdnResponse>[]>(
    () => [
      {
        headerName: '그룹DN 번호',
        field: 'gdnNo',
        minWidth: 110,
        maxWidth: 140,
        cellRenderer: (p: ICellRendererParams<SipGdnResponse>) => <span className="font-mono font-semibold text-gray-800">{p.value ?? ''}</span>,
      },
      { headerName: '그룹DN 이름', field: 'gdnName', flex: 1, minWidth: 140 },
      {
        headerName: '배정 트렁크',
        field: 'assignedTrunkCount',
        minWidth: 90,
        maxWidth: 110,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<SipGdnResponse>) => {
          const n = (p.value as number) ?? 0;
          return n > 0 ? (
            <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-1.5 py-px text-[10px] font-semibold text-green-700">{n}건</span>
          ) : (
            <span className="text-[11px] italic text-gray-400">—</span>
          );
        },
      },
      {
        headerName: '블록',
        field: 'blockYn',
        width: 70,
        maxWidth: 80,
        cellStyle: { textAlign: 'center' } as CellStyle,
        filterValueGetter: (p) => (p.data?.blockYn === 1 ? '사용' : '미사용'),
        cellRenderer: (p: ICellRendererParams<SipGdnResponse>) =>
          p.value === 1 ? (
            <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-px text-[10px] font-semibold text-red-700">사용</span>
          ) : (
            <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-600">미사용</span>
          ),
      },
      {
        headerName: '글로벌여부',
        field: 'globalDnYn',
        minWidth: 90,
        maxWidth: 100,
        cellStyle: { textAlign: 'center' } as CellStyle,
        filterValueGetter: (p) => BOOL_OX_LABEL(p.data?.globalDnYn),
        valueFormatter: (p) => BOOL_OX_LABEL(p.value),
      },
      {
        headerName: 'DR노드',
        field: 'backUpNodeName',
        minWidth: 80,
        maxWidth: 110,
        cellStyle: { textAlign: 'center', color: '#9ca3af' } as CellStyle,
        valueFormatter: (p) => p.value ?? '—',
        tooltipField: 'backUpNodeName',
      },
      // F-2: 차단/오류/만석 우회 DNIS 컬럼 (SWAT IPR20S3030 GDN_TYPE=18 정합)
      {
        headerName: '차단우회DNIS',
        field: 'blockRoutingDnis',
        minWidth: 100,
        maxWidth: 130,
        cellStyle: { fontFamily: 'monospace' } as CellStyle,
        valueFormatter: (p) => p.value ?? '—',
        tooltipField: 'blockRoutingDnis',
      },
      {
        headerName: '오류우회DNIS',
        field: 'errorRoutingDnis',
        minWidth: 100,
        maxWidth: 130,
        cellStyle: { fontFamily: 'monospace' } as CellStyle,
        valueFormatter: (p) => p.value ?? '—',
        tooltipField: 'errorRoutingDnis',
      },
      {
        headerName: '만석우회DNIS',
        field: 'busyRoutingDnis',
        minWidth: 100,
        maxWidth: 130,
        cellStyle: { fontFamily: 'monospace' } as CellStyle,
        valueFormatter: (p) => p.value ?? '—',
        tooltipField: 'busyRoutingDnis',
      },
    ],
    [],
  );

  // ag-Grid 34: rowSelection 은 gridOptions 밖 직접 prop — 의도적 단일선택(행=우측 패널 갱신, 벌크 없음 / AcdGdnList 정합)
  const gdnRowSelection = useMemo(() => ({ mode: 'singleRow' as const, checkboxes: false, enableClickSelection: true }), []);

  const gdnGridOptions = useMemo<GridOptions<SipGdnResponse>>(
    () => ({
      ...baseGridOptions,
      statusBar: undefined,
      sideBar: false,
      pagination: false,
      rowNumbers: false,
      defaultColDef: { sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true },
      getRowId: ({ data }) => String(data.gdnId),
      onRowClicked: (e) => {
        if (e.data) {
          setSelectedGdn(e.data);
          setSelectedTrunks([]);
        }
      },
      onRowDoubleClicked: (e) => {
        if (e.data) gdnDrawerRef.current?.openEdit(e.data);
      },
    }),
    [baseGridOptions],
  );

  // ─── Grid: 우 트렁크 (다중선택, 배정상태 맨 앞) ────────────────────────────
  const trunkColumns = useMemo<ColDef<SipTrunkMemberResponse>[]>(
    () => [
      {
        headerName: '배정상태',
        field: 'assignYn',
        width: 84,
        maxWidth: 92,
        cellStyle: { textAlign: 'center' } as CellStyle,
        filterValueGetter: (p) => (p.data?.assignYn ? '배정중' : '미배정'),
        cellRenderer: (p: ICellRendererParams<SipTrunkMemberResponse>) =>
          p.value ? (
            <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-1.5 py-px text-[10px] font-semibold text-green-700">배정중</span>
          ) : (
            <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-px text-[10px] font-semibold italic text-gray-400">미배정</span>
          ),
      },
      {
        headerName: 'SIP트렁크 이름',
        field: 'targetName',
        flex: 1,
        minWidth: 160,
        cellRenderer: (p: ICellRendererParams<SipTrunkMemberResponse>) => (
          <span className="font-semibold" style={{ color: p.data?.assignYn ? '#405189' : '#374151' }}>
            {p.value ?? ''}
          </span>
        ),
      },
      { headerName: '번호', field: 'targetNo', minWidth: 110, maxWidth: 140, cellStyle: { fontFamily: 'monospace' } as CellStyle, tooltipField: 'targetNo' },
      {
        headerName: 'DR노드',
        field: 'backUpNodeName',
        minWidth: 80,
        maxWidth: 110,
        cellStyle: { textAlign: 'center', color: '#9ca3af' } as CellStyle,
        valueFormatter: (p) => p.value ?? '—',
        tooltipField: 'backUpNodeName',
      },
      {
        headerName: '채널 사용률',
        field: 'totChannelCount',
        minWidth: 180,
        cellRenderer: (p: ICellRendererParams<SipTrunkMemberResponse>) => {
          const used = p.data?.totChannelCount ?? 0;
          const max = p.data?.chnlCnt ?? 0;
          const pct = max > 0 ? Math.min(Math.round((used / max) * 100), 100) : 0;
          const color = gaugeColor(used, max);
          return (
            <div className="flex items-center gap-1.5">
              <div className="h-[5px] min-w-[30px] flex-1 overflow-hidden rounded bg-gray-200">
                <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
              <span className="whitespace-nowrap text-[10.5px] font-semibold" style={{ color }}>
                {used}/{max} ({pct}%)
              </span>
            </div>
          );
        },
      },
      {
        headerName: '우선순위',
        field: 'memberPriority',
        width: 100,
        maxWidth: 110,
        filter: 'agNumberColumnFilter',
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (p) => (p.value == null ? '—' : String(p.value)),
      },
      {
        headerName: '배정채널',
        field: 'channelLimitCount',
        width: 100,
        maxWidth: 110,
        filter: 'agNumberColumnFilter',
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (p) => (p.value == null ? '—' : String(p.value)),
      },
    ],
    [],
  );

  const trunkRowSelection = useMemo(
    () => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, selectAll: 'filtered' as const, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );

  const trunkGridOptions = useMemo<GridOptions<SipTrunkMemberResponse>>(
    () => ({
      ...baseGridOptions,
      statusBar: undefined,
      sideBar: false,
      pagination: false,
      rowNumbers: false,
      defaultColDef: { sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true },
      getRowId: ({ data }) => String(data.sipTrunkId),
      isExternalFilterPresent: () => assignFilter !== 'all' || kindFilter !== '',
      doesExternalFilterPass: (node) => {
        const d = node.data as SipTrunkMemberResponse | undefined;
        if (!d) return true;
        const assignOk = assignFilter === 'all' || (assignFilter === 'assigned' && d.assignYn) || (assignFilter === 'unassigned' && !d.assignYn);
        return assignOk;
      },
      onSelectionChanged: (e) => setSelectedTrunks(e.api.getSelectedRows()),
      onRowDoubleClicked: (e) => {
        // 트렁크 마스터 상세를 받아 수정 Drawer 오픈 — 멤버 행에는 마스터 전체 필드가 없으므로 별도 조회 트리거.
        // ref 로 최신 마스터 목록을 참조해야 grid init 이후 생성된 행도 찾을 수 있다.
        if (e.data) {
          const master = allTrunksRef.current.find((t) => t.sipTrunkId === e.data!.sipTrunkId);
          if (master) trunkDrawerRef.current?.openEdit(master);
          else toast.info('트렁크 상세를 불러올 수 없습니다');
        }
      },
    }),
    [baseGridOptions, assignFilter, kindFilter],
  );

  // 외부 필터 변경 반영
  useEffect(() => {
    trunkGridRef.current?.api?.onFilterChanged();
  }, [assignFilter, kindFilter]);

  // 종류 필터는 클라이언트 측에서 rowData 분기 (멤버에는 kind 없음 → 마스터 join)
  const memberRows = useMemo(() => {
    if (!kindFilter) return members;
    const kindMap = new Map(allTrunks.map((t) => [t.sipTrunkId, t.sipTrunkKindName ?? getSipTrunkKindName(t.sipTrunkKind)]));
    return members.filter((m) => kindMap.get(m.sipTrunkId) === kindFilter);
  }, [members, kindFilter, allTrunks]);

  const selectedNode = nodes.find((n) => n.nodeId === selectedNodeId);
  const selectedTenant = assignedTenants.find((t) => t.tenantId === selectedTenantId);
  const contextLabel = `${selectedNode?.nodeName ?? '-'} · ${selectedTenant?.tenantName ?? '전체'}`;
  const drNodeOptions = useMemo(() => nodes.filter((n) => n.nodeId !== selectedNodeId), [nodes, selectedNodeId]);

  const totalNodeSummary = useMemo(() => {
    const s = nodeSummaries.find((x) => x.nodeId === selectedNodeId);
    return s ?? null;
  }, [nodeSummaries, selectedNodeId]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col gap-3">
      {/* 박스1: 노드 탭바 */}
      <div className="bg-white bt-shadow flex-shrink-0 overflow-hidden">
        <div className="flex h-[56px] items-stretch pr-3">
          <button
            type="button"
            onClick={toggleViewMode}
            title={`현재: 탭=${viewMode === 'byNode' ? '노드' : '테넌트'} / 카드=${viewMode === 'byNode' ? '테넌트' : '노드'}. 클릭 시 전환`}
            className="flex w-[44px] flex-shrink-0 cursor-pointer flex-col items-center justify-center border-r border-gray-200 transition-colors hover:bg-blue-50"
          >
            {viewMode === 'byNode' ? <Network size={14} className="text-blue-600" /> : <Building2 size={14} className="text-blue-600" />}
            <ArrowUpDown size={12} className="my-0.5 text-blue-500" />
            {viewMode === 'byNode' ? <Building2 size={14} className="text-gray-500" /> : <Network size={14} className="text-gray-500" />}
          </button>

          <button
            type="button"
            className="flex w-8 flex-shrink-0 cursor-pointer items-center justify-center border-r border-gray-200 hover:bg-gray-100"
            onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
            aria-label="이전 탭"
          >
            <ChevronLeft className="size-4 text-gray-500" />
          </button>

          <div
            ref={tabScrollRef}
            className="flex min-w-0 max-w-[800px] items-stretch divide-x divide-gray-200 overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {tabItems.map((item) => {
              const current = viewMode === 'byNode' ? selectedNodeId : selectedTenantId;
              const isActive = current === item.id;
              const Icon = viewMode === 'byNode' ? Network : Building2;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`-mb-[1px] flex w-[120px] flex-shrink-0 cursor-pointer items-center justify-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    isActive ? 'border-b-current bg-blue-50 text-blue-700' : 'border-b-transparent text-gray-500 hover:text-gray-700'
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
            className="flex w-8 flex-shrink-0 cursor-pointer items-center justify-center border-l border-r border-gray-200 hover:bg-gray-100"
            onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            aria-label="다음 탭"
          >
            <ChevronRight className="size-4 text-gray-500" />
          </button>

          <div className="ml-auto flex flex-shrink-0 items-center gap-2 pl-3">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="트렁크/그룹DN 검색"
              value={topSearch}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setTopSearch(e.target.value);
                setGdnSearch(e.target.value);
              }}
              style={{ width: 200 }}
            />
          </div>
        </div>
      </div>

      {/* 박스2: 테넌트 카드 슬라이더 */}
      <div className="bg-white bt-shadow flex-shrink-0 overflow-hidden">
        {cardExpanded ? (
          <div className="flex h-[140px] items-center px-4 py-3">
            <div className="relative flex w-full items-center gap-2">
              <Button
                type="text"
                icon={<ChevronLeft className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                className="!h-8 !w-8 !flex-shrink-0 !p-0"
              />
              <div ref={cardScrollRef} className="flex flex-1 gap-3 overflow-x-auto px-1 py-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {cardStats.length === 0 ? (
                  <div className="flex min-h-[100px] flex-1 flex-col items-center justify-center gap-2 text-gray-400">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">등록된 트렁크가 없습니다</span>
                  </div>
                ) : (
                  cardStats.map((g) => {
                    const pct = g.totalChnl > 0 ? Math.round((g.usedChnl / g.totalChnl) * 100) : 0;
                    const color = gaugeColor(g.usedChnl, g.totalChnl);
                    const selected = selectedCardId === g.id;
                    return (
                      <div
                        key={g.id}
                        onClick={(e) => {
                          setSelectedCardId(g.id);
                          (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                        className={`flex h-[100px] w-[240px] flex-shrink-0 cursor-pointer flex-col rounded-lg border bg-white p-3 transition-all ${
                          selected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-1.5">
                          <Building2 className={`size-3.5 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
                          <span className={`truncate text-[13px] font-semibold ${selected ? 'text-[#405189]' : 'text-gray-800'}`} title={g.name}>
                            {g.name}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col gap-0.5 text-xs text-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">전체 트렁크</span>
                            <span className="font-semibold text-gray-800">{g.trunkCnt.toLocaleString()}건</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">채널 사용</span>
                            <span className="font-medium" style={{ color }}>
                              {g.usedChnl.toLocaleString()} / {g.totalChnl.toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <div className="h-[5px] flex-1 overflow-hidden rounded bg-gray-200">
                              <div className="h-full rounded" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
                            </div>
                            <span className="font-medium" style={{ color }}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <Button
                type="text"
                icon={<ChevronRight className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                className="!h-8 !w-8 !flex-shrink-0 !p-0"
              />
              <Button
                type="text"
                icon={<ChevronsUp className="size-4" />}
                onClick={() => setCardExpanded(false)}
                title="카드 접기"
                className="!h-8 !w-8 !flex-shrink-0 !p-0 !text-gray-400 hover:!text-[#405189]"
              />
            </div>
          </div>
        ) : (
          <div className="flex h-[44px] items-center px-4">
            <div className="flex w-full items-center gap-2">
              <div className="flex flex-1 items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {cardStats.map((g) => {
                  const selected = selectedCardId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedCardId(g.id)}
                      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                        selected
                          ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
                      }`}
                    >
                      <span className="max-w-[120px] truncate font-medium">{g.name}</span>
                      <span className={`text-[11px] ${selected ? 'text-white/80' : 'text-gray-400'}`}>{g.trunkCnt}</span>
                    </button>
                  );
                })}
              </div>
              <Button
                type="text"
                icon={<ChevronsDown className="size-4" />}
                onClick={() => setCardExpanded(true)}
                title="카드 펼치기"
                className="!h-8 !w-8 !flex-shrink-0 !p-0 !text-gray-400 hover:!text-[#405189]"
              />
            </div>
          </div>
        )}
      </div>

      {/* 박스3: 메인 2-패널 */}
      <PanelGroup direction="horizontal" className="min-h-0 flex-1">
        {/* 좌 패널: 그룹DN */}
        <Panel defaultSize={42} minSize={25}>
          <div className="bg-white bt-shadow flex h-full flex-col overflow-hidden">
            <div className="flex h-[44px] flex-shrink-0 items-center gap-2 border-b border-gray-100 px-4">
              <LayoutGrid className="size-3.5 text-[#405189]" />
              <span className="text-sm font-semibold text-gray-700">그룹DN</span>
              <span className="text-xs text-gray-500">
                총 <b>{gdns.length}건</b>
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Input
                  size="small"
                  allowClear
                  prefix={<Search className="size-3.5 text-gray-400" />}
                  placeholder="그룹DN 검색"
                  value={gdnSearch}
                  onChange={(e) => setGdnSearch(e.target.value)}
                  style={{ width: 140 }}
                />
                <Button size="small" type="primary" icon={<Plus className="size-3" />} onClick={() => gdnDrawerRef.current?.openCreate()}>
                  그룹DN 등록
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<Trash2 className="size-3" />}
                  disabled={!selectedGdn}
                  title={!selectedGdn ? '삭제할 그룹DN을 선택하세요' : `"${selectedGdn.gdnNo}" 삭제`}
                  onClick={() => handleGdnDelete()}
                >
                  삭제
                </Button>
              </div>
            </div>
            <div className="flex h-[34px] flex-shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 text-[11.5px] font-semibold text-gray-500">
              <Network className="size-3" />
              {contextLabel}
              <span className="ml-auto font-normal text-gray-400">총 {gdns.length}건</span>
            </div>
            <div className="ag-theme-quartz min-h-0 flex-1">
              <AgGridReact<SipGdnResponse> rowData={gdns} columnDefs={gdnColumns} gridOptions={gdnGridOptions} rowSelection={gdnRowSelection} loading={gdnsLoading} />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1.5 flex-shrink-0 cursor-col-resize bg-gray-100 transition-colors hover:bg-[#c5cbe0] active:bg-[#405189]" />

        {/* 우 패널: SIP 트렁크 풀 */}
        <Panel defaultSize={58} minSize={30}>
          <div className="bg-white bt-shadow flex h-full flex-col overflow-hidden">
            <div className="flex h-[44px] flex-shrink-0 items-center gap-2 border-b border-gray-100 px-4">
              <Cable className="size-3.5 text-[#405189]" />
              <span className="text-sm font-semibold text-gray-700">SIP 트렁크</span>
              <span className="text-xs text-gray-500">
                {contextLabel} · 총 <b>{memberRows.length}건</b>
                {selectedGdn && <span className="ml-2 text-[11px] text-amber-600">· 그룹DN {selectedGdn.gdnNo} 기준 기배정/미배정</span>}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="flex items-center gap-0.5 rounded bg-gray-100 p-0.5">
                  {(['all', 'assigned', 'unassigned'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAssignFilter(f)}
                      className={`h-6 rounded px-2.5 text-xs transition ${assignFilter === f ? 'bg-[#405189] text-white' : 'text-gray-600 hover:text-[#405189]'}`}
                    >
                      {f === 'all' ? '전체' : f === 'assigned' ? '기배정' : '미배정'}
                    </button>
                  ))}
                </div>
                <Select
                  size="small"
                  value={kindFilter}
                  onChange={setKindFilter}
                  style={{ width: 120 }}
                  options={[
                    { value: '', label: '전체 종류' },
                    { value: 'IPRON-IE', label: 'IPRON-IE' },
                    { value: '3rd party PBX', label: '외부 교환기(PBX)' },
                  ]}
                />
                <Button size="small" type="primary" icon={<Plus className="size-3" />} onClick={() => trunkDrawerRef.current?.openCreate()}>
                  트렁크 등록
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<Trash2 className="size-3" />}
                  disabled={selectedTrunks.length === 0}
                  title={selectedTrunks.length === 0 ? '삭제할 트렁크를 선택하세요' : `선택한 ${selectedTrunks.length}건 삭제`}
                  onClick={() => handleTrunkDeleteSelected(selectedTrunks)}
                >
                  삭제
                </Button>
              </div>
            </div>
            <div className="flex h-[34px] flex-shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 text-[11.5px] font-semibold text-gray-500">
              <Cable className="size-3" />
              {contextLabel}
              <span className="ml-auto font-normal text-gray-400">
                노드당 최대 128개{totalNodeSummary ? ` · 채널 ${totalNodeSummary.usedChnl}/${totalNodeSummary.totalChnl}` : ''}
              </span>
            </div>
            <div className="ag-theme-quartz min-h-0 flex-1">
              {selectedGdn ? (
                <AgGridReact<SipTrunkMemberResponse>
                  ref={trunkGridRef}
                  rowData={memberRows}
                  columnDefs={trunkColumns}
                  gridOptions={trunkGridOptions}
                  rowSelection={trunkRowSelection}
                  loading={membersLoading}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                  <Cable className="size-10 text-gray-200" />
                  <span className="text-sm">좌측 그룹DN을 선택하세요</span>
                  <span className="text-xs">선택한 그룹DN 기준으로 트렁크 배정 현황이 표시됩니다</span>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>

      {/* floating bulk-bar — 항상 렌더, 선택 없을 때 버튼별 disabled + opacity */}
      <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-700/90 px-4 py-2.5 text-sm text-[#e2e8f0] shadow-xl">
        <span className="flex items-center gap-1.5">
          <LayoutGrid className="size-3.5" />
          <span className="text-xs text-[#94a3b8]">그룹DN</span>
          <span className={`min-w-[28px] rounded-full px-2 py-0.5 text-center font-bold ${selectedGdn ? 'bg-[#405189]' : 'bg-slate-600'}`}>{selectedGdn ? 1 : 0}</span>
        </span>
        <span className="text-[#94a3b8]">×</span>
        <span className="flex items-center gap-1.5">
          <Cable className="size-3.5" />
          <span className="text-xs text-[#94a3b8]">트렁크</span>
          <span className={`min-w-[28px] rounded-full px-2 py-0.5 text-center font-bold ${selectedTrunks.length > 0 ? 'bg-[#405189]' : 'bg-slate-600'}`}>
            {selectedTrunks.length}
          </span>
        </span>
        <Button
          type="primary"
          icon={<Plus className="size-3.5" />}
          disabled={!selectedGdn || selectedTrunks.length === 0}
          style={{ opacity: selectedGdn && selectedTrunks.length > 0 ? 1 : 0.38 }}
          onClick={() => setAssignDrawerOpen(true)}
        >
          배정 (우선순위·채널수 입력)
        </Button>
        <Button
          danger
          icon={<Trash2 className="size-3.5" />}
          disabled={!selectedGdn || selectedTrunks.length === 0}
          style={{ opacity: selectedGdn && selectedTrunks.length > 0 ? 1 : 0.38 }}
          onClick={() => handleRevoke()}
        >
          해제
        </Button>
        <Button
          type="text"
          disabled={selectedTrunks.length === 0}
          style={{ color: '#e2e8f0', opacity: selectedTrunks.length > 0 ? 1 : 0.38 }}
          onClick={clearSelection}
          className="hover:!text-white"
        >
          선택 해제
        </Button>
      </div>

      {/* Drawers */}
      <SipGdnDrawer ref={gdnDrawerRef} nodeId={selectedNodeId} tenantId={selectedTenantId} drNodeOptions={drNodeOptions} />
      <SipTrunkDrawer ref={trunkDrawerRef} nodeId={selectedNodeId} tenantId={selectedTenantId} tenantName={selectedTenant?.tenantName ?? null} drNodeOptions={drNodeOptions} />
      <SipTrunkAssignDrawer
        open={assignDrawerOpen}
        gdnId={selectedGdn?.gdnId ?? null}
        gdnLabel={selectedGdn ? `그룹DN ${selectedGdn.gdnNo} ${selectedGdn.gdnName}` : ''}
        trunks={selectedTrunks}
        onClose={() => setAssignDrawerOpen(false)}
        onSuccess={() => {
          setSelectedTrunks([]);
          trunkGridRef.current?.api?.deselectAll();
        }}
      />
    </div>
  );
}
