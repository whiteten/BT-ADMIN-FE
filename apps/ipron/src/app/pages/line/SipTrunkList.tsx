/**
 * SIP 트렁크(테넌트) 관리 페이지 (SWAT IPR20S3030, GDN_TYPE=18).
 *
 * 멀티테넌트 개편(상담사 관리 정합): 노드 탭바 + 테넌트 카드 슬라이더 → 노드 Select + 테넌트 ScopeSelect + 요약.
 *  - 박스A: 헤더 — 노드 Select(필수) + 테넌트 ScopeSelect(공통[0] 포함, 클라이언트 필터) + 요약(그룹DN/트렁크/채널).
 *  - 박스B: 메인 2-패널 (좌 그룹DN 단일선택 / 우 SIP 트렁크 다중선택 — N:N 데이터, 1:N 행위)
 *  - floating bulk-bar: 그룹DN 1 × 트렁크 N → 배정 / 해제 / 선택 해제
 *
 * 우 패널은 선택된 그룹DN 기준 멤버 풀(배정중/미배정)을 노출. 그룹DN 미선택 시 안내.
 * 데이터: 선택 노드 단위 조회 후 테넌트/검색은 클라이언트 필터.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { CellStyle, ColDef, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact, type AgGridReact as AgGridReactType } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import { Cable, LayoutGrid, Network, Plus, Search, Trash2 } from 'lucide-react';
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
import { type SipGdnResponse, type SipTrunkMemberResponse, getSipTrunkKindName } from '../../features/sip-trunk/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
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
  const trunkGridRef = useRef<AgGridReactType<SipTrunkMemberResponse>>(null);
  const hasInitNodeRef = useRef(false);

  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null); // null=전체(클라이언트 필터)
  const [topSearch, setTopSearch] = useState('');
  const [gdnSearch, setGdnSearch] = useState('');
  const [selectedGdn, setSelectedGdn] = useState<SipGdnResponse | null>(null);
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('all');
  const [kindFilter, setKindFilter] = useState<string>('');
  const [selectedTrunks, setSelectedTrunks] = useState<SipTrunkMemberResponse[]>([]);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  // 교차테넌트 방지: SIP GDN row 선택 시 그 tenantId 로 트렁크 멤버 풀을 좁힘. 선택 해제 시 null(전체 복귀).
  const [lockedTenantId, setLockedTenantId] = useState<number | null>(null);

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

  // 그룹DN 미선택 시 통계용 — 노드 전체 트렁크 목록
  const { data: allTrunks = [] } = useGetSipTrunks({ params: selectedNodeId ? { nodeId: selectedNodeId, tenantScope: 'tenant' } : { tenantScope: 'tenant' } });

  // ag-Grid 는 grid 레벨 이벤트 콜백(onRowDoubleClicked)을 마운트 시 1회 바인딩하므로
  // memoized gridOptions 가 바뀌어도 재등록하지 않는다 → 클로저가 init 시점 배열에 고정됨.
  // 갓 생성한 행도 최신 마스터에서 찾을 수 있도록 ref 로 최신 배열을 항상 노출.
  const allTrunksRef = useRef(allTrunks);
  allTrunksRef.current = allTrunks;

  // ─── Derived: 노드 옵션 ─────────────────────────────────────────────────────
  const assignedNodes = useMemo(() => {
    const ids = new Set(nodeTenants.map((nt) => nt.nodeId));
    const filtered = nodes.filter((n) => ids.has(n.nodeId));
    return filtered.length > 0 ? filtered : nodes;
  }, [nodes, nodeTenants]);

  // ─── Derived: 테넌트 필터 옵션 (로드된 그룹DN 기준 distinct + 그룹DN 수) ────────────
  const tenantOptions = useMemo(() => {
    const map = new Map<number, { id: number; name: string; count: number }>();
    for (const g of gdns) {
      if (g.tenantId == null) continue;
      if (!map.has(g.tenantId)) {
        map.set(g.tenantId, { id: g.tenantId, name: g.tenantId === 0 ? '공통' : (g.tenantName ?? `테넌트 ${g.tenantId}`), count: 0 });
      }
      map.get(g.tenantId)!.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => (a.id === 0 ? -1 : b.id === 0 ? 1 : a.name.localeCompare(b.name)));
  }, [gdns]);

  // ─── Derived: 그리드 표시용 그룹DN (테넌트 클라이언트 필터) ────────────────────────
  const gdnsForGrid = useMemo(() => (selectedTenantId == null ? gdns : gdns.filter((g) => g.tenantId === selectedTenantId)), [gdns, selectedTenantId]);

  // ─── Auto-select 첫 노드 ──────────────────────────────────────────────────
  useEffect(() => {
    if (assignedNodes.length > 0 && !hasInitNodeRef.current && selectedNodeId == null) {
      hasInitNodeRef.current = true;
      setSelectedNodeId(assignedNodes[0].nodeId);
    }
  }, [assignedNodes, selectedNodeId]);

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

  // 트렁크 선택이 모두 해제되면 lockedTenantId 를 해제
  // 단, GDN이 선택된 상태에서는 GDN 기준 잠금을 유지한다(교차테넌트 누출 방지)
  useEffect(() => {
    if (selectedTrunks.length === 0 && selectedGdn === null) {
      setLockedTenantId(null);
    }
  }, [selectedTrunks, selectedGdn]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeChange = useCallback((nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedTenantId(null);
    setTopSearch('');
    setGdnSearch('');
    setSelectedGdn(null);
    setSelectedTrunks([]);
    setLockedTenantId(null);
  }, []);

  const handleTenantChange = useCallback((id: string | null) => {
    setSelectedTenantId(id == null ? null : Number(id));
    setSelectedGdn(null);
    setSelectedTrunks([]);
    setLockedTenantId(null);
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

  // ─── Create 가드 (노드·테넌트 컨텍스트 필수) ────────────────────────────────────
  const handleGdnCreate = useCallback(() => {
    if (selectedNodeId == null) {
      toast.warning('노드를 먼저 선택하세요');
      return;
    }
    if (selectedTenantId == null) {
      toast.warning('대상 테넌트를 먼저 선택하세요');
      return;
    }
    gdnDrawerRef.current?.openCreate();
  }, [selectedNodeId, selectedTenantId]);

  const handleTrunkCreate = useCallback(() => {
    if (selectedNodeId == null) {
      toast.warning('노드를 먼저 선택하세요');
      return;
    }
    if (selectedTenantId == null) {
      toast.warning('대상 테넌트를 먼저 선택하세요');
      return;
    }
    trunkDrawerRef.current?.openCreate();
  }, [selectedNodeId, selectedTenantId]);

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
          // 전체보기에서 SIP GDN 선택 시 그 tenantId 로 트렁크 멤버 풀 잠금.
          setLockedTenantId(e.data.tenantId ?? null);
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
        width: 96,
        maxWidth: 106,
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

  // 종류 필터 + 테넌트 잠금 필터는 클라이언트 측에서 rowData 분기 (멤버에는 kind 없음 → 마스터 join)
  // lockedTenantId: 전체보기에서 SIP GDN 선택 시 그 tenantId 의 트렁크만 표시 (교차테넌트 배정 방지).
  const memberRows = useMemo(() => {
    let rows = members;
    if (lockedTenantId != null) {
      rows = rows.filter((m) => m.tenantId === lockedTenantId);
    }
    if (!kindFilter) return rows;
    const kindMap = new Map(allTrunks.map((t) => [t.sipTrunkId, t.sipTrunkKindName ?? getSipTrunkKindName(t.sipTrunkKind)]));
    return rows.filter((m) => kindMap.get(m.sipTrunkId) === kindFilter);
  }, [members, kindFilter, allTrunks, lockedTenantId]);

  const selectedNode = nodes.find((n) => n.nodeId === selectedNodeId);
  const selectedTenant = tenantOptions.find((t) => t.id === selectedTenantId) ?? null;
  const contextLabel = `${selectedNode?.nodeName ?? '-'} · ${selectedTenant?.name ?? '전체'}`;
  const drNodeOptions = useMemo(() => nodes.filter((n) => n.nodeId !== selectedNodeId), [nodes, selectedNodeId]);

  const totalNodeSummary = useMemo(() => {
    const s = nodeSummaries.find((x) => x.nodeId === selectedNodeId);
    return s ?? null;
  }, [nodeSummaries, selectedNodeId]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col gap-3">
      {/* ===== 박스A: 헤더 (노드 Select + 테넌트 ScopeSelect + 요약) ===== */}
      <div className="bg-white bt-shadow flex-shrink-0 overflow-hidden">
        <div className="flex h-[56px] items-center gap-3 px-4">
          {/* 노드 선택 (SIP 트렁크는 노드 단위 — 필수) */}
          <div className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-200 bg-white pl-2">
            <Network className="size-3.5 shrink-0 text-blue-600" />
            <Select
              size="small"
              variant="borderless"
              value={selectedNodeId ?? undefined}
              onChange={handleNodeChange}
              placeholder="노드 선택"
              options={assignedNodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))}
              style={{ width: 150 }}
              popupMatchSelectWidth={false}
            />
          </div>
          {/* 테넌트 필터 (공통 포함, 클라이언트 필터) */}
          <ScopeSelect
            kind="tenant"
            options={tenantOptions.map((t) => ({ id: t.id, name: t.name, count: t.count }))}
            value={selectedTenantId == null ? null : String(selectedTenantId)}
            onChange={handleTenantChange}
          />
          {/* 요약 — 그룹DN / 트렁크 / 채널 */}
          <div className="ml-1 flex items-center gap-4 border-l border-gray-200 pl-3 text-[13px]">
            <span className="text-gray-500">
              그룹DN <b className="font-semibold text-gray-800">{gdnsForGrid.length.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              트렁크 <b className="font-semibold text-[#405189]">{allTrunks.length.toLocaleString()}</b>
            </span>
            {totalNodeSummary && (
              <span className="text-gray-500">
                채널{' '}
                <b className="font-semibold" style={{ color: gaugeColor(totalNodeSummary.usedChnl, totalNodeSummary.totalChnl) }}>
                  {totalNodeSummary.usedChnl}/{totalNodeSummary.totalChnl}
                </b>
              </span>
            )}
          </div>
          <div className="ml-auto flex flex-shrink-0 items-center gap-2">
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

      {/* ===== 박스B: 메인 2-패널 ===== */}
      <PanelGroup direction="horizontal" className="min-h-0 flex-1">
        {/* 좌 패널: 그룹DN */}
        <Panel defaultSize={42} minSize={25}>
          <div className="bg-white bt-shadow flex h-full flex-col overflow-hidden">
            <div className="flex h-[44px] flex-shrink-0 items-center gap-2 border-b border-gray-100 px-4">
              <LayoutGrid className="size-3.5 text-[#405189]" />
              <span className="text-sm font-semibold text-gray-700">그룹DN</span>
              <span className="text-xs text-gray-500">
                총 <b>{gdnsForGrid.length}건</b>
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
                <Button size="small" type="primary" icon={<Plus className="size-3" />} onClick={handleGdnCreate}>
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
              <span className="ml-auto font-normal text-gray-400">총 {gdnsForGrid.length}건</span>
            </div>
            <div className="ag-theme-quartz min-h-0 flex-1">
              <AgGridReact<SipGdnResponse> rowData={gdnsForGrid} columnDefs={gdnColumns} gridOptions={gdnGridOptions} rowSelection={gdnRowSelection} loading={gdnsLoading} />
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
                <Button size="small" type="primary" icon={<Plus className="size-3" />} onClick={handleTrunkCreate}>
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
      <SipTrunkDrawer ref={trunkDrawerRef} nodeId={selectedNodeId} tenantId={selectedTenantId} tenantName={selectedTenant?.name ?? null} drNodeOptions={drNodeOptions} />
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
