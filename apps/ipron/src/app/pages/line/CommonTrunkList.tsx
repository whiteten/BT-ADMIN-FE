/**
 * 공용 트렁크 관리 (노드 공용 — 테넌트 차원 없음) — SWAT IPR20S3030 tenant=공통/0 케이스.
 *
 * 레이아웃 (mockup: ipron-common-trunk/mockups/common-trunk.html 1:1):
 *  - 박스1: 노드 탭바(노드 단위 고정) + 검색/엑셀/가져오기
 *  - 박스2: 2-그리드 — 좌(공용 그룹DN, 단일선택) + 우(SIP 트렁크, 다중선택 N:N)
 *  - 좌·우 그리드 모두 "노드" 컬럼 없음 (노드 탭으로 단일 노드 컨텍스트)
 *  - 우 그리드: 배정상태 맨앞 + 전체/기배정/미배정 세그먼트 + 종류 필터 + 채널 게이지
 *  - 행 더블클릭 → Drawer (GDN/트렁크 수정)
 *  - 하단 Bulk Action Bar: 선택 GDN + 선택 트렁크 → 배정/해제
 *
 * BE: SIP 트렁크 BE 100% 공유 + tenantScope=common 고정 (TENANT_ID=0).
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { CellStyle, ColDef, GridOptions } from 'ag-grid-community';
import { AgGridReact, type AgGridReact as AgGridReactType } from 'ag-grid-react';
import { Button, Input, Modal, Select, Tag } from 'antd';
import { ChevronLeft, ChevronRight, Network, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CommonGdnFormDrawer from '../../features/common-trunk/components/CommonGdnFormDrawer';
import CommonTrunkAssignDrawer from '../../features/common-trunk/components/CommonTrunkAssignDrawer';
import CommonTrunkFormDrawer from '../../features/common-trunk/components/CommonTrunkFormDrawer';
import {
  useDeleteCommonGdns,
  useDeleteCommonTrunks,
  useGetCommonGdns,
  useGetCommonTrunkMembers,
  useGetCommonTrunkNodes,
  useGetCommonTrunks,
  useSaveCommonTrunkMembers,
} from '../../features/common-trunk/hooks/useCommonTrunkQueries';
import {
  type AssignFilter,
  type CommonGdnResponse,
  type CommonTrunkMemberResponse,
  type CommonTrunkNodeSummary,
  type CommonTrunkResponse,
  getTrunkKindName,
} from '../../features/common-trunk/types';
import { BOOL_OX_LABEL } from '../../features/dn/utils/dnEnums';
import { useGetDnProfileNodes } from '../../features/dn-profile/hooks/useDnProfileQueries';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [{ title: '번호자원관리' }, { title: '교환기 번호관리' }, { title: '공용 SIP TRUNK', path: '/ipron/line/common-trunk' }];

// ─── 채널 게이지 렌더러 ──────────────────────────────────────────────
function gaugeColor(pct: number): string {
  return pct < 60 ? '#16a34a' : pct <= 85 ? '#f59e0b' : '#dc2626';
}

export default function CommonTrunkList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions: baseGridOptions } = useAggridOptions();

  const nodeTabScrollRef = useRef<HTMLDivElement>(null);
  const gdnGridRef = useRef<AgGridReactType<CommonGdnResponse>>(null);
  const trunkGridRef = useRef<AgGridReactType<CommonTrunkMemberResponse>>(null);

  // ─── State ──────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [gdnSearch, setGdnSearch] = useState('');
  const [gdnQuickFilter, setGdnQuickFilter] = useState('');
  const [trunkSearch, setTrunkSearch] = useState('');
  const [trunkQuickFilter, setTrunkQuickFilter] = useState('');
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('all');
  const [kindFilter, setKindFilter] = useState<number | ''>('');

  const gdnDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trunkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedGdn, setSelectedGdn] = useState<CommonGdnResponse | null>(null);
  const [selectedTrunks, setSelectedTrunks] = useState<CommonTrunkMemberResponse[]>([]);

  // Drawers
  const [gdnDrawer, setGdnDrawer] = useState<{ open: boolean; mode: 'create' | 'edit'; detail: CommonGdnResponse | null }>({ open: false, mode: 'create', detail: null });
  const [trunkDrawer, setTrunkDrawer] = useState<{ open: boolean; mode: 'create' | 'edit'; detail: CommonTrunkResponse | null }>({
    open: false,
    mode: 'create',
    detail: null,
  });
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);

  // ─── Queries ────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetCommonTrunkNodes();
  // 전체 노드 마스터 — 공용 트렁크 0건 노드도 탭으로 노출하기 위함
  const { data: masterNodes = [] } = useGetDnProfileNodes();
  const { data: gdns = [], isLoading: gdnsLoading } = useGetCommonGdns(selectedNodeId, gdnQuickFilter || undefined);
  // 노드 전체 트렁크 마스터 — GDN 미선택 안내 / 종류필터 join / 더블클릭 수정용
  const { data: trunks = [], isLoading: trunksLoading } = useGetCommonTrunks(selectedNodeId);

  // 우 그리드: 선택 그룹DN 기준 멤버 풀 (배정중/미배정) — SIP SipTrunkList 정합
  const { data: members = [], isLoading: membersLoading } = useGetCommonTrunkMembers(selectedGdn?.gdnId ?? null, selectedNodeId, assignFilter);

  // ag-Grid 더블클릭 콜백은 마운트 시 1회 바인딩 → 최신 마스터 배열을 ref 로 노출
  const trunksRef = useRef(trunks);
  trunksRef.current = trunks;

  // 노드 탭 목록 — 전체 노드 마스터 기준 (공용 트렁크 0건 노드도 표기).
  // 마스터 노드를 시드로 깔고, 공용 트렁크 요약(nodes)이 있으면 데이터 보강.
  const nodeTabs = useMemo<CommonTrunkNodeSummary[]>(() => {
    const summaryMap = new Map<number, CommonTrunkNodeSummary>();
    for (const n of nodes) {
      if (n.nodeId != null) summaryMap.set(n.nodeId, n);
    }
    return masterNodes.map<CommonTrunkNodeSummary>((m) => {
      const summary = summaryMap.get(m.nodeId);
      return summary ?? { nodeId: m.nodeId, nodeName: m.nodeName, trunkCount: 0, totalChnl: 0, usedChnl: 0, blockedCount: 0 };
    });
  }, [masterNodes, nodes]);

  // 첫 노드 자동 선택
  useEffect(() => {
    if (selectedNodeId == null && nodeTabs.length > 0) {
      setSelectedNodeId(nodeTabs[0].nodeId as number);
    }
  }, [nodeTabs, selectedNodeId]);

  const selectedNodeName = useMemo(() => nodeTabs.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? '', [nodeTabs, selectedNodeId]);

  const nodeOptions = useMemo(() => nodeTabs.map((n) => ({ value: n.nodeId as number, label: n.nodeName ?? String(n.nodeId) })), [nodeTabs]);

  // ─── Mutations ──────────────────────────────────────────────────────
  const { mutate: deleteGdns } = useDeleteCommonGdns({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹DN 이 삭제되었습니다');
        setSelectedGdn(null);
      },
      onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패'),
    },
  });

  const { mutate: deleteTrunks } = useDeleteCommonTrunks({
    mutationOptions: {
      onSuccess: () => {
        toast.success('트렁크가 삭제되었습니다');
        setSelectedTrunks([]);
      },
      onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패'),
    },
  });

  const { mutate: saveMembers } = useSaveCommonTrunkMembers({
    mutationOptions: {
      onSuccess: () => {
        toast.success('해제되었습니다');
        setSelectedTrunks([]);
        trunkGridRef.current?.api?.deselectAll();
      },
      onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '해제 실패'),
    },
  });

  // ─── Search 디바운스 ─────────────────────────────────────────────────
  const handleGdnSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGdnSearch(val);
    if (gdnDebounceRef.current) clearTimeout(gdnDebounceRef.current);
    gdnDebounceRef.current = setTimeout(() => setGdnQuickFilter(val), 250);
  }, []);

  const handleTrunkSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTrunkSearch(val);
    if (trunkDebounceRef.current) clearTimeout(trunkDebounceRef.current);
    trunkDebounceRef.current = setTimeout(() => setTrunkQuickFilter(val), 250);
  }, []);

  // 종류 필터용 — sipTrunkId → 종류(kind) 매핑 (멤버에는 kind 없음 → 마스터 join)
  const trunkKindMap = useMemo(() => new Map(trunks.map((t) => [t.sipTrunkId, t.sipTrunkKind])), [trunks]);

  const trunkRowSelection = useMemo(
    () => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );

  // ─── 외부 필터 (배정상태 세그먼트 + 종류) — 멤버 기준 ─────────────────
  const trunkGridOptions = useMemo<GridOptions<CommonTrunkMemberResponse>>(
    () => ({
      ...baseGridOptions,
      statusBar: undefined,
      sideBar: false,
      pagination: false,
      rowNumbers: false,
      defaultColDef: { resizable: true, sortable: true, filter: false, suppressHeaderMenuButton: true },
      getRowId: ({ data }) => String(data.sipTrunkId),
      isExternalFilterPresent: () => assignFilter !== 'all' || kindFilter !== '',
      doesExternalFilterPass: (node) => {
        const d = node.data;
        if (!d) return true;
        const assignOk = assignFilter === 'all' || (assignFilter === 'assigned' && d.assignYn) || (assignFilter === 'unassigned' && !d.assignYn);
        const kindOk = kindFilter === '' || trunkKindMap.get(d.sipTrunkId) === kindFilter;
        return assignOk && kindOk;
      },
      onRowDoubleClicked: (e) => {
        // 멤버 행에는 마스터 전체 필드가 없으므로 최신 마스터에서 찾아 수정 Drawer 오픈
        if (e.data) {
          const master = trunksRef.current.find((t) => t.sipTrunkId === e.data!.sipTrunkId);
          if (master) setTrunkDrawer({ open: true, mode: 'edit', detail: master });
          else toast.info('트렁크 상세를 불러올 수 없습니다');
        }
      },
      onSelectionChanged: (e) => setSelectedTrunks(e.api.getSelectedRows()),
    }),
    [baseGridOptions, assignFilter, kindFilter, trunkKindMap],
  );

  useEffect(() => {
    trunkGridRef.current?.api?.onFilterChanged();
  }, [assignFilter, kindFilter]);

  const gdnGridOptions = useMemo<GridOptions<CommonGdnResponse>>(
    () => ({
      ...baseGridOptions,
      statusBar: undefined,
      sideBar: false,
      pagination: false,
      rowNumbers: false,
      rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
      defaultColDef: { resizable: true, sortable: true, filter: false, suppressHeaderMenuButton: true },
      getRowId: ({ data }) => String(data.gdnId),
      onRowDoubleClicked: (e) => {
        if (e.data) setGdnDrawer({ open: true, mode: 'edit', detail: e.data });
      },
      onSelectionChanged: (e) => {
        const rows = e.api.getSelectedRows();
        setSelectedGdn(rows.length > 0 ? rows[0] : null);
      },
    }),
    [baseGridOptions],
  );

  // ─── 컬럼 — 좌 공용 그룹DN (노드 컬럼 없음) ──────────────────────────
  const gdnColumns = useMemo<ColDef<CommonGdnResponse>[]>(
    () => [
      {
        field: 'gdnNo',
        headerName: '그룹DN 번호',
        minWidth: 110,
        maxWidth: 140,
        cellStyle: { fontFamily: 'monospace', fontWeight: 600, color: '#374151' } as CellStyle,
      },
      { field: 'gdnName', headerName: '그룹DN 이름', flex: 1, minWidth: 130, tooltipField: 'gdnName' },
      {
        field: 'globalDnYn',
        headerName: '글로벌여부',
        minWidth: 90,
        maxWidth: 100,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (p) => BOOL_OX_LABEL(p.value),
      },
      {
        field: 'backUpNodeName',
        headerName: 'DR노드',
        minWidth: 80,
        maxWidth: 110,
        cellStyle: { textAlign: 'center', color: '#9ca3af' } as CellStyle,
        valueFormatter: (p) => p.value ?? '-',
        tooltipField: 'backUpNodeName',
      },
      {
        field: 'assignedTrunkCount',
        headerName: '배정 트렁크',
        width: 100,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: { value: number }) => (p.value > 0 ? <Tag color="green">{p.value}건</Tag> : <span className="text-gray-300 italic">-</span>),
      },
      {
        field: 'blockYn',
        headerName: '블록',
        width: 70,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: { value: number }) => (p.value === 1 ? <Tag color="red">사용</Tag> : <Tag>미사용</Tag>),
      },
      // 갭4: 라우팅 이름 3종 (SWAT 그리드 정합)
      {
        field: 'blockRoutingName',
        headerName: '블록라우팅',
        minWidth: 100,
        flex: 1,
        cellStyle: { color: '#9ca3af' } as CellStyle,
        valueFormatter: (p) => p.value ?? '-',
        tooltipField: 'blockRoutingName',
      },
      {
        field: 'errorRoutingName',
        headerName: '장애라우팅',
        minWidth: 100,
        flex: 1,
        cellStyle: { color: '#9ca3af' } as CellStyle,
        valueFormatter: (p) => p.value ?? '-',
        tooltipField: 'errorRoutingName',
      },
      {
        field: 'busyRoutingName',
        headerName: 'Busy라우팅',
        minWidth: 100,
        flex: 1,
        cellStyle: { color: '#9ca3af' } as CellStyle,
        valueFormatter: (p) => p.value ?? '-',
        tooltipField: 'busyRoutingName',
      },
    ],
    [],
  );

  // ─── 컬럼 — 우 SIP 트렁크 (배정상태 맨앞, 멤버 기준, 노드 컬럼 없음) ──
  const trunkColumns = useMemo<ColDef<CommonTrunkMemberResponse>[]>(
    () => [
      {
        field: 'assignYn',
        headerName: '배정상태',
        width: 84,
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: { value: boolean }) => (p.value ? <Tag color="green">배정중</Tag> : <span className="text-gray-400 italic">미배정</span>),
      },
      {
        field: 'targetName',
        headerName: 'SIP트렁크 이름',
        flex: 1,
        minWidth: 150,
        cellStyle: { fontWeight: 600, color: '#374151' } as CellStyle,
        tooltipField: 'targetName',
      },
      { field: 'targetNo', headerName: '번호', minWidth: 80, maxWidth: 120, cellStyle: { fontFamily: 'monospace' } as CellStyle },
      {
        headerName: '종류',
        minWidth: 110,
        maxWidth: 140,
        valueGetter: (p) => (p.data ? (trunkKindMap.get(p.data.sipTrunkId) ?? null) : null),
        cellRenderer: (p: { value: number | null }) =>
          p.value === 1 ? <Tag color="blue">IPRON-IE</Tag> : p.value === 9 ? <Tag color="purple">외부 교환기(PBX)</Tag> : <span>{getTrunkKindName(p.value)}</span>,
      },
      { field: 'chnlCnt', headerName: '채널', width: 64, cellStyle: { textAlign: 'center', fontFamily: 'monospace' } as CellStyle },
      {
        headerName: '채널 사용률',
        minWidth: 150,
        sortable: false,
        cellRenderer: (p: { data?: CommonTrunkMemberResponse }) => {
          const max = p.data?.chnlCnt ?? 0;
          const used = p.data?.totChannelCount ?? 0;
          const pct = max > 0 ? Math.round((used / max) * 100) : 0;
          const col = gaugeColor(pct);
          return (
            <div className="flex items-center gap-1.5 h-full w-full">
              <div className="flex-1 h-[5px] bg-gray-200 rounded overflow-hidden min-w-[30px]">
                <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: col }} />
              </div>
              <span style={{ color: col, fontWeight: 600 }} className="whitespace-nowrap tabular-nums">
                {used}/{max} ({pct}%)
              </span>
            </div>
          );
        },
      },
      {
        field: 'memberPriority',
        headerName: '우선순위',
        width: 80,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)),
      },
      {
        field: 'channelLimitCount',
        headerName: '배정채널',
        width: 84,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)),
      },
    ],
    [trunkKindMap],
  );

  // ─── Handlers ───────────────────────────────────────────────────────
  const handleSelectNode = useCallback((nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedGdn(null);
    setSelectedTrunks([]);
  }, []);

  const handleDeleteGdn = useCallback(() => {
    if (!selectedGdn) return;
    Modal.confirm({
      title: '그룹DN 삭제',
      content: `"${selectedGdn.gdnNo}" 그룹DN을 삭제하시겠습니까?`,
      okType: 'danger',
      onOk: () => deleteGdns([selectedGdn.gdnId]),
    });
  }, [selectedGdn, deleteGdns]);

  const handleDeleteTrunks = useCallback(() => {
    if (selectedTrunks.length === 0) return;
    Modal.confirm({
      title: '트렁크 삭제',
      content: `선택한 트렁크 ${selectedTrunks.length}건을 삭제하시겠습니까?`,
      okType: 'danger',
      onOk: () => deleteTrunks(selectedTrunks.map((t) => t.sipTrunkId)),
    });
  }, [selectedTrunks, deleteTrunks]);

  const handleRevoke = useCallback(() => {
    if (!selectedGdn || selectedTrunks.length === 0) return;
    Modal.confirm({
      title: '배정 해제',
      content: `선택한 트렁크 ${selectedTrunks.length}건의 그룹DN ${selectedGdn.gdnNo} 배정을 해제하시겠습니까?`,
      okType: 'danger',
      onOk: () =>
        saveMembers({
          gdnId: selectedGdn.gdnId,
          rows: selectedTrunks.map((t) => ({ sipTrunkId: t.sipTrunkId, assignYn: false })),
        }),
    });
  }, [selectedGdn, selectedTrunks, saveMembers]);

  const clearBulkSel = useCallback(() => {
    gdnGridRef.current?.api?.deselectAll();
    trunkGridRef.current?.api?.deselectAll();
    setSelectedGdn(null);
    setSelectedTrunks([]);
  }, []);

  const showBulkBar = selectedGdn != null && selectedTrunks.length > 0;

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 w-full h-full">
      {/* ===== 박스 1: 노드 탭바 + 검색/액션 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-stretch h-[56px] pr-3">
          {/* 공용 고정 아이콘 */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center w-[44px] border-r border-gray-200" title="공용 트렁크: 노드 단위 고정">
            <Network className="size-4" style={{ color: '#0369a1' }} />
            <span className="text-[8px] font-bold mt-0.5" style={{ color: '#0369a1' }}>
              공용
            </span>
          </div>

          {/* ChevronLeft */}
          <button
            type="button"
            onClick={() => nodeTabScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
            className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
          >
            <ChevronLeft className="size-4 text-gray-500" />
          </button>

          {/* 노드 탭들 */}
          <div ref={nodeTabScrollRef} className="flex items-stretch min-w-0 overflow-x-auto divide-x divide-gray-200" style={{ maxWidth: 860, scrollbarWidth: 'none' }}>
            {nodeTabs.length === 0 ? (
              <div className="flex items-center px-4 text-xs text-gray-400">노드가 없습니다</div>
            ) : (
              nodeTabs.map((n) => {
                const active = n.nodeId === selectedNodeId;
                return (
                  <button
                    key={n.nodeId}
                    type="button"
                    onClick={() => handleSelectNode(n.nodeId as number)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-px w-[120px] flex-shrink-0 transition ${
                      active ? 'bg-blue-50 text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                    }`}
                  >
                    <Network className="size-3" />
                    <span className="truncate">{n.nodeName ?? n.nodeId}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* ChevronRight */}
          <button
            type="button"
            onClick={() => nodeTabScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
            className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
          >
            <ChevronRight className="size-4 text-gray-500" />
          </button>

          {/* 우측: 검색 + 액션 */}
          <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
            <Input
              size="small"
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="트렁크 검색"
              value={trunkSearch}
              onChange={handleTrunkSearch}
              style={{ width: 200 }}
            />
            {/* TODO: 엑셀 다운로드 구현 후 노출 */}
            {/* TODO: 가져오기 구현 후 노출 */}
          </div>
        </div>
      </div>

      {/* ===== 박스 2: 메인 2-그리드 ===== */}
      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* ── 좌: 공용 그룹DN (단일선택) ── */}
        <Panel defaultSize={40} minSize={25}>
          <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
            <div className="flex items-center px-3.5 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
              <Network className="size-3.5 text-[#405189]" />
              <span className="text-sm font-semibold text-gray-700">그룹DN</span>
              <span className="text-xs text-gray-500">
                총 <strong>{gdns.length}건</strong> · <strong className="text-[#405189]">선택 {selectedGdn ? 1 : 0}건</strong>
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Input
                  size="small"
                  allowClear
                  prefix={<Search className="size-3 text-gray-400" />}
                  placeholder="그룹DN 검색"
                  value={gdnSearch}
                  onChange={handleGdnSearch}
                  style={{ width: 120 }}
                />
                <Button
                  size="small"
                  type="primary"
                  icon={<Plus className="size-3" />}
                  onClick={() => setGdnDrawer({ open: true, mode: 'create', detail: null })}
                  disabled={selectedNodeId == null}
                >
                  등록
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<Trash2 className="size-3" />}
                  onClick={handleDeleteGdn}
                  disabled={selectedGdn == null}
                  title={selectedGdn == null ? '삭제할 그룹DN을 선택하세요' : `"${selectedGdn.gdnNo}" 삭제`}
                />
              </div>
            </div>

            <div className="h-[34px] px-3 flex items-center gap-1.5 bg-gray-50 border-b border-gray-100 text-[11.5px] font-semibold text-gray-500 flex-shrink-0">
              <Network className="size-3" />
              <span>{selectedNodeName || '노드 선택'} 노드</span>
            </div>

            <div className="flex-1 min-h-0 ag-theme-quartz">
              <AgGridReact<CommonGdnResponse> ref={gdnGridRef} rowData={gdns} columnDefs={gdnColumns} gridOptions={gdnGridOptions} loading={gdnsLoading} />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />

        {/* ── 우: SIP 트렁크 (다중선택, N:N) ── */}
        <Panel defaultSize={60} minSize={30}>
          <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
            <div className="flex items-center px-3.5 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-700">SIP 트렁크</span>
              <span className="text-xs text-gray-500">
                {selectedNodeName} · 총 <strong>{selectedGdn ? members.length : trunks.length}건</strong> ·{' '}
                <strong className="text-[#405189]">선택 {selectedTrunks.length}건</strong>
                {selectedGdn && <span className="ml-2 text-[11px] text-amber-600">· GDN {selectedGdn.gdnNo} 기준 기배정/미배정</span>}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                {/* 배정상태 세그먼트 */}
                <div className="flex items-center gap-0.5 bg-gray-100 rounded p-0.5">
                  {(['all', 'assigned', 'unassigned'] as AssignFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAssignFilter(f)}
                      className={`h-6 px-2.5 text-xs rounded transition ${assignFilter === f ? 'bg-[#405189] text-white' : 'text-gray-600 hover:text-[#405189]'}`}
                    >
                      {f === 'all' ? '전체' : f === 'assigned' ? '기배정' : '미배정'}
                    </button>
                  ))}
                </div>
                <Select
                  size="small"
                  value={kindFilter}
                  onChange={(v) => setKindFilter(v)}
                  style={{ width: 120 }}
                  options={[
                    { value: '', label: '전체 종류' },
                    { value: 1, label: 'IPRON-IE' },
                    { value: 9, label: '외부 교환기(PBX)' },
                  ]}
                />
                <Button
                  size="small"
                  type="primary"
                  icon={<Plus className="size-3" />}
                  onClick={() => setTrunkDrawer({ open: true, mode: 'create', detail: null })}
                  disabled={selectedNodeId == null}
                >
                  등록
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<Trash2 className="size-3" />}
                  onClick={handleDeleteTrunks}
                  disabled={selectedTrunks.length === 0}
                  title={selectedTrunks.length === 0 ? '삭제할 트렁크를 선택하세요' : `선택한 트렁크 ${selectedTrunks.length}건 삭제`}
                />
              </div>
            </div>

            <div className="h-[34px] px-3 flex items-center gap-2 bg-gray-50 border-b border-gray-100 text-[11.5px] font-semibold text-gray-500 flex-shrink-0">
              <span>{selectedNodeName || '노드 선택'} 노드</span>
            </div>

            <div className="flex-1 min-h-0 ag-theme-quartz">
              {selectedGdn ? (
                <AgGridReact<CommonTrunkMemberResponse>
                  ref={trunkGridRef}
                  rowData={members}
                  columnDefs={trunkColumns}
                  gridOptions={trunkGridOptions}
                  rowSelection={trunkRowSelection}
                  quickFilterText={trunkQuickFilter}
                  loading={membersLoading}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                  <Network className="size-10 text-gray-200" />
                  <span className="text-sm">좌측 그룹DN을 선택하세요</span>
                  <span className="text-xs">선택한 그룹DN 기준으로 트렁크 배정 현황이 표시됩니다</span>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>

      {/* ===== Bulk Action Bar — 항상 렌더, 선택 없을 때 버튼 disabled ===== */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-700/90 rounded-xl shadow-xl flex items-center gap-3 px-4 py-2.5 text-sm text-[#e2e8f0]"
        style={{ opacity: showBulkBar ? 1 : 0.38, pointerEvents: showBulkBar ? 'auto' : 'none' }}
      >
        <span className="flex items-center gap-1.5">
          <Network className="size-3" style={{ color: '#94a3b8' }} />
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            그룹DN
          </span>
          <span className="bg-[#405189] px-2 py-0.5 rounded-full font-bold min-w-[22px] text-center" style={{ color: '#e2e8f0' }}>
            {selectedGdn?.gdnNo ?? '-'}
          </span>
        </span>
        <span className="text-sm" style={{ color: '#94a3b8' }}>
          ↔
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            트렁크
          </span>
          <span className="bg-[#405189] px-2 py-0.5 rounded-full font-bold min-w-[22px] text-center" style={{ color: '#e2e8f0' }}>
            {selectedTrunks.length}건
          </span>
        </span>
        <span className="mx-1" style={{ color: '#64748b' }}>
          ·
        </span>
        <Button size="small" type="primary" icon={<Plus className="size-3" />} disabled={!showBulkBar} onClick={() => setAssignDrawerOpen(true)}>
          배정
        </Button>
        <Button size="small" danger icon={<Trash2 className="size-3" />} disabled={!showBulkBar} onClick={handleRevoke}>
          해제
        </Button>
        <Button size="small" type="text" style={{ color: '#94a3b8' }} disabled={!showBulkBar} onClick={clearBulkSel}>
          선택 해제
        </Button>
      </div>

      {/* ===== Drawers ===== */}
      <CommonGdnFormDrawer
        open={gdnDrawer.open}
        mode={gdnDrawer.mode}
        detail={gdnDrawer.detail}
        nodeId={selectedNodeId}
        nodeName={selectedNodeName}
        nodeOptions={nodeOptions}
        onClose={() => setGdnDrawer((s) => ({ ...s, open: false }))}
        onSaved={() => setGdnDrawer((s) => ({ ...s, open: false }))}
      />
      <CommonTrunkFormDrawer
        open={trunkDrawer.open}
        mode={trunkDrawer.mode}
        detail={trunkDrawer.detail}
        nodeId={selectedNodeId}
        onClose={() => setTrunkDrawer((s) => ({ ...s, open: false }))}
        onSaved={() => setTrunkDrawer((s) => ({ ...s, open: false }))}
      />
      <CommonTrunkAssignDrawer
        open={assignDrawerOpen}
        gdn={selectedGdn}
        trunks={selectedTrunks}
        onClose={() => setAssignDrawerOpen(false)}
        onSaved={() => {
          setAssignDrawerOpen(false);
          clearBulkSel();
        }}
      />
    </div>
  );
}
