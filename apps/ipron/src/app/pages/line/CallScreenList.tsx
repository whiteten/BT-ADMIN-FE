/**
 * 수신번호 차단 관리 목록 페이지
 *
 * 멀티테넌트 개편(상담사 관리 정합): 상단 노드 탭바 + 테넌트 카드 슬라이더 → 셀렉트박스 + 요약으로 단순화.
 *   - 노드 Select (수신번호차단은 노드 단위 구성 — 필수 선택, "전체 노드" 없음).
 *   - 테넌트 ScopeSelect (전체 포함, 노드 로드 결과에 대한 클라이언트 필터).
 *   - 옆에 요약(총 차단번호 / 테넌트 수).
 *   - 하단: 차단번호 목록 ag-Grid.
 *
 * 데이터 흐름: 선택 노드 단위로 차단번호 1회 조회(nodeId 서버 param) → 테넌트는 클라이언트 필터.
 *   번호패턴 검색은 서버사이드 LIKE(SWAT IPR20S1060L numPattern 대응) — 검색 중엔 노드/테넌트 필터 무시.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input, Select } from 'antd';
import { Network, Plus, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CallScreenDrawer, { type CallScreenDrawerRef } from '../../features/call-screen/components/CallScreenDrawer';
import { callScreenQueryKeys, useDeleteCallScreenBatch, useGetCallScreenList, useGetNodeTenants } from '../../features/call-screen/hooks/useCallScreenQueries';
import type { CallScreen } from '../../features/call-screen/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '회선관리' }, { title: '번호 변환' }, { title: '수신번호차단관리', path: '/ipron/line/call-screen' }];

export default function CallScreenList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // ─── 운영자/테넌트 스코프 ───────────────────────────────────────────────────
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  // 운영자 전용 테넌트 필터(null=전체 테넌트, 클라이언트 필터). 일반 모드는 ctxTenantId 로 파생.
  const [tenantFilter, setTenantFilter] = useState<number | null>(null);
  const selectedTenantId = operatorMode ? tenantFilter : ctxTenantId;
  /** 번호패턴 서버사이드 LIKE 검색어 — SWAT IPR20S1060L numPattern 대응 */
  const [numPatternSearch, setNumPatternSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<CallScreen[]>([]);

  const hasInitializedNodeRef = useRef(false);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const drawerRef = useRef<CallScreenDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodeTenants = [] } = useGetNodeTenants();

  const isNumPatternSearching = numPatternSearch.trim().length > 0;

  // 번호패턴 검색 모드: 서버 LIKE 검색 — SWAT numPattern 조건 대응
  const numPatternParams = useMemo(
    () =>
      isNumPatternSearching
        ? {
            numPattern: numPatternSearch.trim(),
            ...(selectedNodeId ? { nodeId: selectedNodeId } : {}),
          }
        : undefined,
    [isNumPatternSearching, numPatternSearch, selectedNodeId],
  );
  const { data: numPatternResults = [], isLoading: isNumPatternLoading } = useGetCallScreenList({
    params: numPatternParams,
    queryOptions: { enabled: !!numPatternParams },
  });

  // 노드 선택 모드: 선택된 노드의 전체 차단번호 1회 fetch → 클라이언트에서 테넌트별 필터 + 카운트
  const nodeListParams = useMemo(() => (selectedNodeId && !isNumPatternSearching ? { nodeId: selectedNodeId } : undefined), [selectedNodeId, isNumPatternSearching]);
  const { data: nodeCallScreens = [], isLoading: isNodeLoading } = useGetCallScreenList({
    params: nodeListParams,
    queryOptions: { enabled: !!nodeListParams },
  });

  const isLoading = isNumPatternSearching ? isNumPatternLoading : isNodeLoading;

  // 그리드 표시용: 번호패턴 검색이면 서버 결과, 아니면 노드/테넌트 필터
  const callScreens = useMemo(() => {
    if (isNumPatternSearching) return numPatternResults;
    if (selectedTenantId == null) return nodeCallScreens;
    return nodeCallScreens.filter((cs) => cs.tenantId === selectedTenantId);
  }, [isNumPatternSearching, numPatternResults, nodeCallScreens, selectedTenantId]);

  // 테넌트별 차단번호 개수
  const callScreenCountByTenant = useMemo(() => {
    const map = new Map<number, number>();
    for (const cs of nodeCallScreens) {
      map.set(cs.tenantId, (map.get(cs.tenantId) ?? 0) + 1);
    }
    return map;
  }, [nodeCallScreens]);

  // ─── Derived data: 노드 > 테넌트 구조 ──────────────────────────────────────
  interface NodeGroup {
    nodeId: number;
    nodeName: string;
  }
  interface TenantInfo {
    tenantId: number;
    tenantName: string;
    nodeId: number;
  }

  const { nodeGroups, tenantsByNode } = useMemo(() => {
    const nodeMap = new Map<number, { nodeName: string; tenantMap: Map<number, string> }>();

    for (const nt of nodeTenants) {
      let node = nodeMap.get(nt.nodeId);
      if (!node) {
        node = { nodeName: nt.nodeName, tenantMap: new Map() };
        nodeMap.set(nt.nodeId, node);
      }
      node.tenantMap.set(nt.tenantId, nt.tenantName);
    }

    const groups: NodeGroup[] = [];
    const byNode = new Map<number, TenantInfo[]>();

    for (const [nodeId, data] of Array.from(nodeMap.entries()).sort((a, b) => a[0] - b[0])) {
      groups.push({ nodeId, nodeName: data.nodeName });
      byNode.set(
        nodeId,
        Array.from(data.tenantMap.entries()).map(([tenantId, tenantName]) => ({ tenantId, tenantName, nodeId })),
      );
    }

    return { nodeGroups: groups, tenantsByNode: byNode };
  }, [nodeTenants]);

  // 선택 노드의 테넌트 목록 (ScopeSelect 옵션 — 차단번호 0건 테넌트도 등록 대상으로 노출)
  const tenantOptions = useMemo(() => {
    if (selectedNodeId == null) return [];
    const list = tenantsByNode.get(selectedNodeId) ?? [];
    return list.map((t) => ({ id: t.tenantId, name: t.tenantName, count: callScreenCountByTenant.get(t.tenantId) ?? 0 })).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedNodeId, tenantsByNode, callScreenCountByTenant]);

  // 헤더 요약 — 선택 노드 기준 총 차단번호 / 테넌트 수
  const summary = useMemo(() => ({ total: nodeCallScreens.length, tenant: tenantOptions.length }), [nodeCallScreens, tenantOptions]);

  const selectedNodeName = useMemo(() => nodeGroups.find((g) => g.nodeId === selectedNodeId)?.nodeName ?? '', [nodeGroups, selectedNodeId]);
  const selectedTenantName = useMemo(() => (selectedTenantId == null ? '' : (tenantOptions.find((t) => t.id === selectedTenantId)?.name ?? '')), [tenantOptions, selectedTenantId]);

  // Auto-select: 첫 노드 자동 선택
  useEffect(() => {
    if (nodeGroups.length > 0 && !hasInitializedNodeRef.current && selectedNodeId == null) {
      hasInitializedNodeRef.current = true;
      setSelectedNodeId(nodeGroups[0].nodeId);
    }
  }, [nodeGroups, selectedNodeId]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const invalidateList = useCallback(() => {
    if (nodeListParams) {
      queryClient.invalidateQueries({ queryKey: callScreenQueryKeys.getList(nodeListParams).queryKey });
    }
    if (numPatternParams) {
      queryClient.invalidateQueries({ queryKey: callScreenQueryKeys.getList(numPatternParams).queryKey });
    }
  }, [queryClient, nodeListParams, numPatternParams]);

  const { mutate: deleteCallScreenBatch } = useDeleteCallScreenBatch({
    mutationOptions: {
      onSuccess: () => {
        toast.success('수신번호 차단이 삭제되었습니다');
        invalidateList();
        setSelectedRows([]);
      },
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeChange = useCallback((nodeId: number) => {
    setSelectedNodeId(nodeId);
    setTenantFilter(null);
    setNumPatternSearch('');
    setSelectedRows([]);
  }, []);

  const handleCreate = useCallback(() => {
    if (selectedNodeId == null || selectedTenantId == null) {
      toast.warning('노드와 특정 테넌트를 선택하세요');
      return;
    }
    drawerRef.current?.open(undefined, selectedNodeId, selectedNodeName, selectedTenantId, selectedTenantName);
  }, [selectedNodeId, selectedTenantId, selectedNodeName, selectedTenantName]);

  const handleEdit = useCallback((item: CallScreen) => {
    drawerRef.current?.open(item);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => deleteCallScreenBatch(selectedRows.map((item) => item.callscreenId)),
      options: {
        title: '수신번호 차단 삭제',
        content: `선택한 ${selectedRows.length}건의 차단번호를 삭제하시겠습니까?`,
      },
    });
  }, [modal, selectedRows, deleteCallScreenBatch]);

  const handleDrawerSuccess = useCallback(() => {
    invalidateList();
  }, [invalidateList]);

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<CallScreen>[] = useMemo(
    () => [
      {
        headerName: '노드명',
        field: 'nodeName',
        flex: 1,
        minWidth: 110,
        valueFormatter: (params) => params.data?.nodeName ?? '-',
      },
      {
        headerName: '테넌트명',
        field: 'tenantName',
        flex: 1,
        minWidth: 120,
      },
      {
        headerName: '차단번호패턴',
        field: 'numPattern',
        flex: 2,
        minWidth: 200,
        tooltipField: 'numPattern',
        cellStyle: { fontFamily: 'monospace' },
      },
      {
        headerName: '차단설명',
        field: 'screenDesc',
        flex: 1.5,
        minWidth: 160,
        tooltipField: 'screenDesc',
        valueFormatter: (params) => params.data?.screenDesc ?? '-',
      },
    ],
    [],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스A: 헤더 (노드/테넌트 스코프 + 요약) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          {/* 노드 선택 (수신번호차단은 노드 단위 — 필수) */}
          <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
            <Network className="size-3.5 shrink-0 text-blue-600" />
            <Select
              size="small"
              variant="borderless"
              value={selectedNodeId ?? undefined}
              onChange={handleNodeChange}
              placeholder="노드 선택"
              options={nodeGroups.map((n) => ({ value: n.nodeId, label: n.nodeName }))}
              style={{ width: 150 }}
              popupMatchSelectWidth={false}
            />
          </div>
          {/* 테넌트 필터 (전체 포함, 클라이언트 필터) — 운영자 모드에서만 노출 */}
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={tenantOptions}
              value={tenantFilter == null ? null : String(tenantFilter)}
              onChange={(id) => {
                setTenantFilter(id == null ? null : Number(id));
                setSelectedRows([]);
              }}
            />
          )}
          {/* 요약 — 총 차단번호 / 테넌트 수 */}
          <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
            <span className="text-gray-500">
              총 차단번호 <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              테넌트 <b className="text-[#405189] font-semibold">{summary.tenant.toLocaleString()}</b>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* 번호패턴 서버사이드 LIKE 검색 — SWAT "차단번호패턴" 검색란 대응 */}
            <Input.Search
              allowClear
              placeholder="차단번호패턴 검색"
              value={numPatternSearch}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNumPatternSearch(e.target.value)}
              onSearch={(val) => setNumPatternSearch(val)}
              style={{ width: 200 }}
            />
          </div>
        </div>
      </div>

      {/* ===== 박스B: 차단번호 목록 ag-Grid ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">
            {isNumPatternSearching
              ? `차단번호패턴 "${numPatternSearch.trim()}" 검색 결과`
              : `${selectedNodeName || '수신번호차단'} / ${selectedTenantId == null ? '전체 테넌트' : selectedTenantName}`}
          </span>
          <span className="text-xs text-gray-500">
            총 {callScreens.length.toLocaleString()}건{selectedRows.length > 0 ? ` · 선택 ${selectedRows.length}건` : ''}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleDeleteSelected}
              disabled={selectedRows.length === 0}
              title={selectedRows.length === 0 ? '삭제할 항목을 선택하세요' : `선택한 ${selectedRows.length}건 삭제`}
            >
              삭제
            </Button>
            <Button
              type="primary"
              icon={<Plus className="size-3.5" />}
              onClick={handleCreate}
              disabled={selectedNodeId == null || selectedTenantId == null}
              title={selectedNodeId == null || selectedTenantId == null ? '노드와 특정 테넌트를 선택하세요' : undefined}
            >
              추가
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {callScreens.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <Empty description={false} />
              <span className="text-sm">{isNumPatternSearching ? '검색 결과가 없습니다' : '등록된 차단번호가 없습니다'}</span>
            </div>
          ) : (
            <AgGridReact<CallScreen>
              rowData={callScreens}
              columnDefs={columnDefs}
              gridOptions={{
                ...gridOptions,
                statusBar: undefined,
                pagination: false,
                sideBar: false,
              }}
              rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }}
              loading={isLoading}
              getRowId={(params) => String(params.data.callscreenId)}
              defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
              onRowDoubleClicked={(e) => {
                if (e.data) handleEdit(e.data);
              }}
              onSelectionChanged={(e) => setSelectedRows(e.api.getSelectedRows())}
            />
          )}
        </div>
      </div>

      {/* ===== Drawer ===== */}
      <CallScreenDrawer ref={drawerRef} onSuccess={handleDrawerSuccess} />
    </div>
  );
}
