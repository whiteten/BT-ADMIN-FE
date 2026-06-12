/**
 * 단말기관리 목록 페이지 (IPR20S2110)
 * Pattern: 상단 노드탭 + 뷰 스위치 + 테넌트 카드 슬라이더 + 하단 ag-Grid (Type C)
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │ [⇅] [← 노드 탭 →]                [검색][+등록][삭제][기타] │
 *  │ [전체] [테넌트A] [테넌트B] ... (카드 240×100)               │
 *  ├──────────────────────────────────────────────────────────────┤
 *  │ ag-Grid (검색필터+체크박스)                                  │
 *  └──────────────────────────────────────────────────────────────┘
 *
 * 뷰 모드:
 *  - byNode: 탭=노드 / 카드=테넌트 (기본)
 *  - byTenant: 탭=테넌트 / 카드=노드
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, GridReadyEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input } from 'antd';
import { ArrowUpDown, Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Network, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DeviceBulkDeleteModal from '../../features/device/components/DeviceBulkDeleteModal';
import DeviceFormDrawer, { type DeviceFormDrawerRef } from '../../features/device/components/DeviceFormDrawer';
import DeviceImportDrawer from '../../features/device/components/DeviceImportDrawer';
import DeviceTenantCard from '../../features/device/components/DeviceTenantCard';
import { deviceQueryKeys, useGetDeviceTypes, useGetDevices, useUpdateFirmwareUse } from '../../features/device/hooks/useDeviceQueries';
import type { DevMasterResponse } from '../../features/device/types';
import { useGetDnNodeTenants } from '../../features/dn/hooks/useDnQueries';
import { useGetDnProfileNodes, useGetDnProfileTenants } from '../../features/dn-profile/hooks/useDnProfileQueries';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [
  { title: '번호자원관리', path: '/ipron/dn' },
  { title: 'DN관리', path: '/ipron/dn' },
  { title: '단말기관리', path: '/ipron/device' },
];

export default function DeviceList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'byNode' | 'byTenant'>('byNode');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<DevMasterResponse[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);

  const { gridOptions } = useAggridOptions();

  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedNodeRef = useRef(false);
  const hasInitializedTenantRef = useRef(false);
  const drawerRef = useRef<DeviceFormDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetDnProfileNodes();
  const { data: tenants = [] } = useGetDnProfileTenants();
  const { data: nodeTenants = [] } = useGetDnNodeTenants();
  const { data: deviceTypes = [] } = useGetDeviceTypes();

  const listParams = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (viewMode === 'byNode' && selectedNodeId) p.nodeId = selectedNodeId;
    if (viewMode === 'byTenant' && selectedTenantId) p.tenantId = selectedTenantId;
    return p;
  }, [viewMode, selectedNodeId, selectedTenantId]);

  const { data: devicesResult, isLoading: isDevicesLoading, isError: isDevicesError } = useGetDevices(listParams as Parameters<typeof useGetDevices>[0]);
  const devices = devicesResult?.items ?? [];

  // ─── Derived: 탭 / 카드 세팅 ────────────────────────────────────────────────
  const assignedNodes = useMemo(() => {
    const nodeIds = new Set(nodeTenants.map((nt) => nt.nodeId));
    return nodes.filter((n) => nodeIds.has(n.nodeId));
  }, [nodes, nodeTenants]);

  const assignedTenants = useMemo(() => {
    const map = new Map<number, { tenantId: number; tenantName: string }>();
    for (const nt of nodeTenants) {
      if (!map.has(nt.tenantId)) {
        map.set(nt.tenantId, { tenantId: nt.tenantId, tenantName: nt.tenantName });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [nodeTenants]);

  const tabItems = useMemo(
    () => (viewMode === 'byNode' ? assignedNodes.map((n) => ({ id: n.nodeId, name: n.nodeName })) : assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))),
    [viewMode, assignedNodes, assignedTenants],
  );

  // 카드 통계: 단말기 목록 기반
  // nodeId/tenantId 필드가 DevMasterResponse 에 직접 없으므로 nodeTenants 통계 API 활용.
  // 간소화: 현재 탭 범위에서 노드별/테넌트별 단말 집계.
  const deviceTypeMap = useMemo(() => new Map(deviceTypes.map((d) => [d.deviceType, d])), [deviceTypes]);

  const cardStats = useMemo(() => {
    type CardEntry = {
      id: number;
      name: string;
      totalCnt: number;
      firmUpdCnt: number;
      provSuccessCnt: number;
    };
    const map = new Map<number, CardEntry>();

    // 시드: 현재 탭에 매핑된 테넌트/노드를 0건으로 먼저 넣음
    if (viewMode === 'byNode' && selectedNodeId) {
      for (const nt of nodeTenants) {
        if (nt.nodeId !== selectedNodeId) continue;
        map.set(nt.tenantId, { id: nt.tenantId, name: nt.tenantName ?? '-', totalCnt: 0, firmUpdCnt: 0, provSuccessCnt: 0 });
      }
    } else if (viewMode === 'byTenant' && selectedTenantId) {
      for (const nt of nodeTenants) {
        if (nt.tenantId !== selectedTenantId) continue;
        const nodeName = nodes.find((n) => n.nodeId === nt.nodeId)?.nodeName ?? '-';
        if (!map.has(nt.nodeId)) {
          map.set(nt.nodeId, { id: nt.nodeId, name: nodeName, totalCnt: 0, firmUpdCnt: 0, provSuccessCnt: 0 });
        }
      }
    }

    // 단말기 집계 (DevMasterResponse 에 tenantId/nodeId 필드가 없으면 전체 카드만 0)
    // BE 응답에 nodeId 포함 — 타입에 추가 반영하거나 unknown cast
    for (const dev of devices) {
      const devAny = dev as DevMasterResponse & { nodeId?: number; tenantId?: number };
      const key = viewMode === 'byNode' ? (devAny.tenantId ?? -1) : (devAny.nodeId ?? -1);
      if (key === -1) continue;
      if (!map.has(key)) {
        const name = viewMode === 'byNode' ? (tenants.find((t) => t.tenantId === key)?.tenantName ?? '-') : (nodes.find((n) => n.nodeId === key)?.nodeName ?? '-');
        map.set(key, { id: key, name, totalCnt: 0, firmUpdCnt: 0, provSuccessCnt: 0 });
      }
      const g = map.get(key)!;
      g.totalCnt += 1;
      if (devAny.firmUpdUseYn === 1) g.firmUpdCnt += 1;
      if (devAny.provResult === 1) g.provSuccessCnt += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [devices, viewMode, nodeTenants, selectedNodeId, selectedTenantId, tenants, nodes]);

  const totalStats = useMemo(() => {
    let totalCnt = 0;
    let firmUpdCnt = 0;
    let provSuccessCnt = 0;
    for (const dev of devices) {
      totalCnt += 1;
      if (dev.firmUpdUseYn === 1) firmUpdCnt += 1;
      if (dev.provResult === 1) provSuccessCnt += 1;
    }
    return { totalCnt, firmUpdCnt, provSuccessCnt };
  }, [devices]);

  const selectedCardId = viewMode === 'byNode' ? selectedTenantId : selectedNodeId;
  const setSelectedCardId = useCallback(
    (id: number | null) => {
      if (viewMode === 'byNode') setSelectedTenantId(id);
      else setSelectedNodeId(id);
    },
    [viewMode],
  );

  // 그리드 표시 데이터 — 카드 필터 + 텍스트 검색
  const devicesForGrid = useMemo(() => {
    let rows = devices;
    if (selectedCardId !== null) {
      rows = rows.filter((d) => {
        const devAny = d as DevMasterResponse & { nodeId?: number; tenantId?: number };
        return viewMode === 'byNode' ? devAny.tenantId === selectedCardId : devAny.nodeId === selectedCardId;
      });
    }
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      rows = rows.filter((d) => [d.devMstName, d.macAddr, d.ipAddr, d.firmVersion, d.dnNo].some((f) => f != null && String(f).toLowerCase().includes(kw)));
    }
    return rows;
  }, [devices, selectedCardId, viewMode, searchText]);

  const gridHeaderText = useMemo(() => {
    const tabName =
      viewMode === 'byNode' ? (nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? '전체') : (tenants.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? '전체');
    const cardGroup = cardStats.find((g) => g.id === selectedCardId);
    if (cardGroup) return `${tabName} / ${cardGroup.name} 단말기 목록 (${devicesForGrid.length.toLocaleString()}건)`;
    return `${tabName} 단말기 목록 (${devicesForGrid.length.toLocaleString()}건)`;
  }, [viewMode, selectedNodeId, selectedTenantId, nodes, tenants, cardStats, selectedCardId, devicesForGrid.length]);

  // ─── Auto-select ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (viewMode === 'byNode') {
      if (assignedNodes.length > 0 && !hasInitializedNodeRef.current && selectedNodeId == null) {
        hasInitializedNodeRef.current = true;
        setSelectedNodeId(assignedNodes[0].nodeId);
      } else if (selectedNodeId != null) {
        hasInitializedNodeRef.current = true;
      }
    } else {
      if (assignedTenants.length > 0 && !hasInitializedTenantRef.current && selectedTenantId == null) {
        hasInitializedTenantRef.current = true;
        setSelectedTenantId(assignedTenants[0].tenantId);
      } else if (selectedTenantId != null) {
        hasInitializedTenantRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, assignedNodes, assignedTenants]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleTabSelect = useCallback(
    (id: number | null) => {
      if (viewMode === 'byNode') {
        setSelectedNodeId(id);
        setSelectedTenantId(null);
      } else {
        setSelectedTenantId(id);
        setSelectedNodeId(null);
      }
      setSearchText('');
    },
    [viewMode],
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'byNode' ? 'byTenant' : 'byNode'));
    setSelectedNodeId(null);
    setSelectedTenantId(null);
    hasInitializedNodeRef.current = false;
    hasInitializedTenantRef.current = false;
    setSearchText('');
  }, []);

  const invalidateDevices = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: deviceQueryKeys.list._def });
    queryClient.invalidateQueries({ queryKey: deviceQueryKeys.nodeTenantStats.queryKey });
  }, [queryClient]);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const { mutate: updateFirmwareUse, isPending: isFirmwareUpdating } = useUpdateFirmwareUse({
    mutationOptions: {
      onSuccess: () => {
        toast.success('펌웨어 사용여부가 변경되었습니다');
        invalidateDevices();
      },
      onError: () => toast.error('펌웨어 사용여부 변경에 실패했습니다'),
    },
  });

  // NUM-005: 다건 삭제 — forEach 개별 호출 대신 DeviceBulkDeleteModal (청크+진행률)
  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) return;
    setBulkDeleteOpen(true);
  };

  const handleFirmwareUseOn = () => {
    if (selectedRows.length === 0) return;
    updateFirmwareUse({ devMasterIds: selectedRows.map((r) => r.devMasterId), firmUpdUseYn: 1 });
  };

  const handleFirmwareUseOff = () => {
    if (selectedRows.length === 0) return;
    updateFirmwareUse({ devMasterIds: selectedRows.map((r) => r.devMasterId), firmUpdUseYn: 0 });
  };

  // 등록 버튼
  const handleCreate = useCallback(() => {
    if (!selectedNodeId) {
      toast.warning('노드를 선택한 후 등록하세요');
      return;
    }
    const nodeName = nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? '';
    drawerRef.current?.openCreate(selectedNodeId, nodeName);
  }, [selectedNodeId, nodes]);

  // 수정 (더블클릭)
  const handleEdit = useCallback(
    (data: DevMasterResponse) => {
      const nodeName = nodes.find((n) => n.nodeId === data.nodeId)?.nodeName ?? '';
      drawerRef.current?.openEdit(data, nodeName);
    },
    [nodes],
  );

  // ─── Grid Columns ────────────────────────────────────────────────────────────
  const columnDefs: ColDef<DevMasterResponse>[] = useMemo(
    () => [
      { field: 'devMstName', headerName: '단말기명', flex: 1.5, minWidth: 140, tooltipField: 'devMstName' },
      {
        headerName: '단말기유형',
        valueGetter: (p) => {
          const dt = deviceTypeMap.get(p.data?.deviceType ?? -1);
          return dt?.deviceName ?? '-';
        },
        flex: 1.2,
        minWidth: 120,
      },
      { field: 'macAddr', headerName: 'MAC 주소', flex: 1.2, minWidth: 140, tooltipField: 'macAddr' },
      { field: 'dnNo', headerName: '대표DN', flex: 0.8, minWidth: 100 },
      { field: 'ipAddr', headerName: 'IP주소', flex: 1, minWidth: 120, tooltipField: 'ipAddr' },
      { field: 'firmVersion', headerName: '펌웨어버전', flex: 1, minWidth: 110, tooltipField: 'firmVersion' },
      {
        field: 'firmUpdUseYn',
        headerName: '펌웨어사용',
        flex: 0.7,
        minWidth: 90,
        valueFormatter: (p) => (p.value === 1 ? '사용' : '미사용'),
      },
      {
        field: 'firmUpdTime',
        headerName: '펌웨어업데이트일시',
        flex: 1.2,
        minWidth: 160,
      },
      {
        field: 'firmUpdResult',
        headerName: '펌웨어업데이트결과',
        flex: 1,
        minWidth: 140,
        valueFormatter: (p) => (p.value === 1 ? '성공' : p.value === 0 ? '실패' : '-'),
      },
      {
        field: 'provTime',
        headerName: '프로비저닝일시',
        flex: 1.2,
        minWidth: 150,
      },
      {
        field: 'provResult',
        headerName: '프로비저닝결과',
        flex: 0.9,
        minWidth: 120,
        valueFormatter: (p) => (p.value === 1 ? '성공' : p.value === 0 ? '실패' : '-'),
      },
    ],
    [deviceTypeMap],
  );

  // ag-Grid 34: rowSelection 은 gridOptions 밖 직접 prop 으로 (초기 마운트 1회 제한 우회)
  const rowSelection = useMemo(() => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }), []);

  const gridRef = useRef<AgGridReact<DevMasterResponse>>(null);
  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 탭 바 박스 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            {/* 뷰 모드 전환 */}
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

            {/* 탭 좌측 스크롤 */}
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              aria-label="이전 탭"
            >
              <ChevronLeft className="size-4 text-gray-500" />
            </button>

            {/* 탭 스크롤 컨테이너 */}
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
                      (e.currentTarget as HTMLElement).scrollIntoView({
                        behavior: 'smooth',
                        inline: 'center',
                        block: 'nearest',
                      });
                    }}
                  >
                    <Icon className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* 탭 우측 스크롤 */}
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              aria-label="다음 탭"
            >
              <ChevronRight className="size-4 text-gray-500" />
            </button>

            {/* 우측 액션 영역 */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="단말기명/MAC 검색"
                value={searchText}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
              <Button icon={<Upload className="size-3.5" />} onClick={() => setImportOpen(true)}>
                가져오기
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 카드 슬라이더 박스 ===== */}
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
                  {/* "전체" 카드 */}
                  <DeviceTenantCard tenantId={null} tenantName="전체" stats={totalStats} selected={selectedCardId === null} onClick={() => setSelectedCardId(null)} />
                  {cardStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                      <Empty description={false} imageStyle={{ height: 40 }} />
                      <span className="text-sm">등록된 단말기가 없습니다</span>
                    </div>
                  ) : (
                    cardStats.map((g) => (
                      <DeviceTenantCard
                        key={g.id}
                        tenantId={g.id}
                        tenantName={g.name}
                        stats={g}
                        selected={selectedCardId === g.id}
                        onClick={(e) => {
                          setSelectedCardId(g.id);
                          (e.currentTarget as HTMLElement).scrollIntoView({
                            behavior: 'smooth',
                            inline: 'center',
                            block: 'nearest',
                          });
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
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-4" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-7 !h-7 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-2 overflow-x-auto flex-1 items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <CompactPill name="전체" count={totalStats.totalCnt} selected={selectedCardId === null} onClick={() => setSelectedCardId(null)} />
                  {cardStats.map((g) => (
                    <CompactPill
                      key={g.id}
                      name={g.name}
                      count={g.totalCnt}
                      selected={selectedCardId === g.id}
                      onClick={(e) => {
                        setSelectedCardId(g.id);
                        (e.currentTarget as HTMLElement).scrollIntoView({
                          behavior: 'smooth',
                          inline: 'center',
                          block: 'nearest',
                        });
                      }}
                    />
                  ))}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-4" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-7 !h-7 !p-0"
                />
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

        {/* ===== 하단 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
            {selectedRows.length > 0 && (
              <span className="text-xs text-gray-500">
                {devicesForGrid.length.toLocaleString()}건 중 {selectedRows.length}건 선택
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button onClick={handleFirmwareUseOn} loading={isFirmwareUpdating} disabled={selectedRows.length === 0}>
                펌웨어사용
              </Button>
              <Button onClick={handleFirmwareUseOff} loading={isFirmwareUpdating} disabled={selectedRows.length === 0}>
                펌웨어미사용
              </Button>
              <Button danger icon={<Trash2 className="size-3.5" />} onClick={handleDeleteSelected} disabled={selectedRows.length === 0}>
                삭제
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                등록
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
            {isDevicesError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-red-500">
                <span className="text-sm font-medium">단말기 목록 조회에 실패했습니다.</span>
                <span className="text-xs text-gray-400">서버 오류가 발생했습니다. 잠시 후 다시 시도하세요.</span>
              </div>
            ) : (
              <AgGridReact<DevMasterResponse>
                ref={gridRef}
                rowData={devicesForGrid}
                columnDefs={columnDefs}
                loading={isDevicesLoading}
                gridOptions={{
                  ...gridOptions,
                  pagination: false,
                  statusBar: undefined,
                  sideBar: false,
                }}
                rowSelection={rowSelection}
                onSelectionChanged={(e) => setSelectedRows(e.api.getSelectedRows())}
                onGridReady={onGridReady}
                onRowDoubleClicked={(e) => e.data && handleEdit(e.data)}
              />
            )}
          </div>
        </div>
      </div>

      {/* 등록/수정 Drawer */}
      <DeviceFormDrawer ref={drawerRef} deviceTypes={deviceTypes} onSuccess={invalidateDevices} />

      {/* NUM-004: 가져오기 전용 Drawer (AdnImportDrawer 패턴) */}
      <DeviceImportDrawer open={importOpen} nodeId={selectedNodeId} onClose={() => setImportOpen(false)} onSuccess={invalidateDevices} />

      {/* NUM-005: 다건 삭제 Modal (DnBulkDeleteModal 패턴 — 청크+진행률) */}
      <DeviceBulkDeleteModal
        open={bulkDeleteOpen}
        devMasterIds={selectedRows.map((r) => r.devMasterId)}
        onCancel={() => setBulkDeleteOpen(false)}
        onSuccess={() => {
          setBulkDeleteOpen(false);
          setSelectedRows([]);
          invalidateDevices();
        }}
      />
    </div>
  );
}

// ─── 컴팩트 pill ──────────────────────────────────────────────────────────────
interface CompactPillProps {
  name: string;
  count: number;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}
function CompactPill({ name, count, selected, onClick }: CompactPillProps) {
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
