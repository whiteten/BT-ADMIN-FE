/**
 * 수신번호 차단 관리 목록 페이지
 * Pattern: 상단 노드 탭 바 + 테넌트 카드 슬라이더 + 하단 ag-Grid
 *
 * Layout:
 * +----------------------------------------------------------+
 * | [전체] [C1N1] [C1N2] [테스트노드]    [검색] [+추가]         |
 * | [테넌트A 카드] [테넌트B 카드] ...                           |
 * +----------------------------------------------------------+
 * | {노드} / {테넌트} 수신번호차단 (n건)                        |
 * | ag-Grid: 테넌트명 | 차단번호패턴 | 차단설명 | 삭제            |
 * +----------------------------------------------------------+
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, Layers, Network, Plus, Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CallScreenDrawer, { type CallScreenDrawerRef } from '../../features/call-screen/components/CallScreenDrawer';
import { callScreenQueryKeys, useDeleteCallScreen, useGetCallScreenList, useGetNodeTenants } from '../../features/call-screen/hooks/useCallScreenQueries';
import type { CallScreen } from '../../features/call-screen/types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '회선관리', path: '/ipron/line/call-screen' },
  { title: '수신번호차단관리', path: '/ipron/line/call-screen' },
];

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

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  /** 카드 슬라이더 필터용 (테넌트명/노드명) */
  const [cardSearchText, setCardSearchText] = useState('');
  /** 번호패턴 서버사이드 LIKE 검색어 — SWAT IPR20S1060L numPattern 대응 */
  const [numPatternSearch, setNumPatternSearch] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

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
    if (selectedTenantId === -1 || selectedTenantId === null) return nodeCallScreens;
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

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteCallScreen } = useDeleteCallScreen({
    mutationOptions: {
      onSuccess: () => {
        toast.success('수신번호 차단이 삭제되었습니다.');
        invalidateList();
      },
    },
  });

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateList = useCallback(() => {
    if (nodeListParams) {
      queryClient.invalidateQueries({
        queryKey: callScreenQueryKeys.getList(nodeListParams).queryKey,
      });
    }
    if (numPatternParams) {
      queryClient.invalidateQueries({
        queryKey: callScreenQueryKeys.getList(numPatternParams).queryKey,
      });
    }
  }, [queryClient, nodeListParams, numPatternParams]);

  // ─── Derived data: 노드 > 테넌트 구조 ──────────────────────────────────────
  interface TenantInfo {
    tenantId: number;
    tenantName: string;
    nodeId: number;
    nodeName: string;
  }
  interface NodeGroup {
    nodeId: number;
    nodeName: string;
    tenantCount: number;
  }

  const { nodeGroups, allTenants } = useMemo(() => {
    const nodeMap = new Map<number, { nodeName: string; tenantMap: Map<number, string> }>();

    for (const nt of nodeTenants) {
      if (!nodeMap.has(nt.nodeId)) {
        nodeMap.set(nt.nodeId, { nodeName: nt.nodeName, tenantMap: new Map() });
      }
      const node = nodeMap.get(nt.nodeId)!;
      if (!node.tenantMap.has(nt.tenantId)) {
        node.tenantMap.set(nt.tenantId, nt.tenantName);
      }
    }

    const groups: NodeGroup[] = [];
    const tenants: TenantInfo[] = [];

    for (const [nodeId, data] of Array.from(nodeMap.entries()).sort((a, b) => a[0] - b[0])) {
      groups.push({ nodeId, nodeName: data.nodeName, tenantCount: data.tenantMap.size });
      for (const [tenantId, tenantName] of data.tenantMap.entries()) {
        tenants.push({ tenantId, tenantName, nodeId, nodeName: data.nodeName });
      }
    }

    return { nodeGroups: groups, allTenants: tenants };
  }, [nodeTenants]);

  // 카드 검색 + 노드 필터 적용된 테넌트 카드 목록
  const isCardSearching = cardSearchText.trim().length > 0;

  const filteredTenants = useMemo(() => {
    let list = allTenants;

    // 카드 검색 중이면 노드 필터 무시, 아니면 선택된 노드 필터 적용
    if (!isCardSearching && selectedNodeId !== null) {
      list = list.filter((t) => t.nodeId === selectedNodeId);
    }

    if (isCardSearching) {
      const kw = cardSearchText.trim().toLowerCase();
      list = list.filter((t) => t.tenantName.toLowerCase().includes(kw) || t.nodeName.toLowerCase().includes(kw));
    }

    return list;
  }, [allTenants, selectedNodeId, isCardSearching, cardSearchText]);

  // 노드별 테넌트 수 (카드 검색 결과 기준)
  const tenantCountByNode = useMemo(() => {
    const map = new Map<number, number>();
    const source = isCardSearching ? filteredTenants : allTenants;
    for (const t of source) {
      map.set(t.nodeId, (map.get(t.nodeId) ?? 0) + 1);
    }
    return map;
  }, [allTenants, filteredTenants, isCardSearching]);

  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return '';
    return nodeGroups.find((g) => g.nodeId === selectedNodeId)?.nodeName ?? '';
  }, [nodeGroups, selectedNodeId]);

  const selectedTenantName = useMemo(() => {
    if (!selectedTenantId) return '';
    return allTenants.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? '';
  }, [allTenants, selectedTenantId]);

  // Auto-select: 첫 노드 자동 선택
  useEffect(() => {
    if (selectedNodeId === null && nodeGroups.length > 0) {
      setSelectedNodeId(nodeGroups[0].nodeId);
    }
  }, [nodeGroups, selectedNodeId]);

  // Auto-select: 노드 선택되면 기본으로 "전체 테넌트"(-1)에 포커스
  useEffect(() => {
    if (selectedNodeId !== null && selectedTenantId === null) {
      setSelectedTenantId(-1);
    }
  }, [selectedNodeId, selectedTenantId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedTenantId(null);
    setCardSearchText('');
    setNumPatternSearch('');
  };

  const handleCardSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCardSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      // 카드 검색 시 노드/테넌트 선택 자동 해제
      setSelectedNodeId(null);
      setSelectedTenantId(null);
      setNumPatternSearch('');
    }
  };

  const handleCardSelect = (tenant: TenantInfo) => {
    setSelectedNodeId(tenant.nodeId);
    setSelectedTenantId(tenant.tenantId);
  };

  const handleCreate = useCallback(() => {
    if (!selectedNodeId || !selectedTenantId) {
      toast.warning('노드와 테넌트를 먼저 선택하세요.');
      return;
    }
    drawerRef.current?.open(undefined, selectedNodeId, selectedNodeName, selectedTenantId, selectedTenantName);
  }, [selectedNodeId, selectedTenantId, selectedNodeName, selectedTenantName]);

  const handleEdit = useCallback((item: CallScreen) => {
    drawerRef.current?.open(item);
  }, []);

  const handleDelete = useCallback(
    (item: CallScreen) => {
      modal.confirm.execute({
        onOk: () => deleteCallScreen({ id: item.callscreenId }),
        options: {
          title: '수신번호 차단 삭제',
          content: `"${item.numPattern}" 차단을 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteCallScreen],
  );

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
        valueFormatter: (params) => params.data?.nodeName ?? `Node ${params.data?.nodeId ?? '-'}`,
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
        cellStyle: { fontFamily: 'monospace' },
      },
      {
        headerName: '차단설명',
        field: 'screenDesc',
        flex: 1.5,
        minWidth: 160,
        valueFormatter: (params) => params.data?.screenDesc ?? '-',
      },
      {
        headerName: '',
        field: 'callscreenId',
        width: 50,
        maxWidth: 50,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<CallScreen>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              className="flex items-center justify-center w-full h-full"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(params.data!);
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [handleDelete],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 탭 바 + 테넌트 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* Header: 노드 탭 바 + 검색 + 추가 버튼 */}
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            {/* 좌측 스크롤 버튼 */}
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
              {/* 노드 탭들 */}
              {nodeGroups.map((node) => {
                const count = tenantCountByNode.get(node.nodeId) ?? 0;
                const isActive = selectedNodeId === node.nodeId;
                return (
                  <button
                    key={node.nodeId}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] max-w-[200px] flex-shrink-0 transition-colors ${
                      isActive ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                    }`}
                    onClick={(e) => {
                      handleNodeSelect(node.nodeId);
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                  >
                    <Network className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{node.nodeName}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* 우측 스크롤 버튼 */}
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              aria-label="다음 탭"
            >
              <ChevronRight className="size-4 text-gray-500" />
            </button>

            {/* 우측: 번호패턴 검색(서버사이드) + 카드 검색 + 추가 버튼 */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              {/* 번호패턴 서버사이드 LIKE 검색 — SWAT "차단번호패턴" 검색란 대응 */}
              <Input.Search
                allowClear
                placeholder="차단번호패턴 검색"
                value={numPatternSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setNumPatternSearch(val);
                  if (val.trim().length > 0) {
                    setCardSearchText('');
                  }
                }}
                onSearch={(val) => {
                  setNumPatternSearch(val);
                  if (val.trim().length > 0) {
                    setCardSearchText('');
                  }
                }}
                style={{ width: 180 }}
              />
              {/* 카드 슬라이더 필터 (테넌트명/노드명) */}
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="테넌트 검색"
                value={cardSearchText}
                onChange={handleCardSearchChange}
                style={{ width: 140 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                추가
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 카드 슬라이더 박스 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* Card slider body */}
          <div className="flex items-center h-[170px] px-4 py-3">
            {filteredTenants.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">{isCardSearching ? '검색 결과가 없습니다' : '테넌트가 없습니다'}</span>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 w-full">
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {/* 전체 테넌트 카드 (선택 노드의 모든 테넌트 차단번호 통합 조회) */}
                  {selectedNodeId && !isCardSearching && !isNumPatternSearching && (
                    <div
                      key="__all_tenant__"
                      className={`border rounded-lg p-3 cursor-pointer transition-all w-[110px] h-[130px] flex-shrink-0 flex flex-col items-center justify-center gap-1 ${
                        selectedTenantId === -1
                          ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                          : 'border-dashed border-gray-300 bg-white text-gray-500 hover:border-[#c5cbe0] hover:text-[#405189]'
                      }`}
                      onClick={() => setSelectedTenantId(-1)}
                    >
                      <Layers className="size-5" />
                      <span className="text-sm font-semibold">전체</span>
                      <span className={`text-[11px] ${selectedTenantId === -1 ? 'text-white/80' : 'text-gray-400'}`}>차단 {nodeCallScreens.length}건</span>
                    </div>
                  )}

                  {filteredTenants.map((tenant) => {
                    const isCardSelected = selectedNodeId === tenant.nodeId && selectedTenantId === tenant.tenantId;
                    const count = callScreenCountByTenant.get(tenant.tenantId) ?? 0;
                    return (
                      <div
                        key={`${tenant.nodeId}-${tenant.tenantId}`}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[130px] flex-shrink-0 flex flex-col ${
                          isCardSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          handleCardSelect(tenant);
                          (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                      >
                        {/* Card header: 테넌트명 */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-gray-800 truncate">{tenant.tenantName}</span>
                        </div>

                        {/* Card info: 노드명 */}
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Network className="size-3 text-gray-400" />
                            <span className="truncate">{tenant.nodeName}</span>
                          </div>
                        </div>

                        {/* 하단 태그: 차단번호 등록건수 */}
                        <div className="flex flex-wrap gap-1 mt-auto pt-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              count > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
                            }`}
                          >
                            {count > 0 ? `차단 ${count}건` : '미등록'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
              </div>
            )}
          </div>
        </div>

        {/* ===== 하단: 차단번호 그리드 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {(selectedNodeId && selectedTenantId) || isNumPatternSearching ? (
            <>
              {/* Grid header */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-semibold text-gray-800">
                  {isNumPatternSearching
                    ? `차단번호패턴 "${numPatternSearch.trim()}" 검색 결과 (${callScreens.length}건)`
                    : `${selectedNodeName} / ${selectedTenantId === -1 ? '전체 테넌트' : selectedTenantName} 수신번호차단 (${callScreens.length}건)`}
                </span>
              </div>

              {/* Grid */}
              <div className="flex-1">
                {callScreens.length === 0 && !isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                    <Empty description={false} />
                    <span className="text-sm">{isNumPatternSearching ? '검색 결과가 없습니다' : '이 테넌트에 등록된 차단번호가 없습니다'}</span>
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
                    loading={isLoading}
                    getRowId={(params) => String(params.data.callscreenId)}
                    defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                    onRowDoubleClicked={(e) => {
                      if (e.data) handleEdit(e.data);
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            /* Empty state when no tenant selected */
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
              <Empty description={false} />
              <span className="text-sm">상단에서 테넌트를 선택하세요</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Drawer ===== */}
      <CallScreenDrawer ref={drawerRef} onSuccess={handleDrawerSuccess} />
    </div>
  );
}
