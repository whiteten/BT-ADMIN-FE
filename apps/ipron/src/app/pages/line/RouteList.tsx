/**
 * 발신라우트 관리 목록 페이지
 * 상단: 노드 탭 바 + 카드 슬라이더
 * 하단: 선택 라우트의 국선 배정 ag-Grid
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input } from 'antd';
import { Ban, ChevronLeft, ChevronRight, Layers, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { ENDPOINT_TYPE_LABELS } from '../../features/endpoint/types';
import RoutePointDialog, { type RoutePointDialogRef } from '../../features/route/components/RoutePointDialog';
import { routeQueryKeys, useDeleteRoute, useDeleteRoutePoint, useGetNodes, useGetRoutePoints, useGetRoutes } from '../../features/route/hooks/useRouteQueries';
import { ANI_TYPE_LABELS, ROUTE_TYPE_LABELS, type Route, type RoutePoint, getRouteStatusInfo, getRouteTagList } from '../../features/route/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '회선관리' }, { title: '호 라우팅' }, { title: '발신라우트', path: '/ipron/line/route' }];

export default function RouteList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // URL query params for initial selection (after create/edit navigation)
  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const initRouteId = searchParams.get('routeId') ? Number(searchParams.get('routeId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(initRouteId);
  const [searchText, setSearchText] = useState('');
  const [selectedRoutePoints, setSelectedRoutePoints] = useState<RoutePoint[]>([]);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const routePointDialogRef = useRef<RoutePointDialogRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: routes = [] } = useGetRoutes();
  const { data: nodes = [] } = useGetNodes();

  const { data: routePoints = [], isLoading: isPointsLoading } = useGetRoutePoints({
    params: selectedRouteId ? { id: selectedRouteId } : undefined,
    queryOptions: { enabled: !!selectedRouteId },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteRoute } = useDeleteRoute({
    mutationOptions: {
      onSuccess: () => {
        toast.success('라우트가 삭제되었습니다');
        if (selectedRouteId) setSelectedRouteId(null);
        invalidateRoutes();
      },
    },
  });

  const { mutate: deleteRoutePoint } = useDeleteRoutePoint({
    mutationOptions: {
      onSuccess: () => {
        toast.success('국선 배정이 해제되었습니다');
        invalidateRoutePoints();
        invalidateRoutes();
      },
    },
  });

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateRoutes = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: routeQueryKeys.getRoutes().queryKey });
  }, [queryClient]);

  const invalidateRoutePoints = useCallback(() => {
    if (selectedRouteId) {
      queryClient.invalidateQueries({
        queryKey: routeQueryKeys.getRoutePoints({ id: selectedRouteId }).queryKey,
      });
    }
  }, [queryClient, selectedRouteId]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const searchFilteredRoutes = useMemo(() => {
    if (!isSearching) return routes;
    const kw = searchText.trim().toLowerCase();
    return routes.filter((r) => [r.routeName, r.nodeName].some((v) => v?.toString().toLowerCase().includes(kw)));
  }, [routes, isSearching, searchText]);

  const filteredRoutes = useMemo(
    () => (isSearching || selectedNodeId === null ? searchFilteredRoutes : searchFilteredRoutes.filter((r) => r.nodeId === selectedNodeId)),
    [searchFilteredRoutes, selectedNodeId, isSearching],
  );

  const selectedRoute = useMemo(() => {
    if (!selectedRouteId) return null;
    return routes.find((r) => r.routeId === selectedRouteId) ?? null;
  }, [routes, selectedRouteId]);

  // ─── Auto-select first route when none selected ──────────────────────────
  useEffect(() => {
    if (!selectedRouteId && filteredRoutes.length > 0) {
      setSelectedRouteId(filteredRoutes[0].routeId);
    }
  }, [filteredRoutes, selectedRouteId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedRouteId(null);
    setSearchText('');
  };

  const handleCardSelect = (route: Route) => {
    setSelectedRouteId(route.routeId);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setSelectedNodeId(null);
      setSelectedRouteId(null);
    }
  };

  const handleCreate = useCallback(() => {
    navigate('/ipron/line/route/create' + (selectedNodeId ? `?nodeId=${selectedNodeId}` : ''));
  }, [navigate, selectedNodeId]);

  const handleEdit = useCallback(
    (route: Route) => {
      navigate(`/ipron/line/route/${route.routeId}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (route: Route) => {
      if ((route.routePointCount ?? 0) > 0) {
        toast.error(`배정된 국선 ${route.routePointCount}건이 있어 삭제할 수 없습니다`);
        return;
      }
      modal.confirm.execute({
        onOk: () => deleteRoute({ id: route.routeId }),
        options: {
          title: '라우트 삭제',
          content: `"${route.routeName}" 라우트를 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteRoute],
  );

  const handlePointDelete = useCallback(
    (points: RoutePoint[]) => {
      if (!selectedRouteId || points.length === 0) return;
      modal.confirm.execute({
        onOk: () => {
          points.forEach((point) => deleteRoutePoint({ id: selectedRouteId, endptId: point.endptId }));
          setSelectedRoutePoints([]);
        },
        options: {
          title: '국선 배정 해제',
          content: points.length === 1 ? `"${points[0].endptName}" 국선 배정을 해제하시겠습니까?` : `선택한 국선 ${points.length}건의 배정을 해제하시겠습니까?`,
        },
      });
    },
    [modal, deleteRoutePoint, selectedRouteId],
  );

  const handlePointDialogSuccess = useCallback(() => {
    invalidateRoutePoints();
    invalidateRoutes();
  }, [invalidateRoutePoints, invalidateRoutes]);

  const getCardMenuItems = (route: Route) => [
    {
      key: 'edit',
      label: '수정',
      onClick: () => handleEdit(route),
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <Trash2 className="size-4" />,
      danger: true,
      onClick: () => handleDelete(route),
    },
  ];

  // ─── ag-Grid: RoutePoint columns ────────────────────────────────────────
  const pointColumnDefs: ColDef<RoutePoint>[] = useMemo(
    () => [
      {
        headerName: '노드',
        field: 'nodeName',
        flex: 1,
        minWidth: 80,
        tooltipField: 'nodeName',
        cellRenderer: (params: ICellRendererParams<RoutePoint>) => {
          if (!params.data) return null;
          return params.data.nodeName ?? '-';
        },
      },
      {
        headerName: '구분',
        field: 'endptType',
        flex: 1,
        minWidth: 80,
        filterValueGetter: (params) => (params.data ? (ENDPOINT_TYPE_LABELS[params.data.endptType] ?? `유형${params.data.endptType}`) : null),
        cellRenderer: (params: ICellRendererParams<RoutePoint>) => {
          if (!params.data) return null;
          return ENDPOINT_TYPE_LABELS[params.data.endptType] ?? `유형${params.data.endptType}`;
        },
      },
      {
        headerName: '국선명',
        field: 'endptName',
        flex: 2,
        minWidth: 120,
        tooltipField: 'endptName',
      },
      {
        headerName: '백업구분',
        field: 'backupGb',
        flex: 1,
        minWidth: 90,
        filterValueGetter: (params) => params.data?.backupGb ?? '-',
        cellRenderer: (params: ICellRendererParams<RoutePoint>) => {
          if (!params.data) return null;
          const gb = params.data.backupGb ?? '';
          if (gb.includes('로컬')) {
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
                로컬노드
              </span>
            );
          }
          if (gb.includes('DR')) {
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#e6f4ff', color: '#1677ff' }}>
                DR노드
              </span>
            );
          }
          if (gb.includes('리모트')) {
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fff7e6', color: '#fa8c16' }}>
                리모트 노드
              </span>
            );
          }
          return gb || '-';
        },
      },
      {
        headerName: '우선순위',
        field: 'epPriority',
        flex: 1,
        minWidth: 70,
        filter: 'agNumberColumnFilter',
      },
    ],
    [],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Single column: Top (Tab bar + Card slider) + Bottom (Grid) */}
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== Top: Node Tab Bar + Card Slider ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* Header: 노드 탭 바 + 검색 + 추가 버튼 */}
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            {/* 좌측 스크롤 버튼 */}
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
            >
              <ChevronLeft className="size-4 text-gray-500" />
            </button>

            {/* 탭 스크롤 컨테이너 */}
            <div
              ref={tabScrollRef}
              className="flex items-stretch max-w-[900px] min-w-0 overflow-x-auto divide-x divide-gray-200"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* 전체 탭 */}
              <button
                type="button"
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] max-w-[200px] flex-shrink-0 transition-colors ${
                  selectedNodeId === null && !isSearching
                    ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]'
                    : 'text-gray-500 border-b-transparent hover:text-gray-700'
                }`}
                onClick={() => {
                  setSelectedNodeId(null);
                  setSearchText('');
                  setSelectedRouteId(null);
                }}
              >
                <Layers className="size-3.5" />
                <span>전체</span>
                <span className="text-[11px] text-gray-400">({searchFilteredRoutes.length})</span>
              </button>

              {/* 노드 탭들 */}
              {nodes.map((node) => {
                const nodeRoutes = searchFilteredRoutes.filter((r) => r.nodeId === node.nodeId);
                const isActive = selectedNodeId === node.nodeId && !isSearching;
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
                    <span className="text-[11px] text-gray-400 flex-shrink-0">({nodeRoutes.length})</span>
                  </button>
                );
              })}
            </div>

            {/* 우측 스크롤 버튼 */}
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            >
              <ChevronRight className="size-4 text-gray-500" />
            </button>

            {/* 우측: 검색 + 추가 */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="발신라우트 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
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
          <div className="flex items-center px-4 py-3 h-[185px]">
            {filteredRoutes.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3">
                <Empty description={false} />
                <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : '등록된 라우트가 없습니다'}</span>
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
                  {filteredRoutes.map((route) => {
                    const isCardSelected = selectedRouteId === route.routeId;
                    const tags = getRouteTagList(route);
                    const status = getRouteStatusInfo(route);
                    return (
                      <div
                        key={route.routeId}
                        id={`route-card-${route.routeId}`}
                        className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[220px] h-[155px] flex-shrink-0 flex flex-col ${
                          isCardSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          handleCardSelect(route);
                          (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                        onDoubleClick={() => navigate(`/ipron/line/route/${route.routeId}`)}
                      >
                        {/* Card header: 라우트명 + 차단 배지 + 더보기 */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {status && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0"
                                style={{ color: status.color, backgroundColor: status.bgColor, borderColor: status.color + '40' }}
                              >
                                {status.label}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-gray-800 truncate">{route.routeName}</span>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Dropdown menu={{ items: getCardMenuItems(route) }} trigger={['click']} placement="bottomRight">
                              <button type="button" className="p-1 rounded hover:bg-gray-100 transition-colors">
                                <MoreVertical className="size-4 text-gray-400" />
                              </button>
                            </Dropdown>
                          </div>
                        </div>

                        {/* Card info */}
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Network className="size-3 text-gray-400" />
                            <span>{route.nodeName ?? `Node ${route.nodeId}`}</span>
                          </div>
                          <div>분배방식: {ROUTE_TYPE_LABELS[route.routeType] ?? route.routeType}</div>
                          <div>
                            ANI: {ANI_TYPE_LABELS[route.aniType] ?? route.aniType}
                            {route.aniNo ? ` (${route.aniNo})` : ''}
                          </div>
                          <div>배정 국선: {route.routePointCount ?? 0}개</div>
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map((tag) => (
                              <span
                                key={tag.label}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                style={{ color: tag.color, backgroundColor: tag.bgColor, borderColor: tag.borderColor }}
                              >
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        )}
                        {route.routeBlockYn === 1 && (
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-orange-600">
                            <Ban className="size-3" />
                            <span>차단</span>
                          </div>
                        )}
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

        {/* ===== Bottom: RoutePoint Panel ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {selectedRoute ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Bottom header: selected route name + status */}
              <div className="px-5 py-2 flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-800">{selectedRoute.routeName}</span>
                {(() => {
                  const status = getRouteStatusInfo(selectedRoute);
                  if (!status) return null;
                  return (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] border"
                      style={{ color: status.color, backgroundColor: status.bgColor, borderColor: status.color + '40' }}
                    >
                      {status.label}
                    </span>
                  );
                })()}
              </div>

              {/* Action bar */}
              <div className="px-5 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
                <span className="text-[13px] text-gray-400">국선 배정 ({routePoints.length}/32)</span>
                <div className="flex items-center gap-2">
                  <Button
                    danger
                    size="small"
                    icon={<Trash2 className="size-3.5" />}
                    disabled={selectedRoutePoints.length === 0}
                    title={selectedRoutePoints.length === 0 ? '해제할 국선을 선택하세요' : `선택한 ${selectedRoutePoints.length}건 배정 해제`}
                    onClick={() => handlePointDelete(selectedRoutePoints)}
                  >
                    배정 해제 <span className={selectedRoutePoints.length > 0 ? 'visible' : 'invisible'}>({selectedRoutePoints.length})</span>
                  </Button>
                  <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => routePointDialogRef.current?.open()}>
                    국선 배정
                  </Button>
                </div>
              </div>

              {/* ag-Grid */}
              <div className="flex-1">
                <AgGridReact<RoutePoint>
                  rowData={routePoints}
                  columnDefs={pointColumnDefs}
                  gridOptions={{
                    ...gridOptions,
                    statusBar: undefined,
                    pagination: false,
                    sideBar: false,
                  }}
                  rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }}
                  loading={isPointsLoading}
                  getRowId={(params) => String(params.data.endptId)}
                  defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
                  onSelectionChanged={(e) => setSelectedRoutePoints(e.api.getSelectedRows())}
                  onRowDoubleClicked={() => {
                    if (selectedRouteId) navigate(`/ipron/line/route/${selectedRouteId}`);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
              <Empty description={false} />
              <span className="text-sm">라우트를 선택하면 국선 배정을 확인할 수 있습니다</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== RoutePoint Dialog ===== */}
      {selectedRouteId && selectedRoute && (
        <RoutePointDialog ref={routePointDialogRef} routeId={selectedRouteId} nodeId={selectedRoute.nodeId} existingPoints={routePoints} onSuccess={handlePointDialogSuccess} />
      )}
    </div>
  );
}
