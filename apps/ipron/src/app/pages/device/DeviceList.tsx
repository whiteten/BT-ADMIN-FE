/**
 * 단말기관리 목록 페이지 (IPR20S2110)
 *
 * 멀티테넌트 개편(상담사/내선프로파일 정합): byNode/byTenant 뷰전환 + 탭바 + 카드 슬라이더 제거
 *   → 상단에 노드 Select + 테넌트 ScopeSelect 두 필터(각 "전체" 포함) + 요약.
 *   데이터는 전량 클라이언트 로드(노드 미지정 = 전체) → 노드/테넌트/검색 클라이언트 필터.
 *   단말기 행은 nodeId 만 보유(tenantId 없음) → 테넌트 필터는 nodeTenants 매핑으로 노드 집합 변환 후 적용.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [노드▼] [테넌트▼]  총/펌웨어/프로비저닝  🔍[검색]    │ ← 헤더
 * ├──────────────────────────────────────────────────────┤
 * │ ag-Grid (필터된 단말기 목록)                           │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, GridReadyEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import { Network, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DeviceBulkDeleteModal from '../../features/device/components/DeviceBulkDeleteModal';
import DeviceFormDrawer, { type DeviceFormDrawerRef } from '../../features/device/components/DeviceFormDrawer';
import DeviceImportDrawer from '../../features/device/components/DeviceImportDrawer';
import { deviceQueryKeys, useGetDeviceTypes, useGetDevices, useUpdateFirmwareUse } from '../../features/device/hooks/useDeviceQueries';
import type { DevMasterResponse } from '../../features/device/types';
import { useGetDnProfileNodes } from '../../features/dn-profile/hooks/useDnProfileQueries';
import { useGetNodeTenants } from '../../features/node-scope/hooks/useNodeScope';
import { useNodeTenantScope } from '../../features/node-scope/hooks/useNodeTenantScope';
import ScopeSelect from '@/components/custom/ScopeSelect';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [{ title: '단말관리' }, { title: '단말기관리', path: '/ipron/device' }];

export default function DeviceList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<DevMasterResponse[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { gridOptions } = useAggridOptions();

  const drawerRef = useRef<DeviceFormDrawerRef>(null);
  const gridRef = useRef<AgGridReact<DevMasterResponse>>(null);

  // ─── Queries — 전량 로드 후 클라이언트 필터 ──────────────────────────────────
  const { data: devicesResult, isLoading: isDevicesLoading, isError: isDevicesError } = useGetDevices();
  const devices = useMemo(() => devicesResult?.items ?? [], [devicesResult]);

  const { data: allNodes = [] } = useGetDnProfileNodes();
  // 단말기 행은 tenantId 없음 → 테넌트 필터를 노드 집합으로 변환하기 위한 매핑 (스코프 훅과 별개 용도)
  const { data: nodeTenants = [] } = useGetNodeTenants();
  const { data: deviceTypes = [] } = useGetDeviceTypes();

  // 테넌트↔노드 스코프 — 공통 규칙(기본 테넌트→노드). useNodeTenantScope 참조.
  const {
    operatorMode,
    nodes: assignedNodes,
    tenants: assignedTenants,
    selectedNodeId,
    setSelectedNodeId,
    tenantFilter,
    setTenantFilter,
    selectedTenantId,
  } = useNodeTenantScope(allNodes);

  // 테넌트 → 노드 집합 (단말기는 nodeId 만 보유하므로 테넌트 필터를 노드 집합으로 변환)
  const tenantNodeIds = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const nt of nodeTenants) {
      let set = map.get(nt.tenantId);
      if (!set) {
        set = new Set<number>();
        map.set(nt.tenantId, set);
      }
      set.add(nt.nodeId);
    }
    return map;
  }, [nodeTenants]);

  const deviceTypeMap = useMemo(() => new Map(deviceTypes.map((d) => [d.deviceType, d])), [deviceTypes]);

  // ─── Derived — 노드/테넌트/검색 클라이언트 필터 ─────────────────────────────
  const devicesForGrid = useMemo(() => {
    let rows = devices;
    if (selectedNodeId != null) rows = rows.filter((d) => d.nodeId === selectedNodeId);
    if (selectedTenantId != null) {
      const nodeSet = tenantNodeIds.get(selectedTenantId);
      rows = nodeSet ? rows.filter((d) => nodeSet.has(d.nodeId)) : [];
    }
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      rows = rows.filter((d) => [d.devMstName, d.macAddr, d.ipAddr, d.firmVersion, d.dnNo].some((f) => f != null && String(f).toLowerCase().includes(kw)));
    }
    return rows;
  }, [devices, selectedNodeId, selectedTenantId, tenantNodeIds, searchText]);

  // 헤더 요약 — 현재 필터 기준 총/펌웨어사용/프로비저닝성공.
  const summary = useMemo(() => {
    let firmUpd = 0;
    let provSuccess = 0;
    for (const d of devicesForGrid) {
      if (d.firmUpdUseYn === 1) firmUpd += 1;
      if (d.provResult === 1) provSuccess += 1;
    }
    return { total: devicesForGrid.length, firmUpd, provSuccess };
  }, [devicesForGrid]);

  const invalidateDevices = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: deviceQueryKeys.list._def });
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

  // ─── Handlers ───────────────────────────────────────────────────────────────
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

  // 등록 버튼 — 단말기는 노드에 소속되고 폼에서 노드를 고르지 않으므로 노드 선택 필수.
  const handleCreate = useCallback(() => {
    if (!selectedNodeId) {
      toast.warning('노드를 선택한 후 등록하세요');
      return;
    }
    const nodeName = assignedNodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? '';
    drawerRef.current?.openCreate(selectedNodeId, nodeName);
  }, [selectedNodeId, assignedNodes]);

  // 가져오기 버튼 — 노드 선택 필수 (Excel 업로드가 노드 단위).
  const handleImport = useCallback(() => {
    if (!selectedNodeId) {
      toast.warning('노드를 선택한 후 가져오세요');
      return;
    }
    setImportOpen(true);
  }, [selectedNodeId]);

  // 수정 (더블클릭)
  const handleEdit = useCallback(
    (data: DevMasterResponse) => {
      const nodeName = assignedNodes.find((n) => n.nodeId === data.nodeId)?.nodeName ?? '';
      drawerRef.current?.openEdit(data, nodeName);
    },
    [assignedNodes],
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
      { field: 'ipAddr', headerName: 'IP 주소', flex: 1, minWidth: 120, tooltipField: 'ipAddr' },
      { field: 'firmVersion', headerName: '펌웨어버전', flex: 1, minWidth: 110, tooltipField: 'firmVersion' },
      {
        field: 'firmUpdUseYn',
        headerName: '펌웨어사용',
        flex: 0.7,
        minWidth: 90,
        filterValueGetter: (p) => (p.data?.firmUpdUseYn === 1 ? '사용' : '미사용'),
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
        filterValueGetter: (p) => (p.data?.firmUpdResult === 1 ? '성공' : p.data?.firmUpdResult === 0 ? '실패' : '-'),
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
        filterValueGetter: (p) => (p.data?.provResult === 1 ? '성공' : p.data?.provResult === 0 ? '실패' : '-'),
        valueFormatter: (p) => (p.value === 1 ? '성공' : p.value === 0 ? '실패' : '-'),
      },
    ],
    [deviceTypeMap],
  );

  // ag-Grid 34: rowSelection 은 gridOptions 밖 직접 prop 으로 (초기 마운트 1회 제한 우회)
  const rowSelection = useMemo(() => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }), []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스1: 헤더 (노드/테넌트 스코프 + 요약 + 검색/액션) ===== */}
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
          {/* 테넌트 필터 — 운영자 모드에서만 노출(일반 콘솔은 토큰 스코프) */}
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
              value={tenantFilter == null ? null : String(tenantFilter)}
              onChange={(id) => {
                setTenantFilter(id == null ? null : Number(id));
                setSelectedRows([]);
              }}
            />
          )}
          {/* 요약 — 총/펌웨어사용/프로비저닝성공 */}
          <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
            <span className="text-gray-500">
              총 단말기 <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              펌웨어사용 <b className="text-blue-600 font-semibold">{summary.firmUpd.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              프로비저닝성공 <b className="text-green-600 font-semibold">{summary.provSuccess.toLocaleString()}</b>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="단말기명/MAC 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Button icon={<Upload className="size-3.5" />} onClick={handleImport}>
              가져오기
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 박스2: ag-Grid (필터된 단말기 목록) ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">단말기 목록</span>
          <span className="text-xs text-gray-500">
            총 {devicesForGrid.length.toLocaleString()}건{selectedRows.length > 0 ? ` · 선택 ${selectedRows.length}건` : ''}
          </span>
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
