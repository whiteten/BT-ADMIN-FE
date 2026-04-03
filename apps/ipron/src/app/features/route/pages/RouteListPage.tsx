/**
 * 발신라우트 관리 목록 페이지
 * 좌측 노드 트리(라우트 하위) + 우측 상단 카드 슬라이더 + 우측 하단 국선배정 ag-Grid
 *
 * Layout:
 * ┌─────────────┬──────────────────────────────────────┐
 * │ 노드 트리    │ 카드 슬라이더 (< 카드들 >)             │
 * │ (280px)     │ 카드: *라우트명, 분배방식, ANI, 국선수   │
 * │             ├──────────────────────────────────────┤
 * │ ▼ C1N1 (2)  │ 국선 배정 (선택된 라우트)               │
 * │   ● 라우트1  │ ag-Grid: 국선명│유형│노드│우선순위│백업  │
 * │   ● 라우트2  │ [국선 배정] [삭제]                     │
 * │ ▼ C1N5 (2)  │                                      │
 * │   ● 라우트3  │                                      │
 * │   ● 라우트4  │                                      │
 * │ [라우트 추가]│                                      │
 * └─────────────┴──────────────────────────────────────┘
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input } from 'antd';
import { Ban, ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Network, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { ENDPOINT_TYPE_LABELS } from '../../endpoint/types/endpoint.types';
import RoutePointDialog, { type RoutePointDialogRef } from '../components/RoutePointDialog';
import { routeQueryKeys, useDeleteRoute, useDeleteRoutePoint, useGetNodes, useGetRoutePoints, useGetRoutes } from '../hooks/useRouteQueries';
import { ANI_TYPE_LABELS, type NodeRouteGroup, ROUTE_TYPE_LABELS, type Route, type RoutePoint, getRouteStatusInfo, getRouteTagList } from '../types/route.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '회선관리', path: '/ipron/line/route' },
  { title: '발신라우트', path: '/ipron/line/route' },
];

export default function RouteListPage() {
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
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);
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
        toast.success('라우트가 삭제되었습니다.');
        if (selectedRouteId) setSelectedRouteId(null);
        invalidateRoutes();
      },
    },
  });

  const { mutate: deleteRoutePoint } = useDeleteRoutePoint({
    mutationOptions: {
      onSuccess: () => {
        toast.success('국선 배정이 해제되었습니다.');
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
  const nodeRouteGroups: NodeRouteGroup[] = useMemo(() => {
    const groupMap = new Map<number, NodeRouteGroup>();

    for (const node of nodes) {
      groupMap.set(node.nodeId, {
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        routes: [],
      });
    }

    for (const route of routes) {
      let group = groupMap.get(route.nodeId);
      if (!group) {
        group = {
          nodeId: route.nodeId,
          nodeName: route.nodeName || `Node ${route.nodeId}`,
          routes: [],
        };
        groupMap.set(route.nodeId, group);
      }
      group.routes.push(route);
    }

    return Array.from(groupMap.values())
      .map((g) => (searchText ? { ...g, routes: g.routes.filter((r) => r.routeName?.toLowerCase().includes(searchText.toLowerCase())) } : g))
      .filter((g) => (searchText ? g.routes.length > 0 : true))
      .sort((a, b) => a.nodeId - b.nodeId);
  }, [routes, nodes, searchText]);

  const selectedRoutes = useMemo(() => {
    if (!selectedNodeId) return [];
    return routes.filter((r) => r.nodeId === selectedNodeId);
  }, [routes, selectedNodeId]);

  const filteredRoutes = useMemo(() => {
    if (!searchText) return selectedRoutes;
    return selectedRoutes.filter((r) => r.routeName?.toLowerCase().includes(searchText.toLowerCase()));
  }, [selectedRoutes, searchText]);

  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return '';
    const node = nodes.find((n) => n.nodeId === selectedNodeId);
    return node?.nodeName ?? `Node ${selectedNodeId}`;
  }, [nodes, selectedNodeId]);

  const selectedRoute = useMemo(() => {
    if (!selectedRouteId) return null;
    return routes.find((r) => r.routeId === selectedRouteId) ?? null;
  }, [routes, selectedRouteId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const toggleNodeGroup = (nodeId: number) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedRouteId(null);
    setSearchText('');
  };

  const handleCardSelect = (route: Route) => {
    setSelectedRouteId(route.routeId);
  };

  const handleTreeItemClick = (route: Route) => {
    setSelectedNodeId(route.nodeId);
    setSelectedRouteId(route.routeId);
    // Scroll card into view
    setTimeout(() => {
      const card = document.getElementById(`route-card-${route.routeId}`);
      card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
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
      modal.confirm.execute({
        onOk: () => deleteRoute({ id: route.routeId }),
        options: {
          title: '라우트 삭제',
          content: `"${route.routeName}" 라우트를 삭제하시겠습니까?\n배정된 국선이 있으면 먼저 해제해야 합니다.`,
        },
      });
    },
    [modal, deleteRoute],
  );

  const handlePointDelete = useCallback(
    (point: RoutePoint) => {
      if (!selectedRouteId) return;
      modal.confirm.execute({
        onOk: () => deleteRoutePoint({ id: selectedRouteId, endptId: point.endptId }),
        options: {
          title: '국선 배정 해제',
          content: `"${point.endptName}" 국선 배정을 해제하시겠습니까?`,
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
      },
      {
        headerName: '백업구분',
        field: 'backupGb',
        flex: 1,
        minWidth: 90,
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
      },
      {
        headerName: '',
        maxWidth: 50,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<RoutePoint>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePointDelete(params.data!);
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [handlePointDelete],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Split container: Left Tree + Right (Cards + Bottom Panel) */}
      <div className="flex flex-1 min-h-0 bg-white bt-shadow overflow-hidden rounded-md border border-gray-200">
        {/* ===== Left Panel: Node Tree (280px) ===== */}
        <div className="w-[280px] min-w-[280px] border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <Input placeholder="라우트명 검색" size="small" allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {nodeRouteGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-4">
                <span className="text-sm">등록된 라우트가 없습니다</span>
              </div>
            ) : (
              nodeRouteGroups.map((group) => {
                const isCollapsed = collapsedNodes.has(group.nodeId);
                const isNodeSelected = selectedNodeId === group.nodeId;
                return (
                  <div key={group.nodeId} className="mb-0.5">
                    {/* Node group header */}
                    <button
                      type="button"
                      className={`w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none text-[13px] font-semibold transition-colors border-l-[3px] ${
                        isNodeSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189]' : 'border-l-transparent text-gray-800 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        handleNodeSelect(group.nodeId);
                        if (isCollapsed) toggleNodeGroup(group.nodeId);
                      }}
                    >
                      <button
                        type="button"
                        className="p-0 bg-transparent border-none cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNodeGroup(group.nodeId);
                        }}
                      >
                        {isCollapsed ? <ChevronRight className="size-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="size-3.5 text-gray-400 flex-shrink-0" />}
                      </button>
                      <Network className="size-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{group.nodeName}</span>
                      <span className="ml-auto text-[11px] text-gray-400 font-normal">{group.routes.length}</span>
                    </button>

                    {/* Route items under node */}
                    {!isCollapsed && (
                      <div>
                        {group.routes.map((route) => {
                          const isItemSelected = selectedRouteId === route.routeId;
                          return (
                            <div
                              key={route.routeId}
                              className={`group flex items-center gap-2 pl-[42px] pr-4 py-1.5 cursor-pointer text-[12px] transition-colors border-l-[3px] ${
                                isItemSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189] font-medium' : 'border-l-transparent text-gray-500 hover:bg-gray-50'
                              }`}
                              onClick={() => handleTreeItemClick(route)}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isItemSelected ? 'bg-[#405189]' : route.routeBlockYn === 1 ? 'bg-red-500' : 'bg-green-500'}`}
                              />
                              <span className="truncate flex-1">{route.routeName}</span>
                              {route.routeBlockYn === 1 && <Ban className="size-3 text-orange-500 flex-shrink-0" />}
                              <span className="text-[10px] text-gray-400">{ROUTE_TYPE_LABELS[route.routeType] ?? route.routeType}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ===== Right Panel: Cards (top) + RoutePoint (bottom) ===== */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedNodeId ? (
            <>
              {/* -- Top: Card Slider Area -- */}
              <div className="flex flex-col overflow-hidden flex-shrink-0">
                {/* Card grid header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-800">
                    {selectedNodeName} 라우트 ({filteredRoutes.length})
                  </span>
                  <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                    라우트 추가
                  </Button>
                </div>

                {/* Card slider body */}
                <div className="flex items-center px-4 py-3">
                  {filteredRoutes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3">
                      <Empty description={false} />
                      <span className="text-sm">{searchText ? '검색 결과가 없습니다' : '이 노드에 등록된 라우트가 없습니다'}</span>
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
                              className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all min-w-[220px] max-w-[260px] flex-shrink-0 ${
                                isCardSelected
                                  ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                                  : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                              }`}
                              onClick={() => handleCardSelect(route)}
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

              {/* -- Bottom: RoutePoint Panel -- */}
              <div className="border-t border-gray-200 flex flex-col flex-1 min-h-0">
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
                      <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={() => routePointDialogRef.current?.open()}>
                        국선 배정
                      </Button>
                    </div>

                    {/* ag-Grid */}
                    <div className="flex-1">
                      <AgGridReact<RoutePoint>
                        rowData={routePoints}
                        columnDefs={pointColumnDefs}
                        gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                        loading={isPointsLoading}
                        getRowId={(params) => String(params.data.endptId)}
                        defaultColDef={{ filter: true, sortable: true }}
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
            </>
          ) : (
            /* Empty state when no node selected */
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
              <Empty description={false} />
              <span className="text-sm">좌측에서 노드를 선택하세요</span>
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
