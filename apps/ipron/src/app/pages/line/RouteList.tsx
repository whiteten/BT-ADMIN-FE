/**
 * 발신라우트 관리 목록 페이지
 * 상단: 노드 탭 바 + 카드 슬라이더
 * 하단: 선택 라우트의 국선 배정 ag-Grid
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, GridApi, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input, Select } from 'antd';
import { Ban, ChevronLeft, ChevronRight, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
import { VIEW_MODE, useBreadcrumbStore, useViewMode } from '@/shared-store';
import { toast } from '@/shared-util';
import { ENDPOINT_TYPE_LABELS } from '../../features/endpoint/types';
import { useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
import RoutePointDialog, { type RoutePointDialogRef } from '../../features/route/components/RoutePointDialog';
import { routeQueryKeys, useDeleteRoute, useDeleteRoutePointsBatch, useGetNodes, useGetRoutePoints, useGetRoutes } from '../../features/route/hooks/useRouteQueries';
import { ANI_TYPE_LABELS, ROUTE_TYPE_LABELS, type Route, type RoutePoint, getRouteStatusInfo, getRouteTagList } from '../../features/route/types';
import ViewModeToggle from '@/components/custom/ViewModeToggle';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '회선관리' }, { title: '호 라우팅' }, { title: '발신라우트', path: '/ipron/line/route' }];

/**
 * 리스트형 상태 컬럼 뱃지.
 * getRouteStatusInfo 는 차단일 때만 { label: '차단' } 을 주고 정상이면 null 을 반환하므로,
 * 그리드에서는 null 을 '정상'으로 표기하고 라벨 기준으로 색상을 매핑한다.
 * (add-grid 스킬 2-2: 정상=emerald / 차단=red)
 */
const ROUTE_STATUS_NORMAL_LABEL = '정상';
const ROUTE_STATUS_BADGE_CLASS: Record<string, string> = {
  [ROUTE_STATUS_NORMAL_LABEL]: 'text-emerald-600 bg-emerald-50',
  차단: 'text-red-600 bg-red-50',
};
const DEFAULT_BADGE_CLASS = 'text-gray-500 bg-gray-100';
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

/** 카드 더보기 / 리스트형 액션 컬럼이 공유하는 메뉴 구성. */
function buildRouteMenuItems(route: Route, onEdit: (route: Route) => void, onDelete: (route: Route) => void) {
  return [
    {
      key: 'edit',
      label: '수정',
      onClick: () => onEdit(route),
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <Trash2 className="size-4" />,
      danger: true,
      onClick: () => onDelete(route),
    },
  ];
}

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
  // 목록 표기방식(카드형/리스트형) — localStorage 유지. 화면키는 국선(ipron-endpoint)과 별도.
  const [viewMode, setViewMode] = useViewMode('ipron-route');
  const [searchText, setSearchText] = useState('');
  const [selectedRoutePoints, setSelectedRoutePoints] = useState<RoutePoint[]>([]);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const routePointDialogRef = useRef<RoutePointDialogRef>(null);
  // 리스트형 그리드 api — 선택 행 강조(rowClassRules)는 데이터 변경 시에만 재평가되므로 수동 redraw 가 필요하다.
  const routeGridApiRef = useRef<GridApi<Route> | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: routes = [] } = useGetRoutes();
  const { data: allNodes = [] } = useGetNodes();
  // 운영자 모드=전체 노드, 일반 테넌트 모드=로그인 테넌트에 매핑된 노드만
  const nodes = useScopedNodes(allNodes);

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

  const { mutate: deleteRoutePointsBatch } = useDeleteRoutePointsBatch({
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

  // 운영자 모드 → 테넌트 모드 전환 시, 선택 노드가 스코프 밖이면 해제
  useEffect(() => {
    if (selectedNodeId != null && nodes.length > 0 && !nodes.some((n) => n.nodeId === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  // ─── Auto-select first route when none selected ──────────────────────────
  useEffect(() => {
    if (!selectedRouteId && filteredRoutes.length > 0) {
      setSelectedRouteId(filteredRoutes[0].routeId);
    }
  }, [filteredRoutes, selectedRouteId]);

  // ─── 리스트형 선택 행 강조 갱신 ─────────────────────────────────────────
  // rowClassRules 는 외부 state 변경을 감지하지 못하므로 선택이 바뀌면 직접 redraw 한다.
  useEffect(() => {
    if (viewMode === VIEW_MODE.LIST) routeGridApiRef.current?.redrawRows();
  }, [selectedRouteId, viewMode]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeChange = (nodeId: number | null) => {
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
          deleteRoutePointsBatch({ routeId: selectedRouteId, endptIds: points.map((point) => point.endptId) });
          setSelectedRoutePoints([]);
        },
        options: {
          title: '국선 배정 해제',
          content: points.length === 1 ? `"${points[0].endptName}" 국선 배정을 해제하시겠습니까?` : `선택한 국선 ${points.length}건의 배정을 해제하시겠습니까?`,
        },
      });
    },
    [modal, deleteRoutePointsBatch, selectedRouteId],
  );

  const handlePointDialogSuccess = useCallback(() => {
    invalidateRoutePoints();
    invalidateRoutes();
  }, [invalidateRoutePoints, invalidateRoutes]);

  const getCardMenuItems = (route: Route) => buildRouteMenuItems(route, handleEdit, handleDelete);

  // ─── ag-Grid: Route columns (리스트형 목록) ──────────────────────────────
  // 카드가 보여주는 정보와 동일한 항목 구성. 액션 컬럼은 카드 더보기 메뉴를 그대로 재사용한다.
  const routeColumnDefs: ColDef<Route>[] = useMemo(
    () => [
      {
        headerName: '라우트명',
        field: 'routeName',
        flex: 2,
        minWidth: 140,
        tooltipField: 'routeName',
      },
      {
        headerName: '노드',
        field: 'nodeName',
        flex: 1,
        minWidth: 90,
        valueGetter: (params) => params.data?.nodeName ?? (params.data ? `Node ${params.data.nodeId}` : null),
      },
      {
        headerName: '분배방식',
        field: 'routeType',
        flex: 1,
        minWidth: 100,
        valueGetter: (params) => (params.data ? (ROUTE_TYPE_LABELS[params.data.routeType] ?? String(params.data.routeType)) : null),
      },
      {
        headerName: 'ANI 유형',
        field: 'aniType',
        flex: 1,
        minWidth: 100,
        valueGetter: (params) => (params.data ? (ANI_TYPE_LABELS[params.data.aniType] ?? String(params.data.aniType)) : null),
      },
      {
        headerName: 'ANI 번호',
        field: 'aniNo',
        flex: 1,
        minWidth: 100,
        valueGetter: (params) => params.data?.aniNo ?? '-',
      },
      {
        headerName: '배정 국선',
        field: 'routePointCount',
        flex: 1,
        minWidth: 90,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => params.data?.routePointCount ?? 0,
      },
      {
        headerName: '상태',
        colId: 'status',
        flex: 1,
        minWidth: 90,
        filterValueGetter: (params) => (params.data ? (getRouteStatusInfo(params.data)?.label ?? ROUTE_STATUS_NORMAL_LABEL) : null),
        cellRenderer: (params: ICellRendererParams<Route>) => {
          if (!params.data) return null;
          const label = getRouteStatusInfo(params.data)?.label ?? ROUTE_STATUS_NORMAL_LABEL;
          return <Badge className={cn(BADGE_CLASS, ROUTE_STATUS_BADGE_CLASS[label] ?? DEFAULT_BADGE_CLASS)}>{label}</Badge>;
        },
      },
      {
        headerName: '',
        colId: 'actions',
        width: 56,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<Route>) => {
          if (!params.data) return null;
          const route = params.data;
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown menu={{ items: buildRouteMenuItems(route, handleEdit, handleDelete) }} trigger={['click']} placement="bottomRight">
                <button type="button" className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                  <MoreVertical className="size-3.5 text-gray-400" />
                </button>
              </Dropdown>
            </div>
          );
        },
      },
    ],
    [handleEdit, handleDelete],
  );

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
          {/* Header: 노드 Select + 검색 + 추가 버튼 */}
          <div className="flex items-center bg-white px-4 gap-3 flex-shrink-0 h-[56px]">
            {/* 노드 선택 (발신라우트는 노드 단위 스코프) */}
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select
                size="small"
                variant="borderless"
                value={selectedNodeId ?? '__all__'}
                onChange={(v) => handleNodeChange(v === '__all__' ? null : Number(v))}
                options={[{ value: '__all__', label: '전체' }, ...nodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))]}
                style={{ width: 150 }}
                popupMatchSelectWidth={false}
              />
            </div>

            {/* 요약 — 총 라우트 (검색 결과 기준) */}
            <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">
                총 라우트 <b className="text-gray-800 font-semibold">{filteredRoutes.length.toLocaleString()}</b>
              </span>
            </div>

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

        {/* ===== 발신라우트 목록 박스 (카드형 / 리스트형 — 선택은 localStorage 유지) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* 목록 헤더: 타이틀 + 건수 / 우측 표기방식 토글 */}
          <div className="flex items-center gap-2 px-4 h-[44px] border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">발신라우트</span>
            <span className="text-xs text-gray-400">{filteredRoutes.length}</span>
            <div className="ml-auto">
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {/* 목록 본문 — 카드형은 가로 슬라이더, 리스트형은 ag-Grid */}
          <div className={`flex items-center px-4 py-3 ${viewMode === VIEW_MODE.CARD ? 'h-[185px]' : 'h-[240px]'}`}>
            {filteredRoutes.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3">
                <Empty description={false} />
                <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : '등록된 라우트가 없습니다'}</span>
              </div>
            ) : viewMode === VIEW_MODE.LIST ? (
              // 리스트형 — ag-Grid. 선택 행은 rowClassRules 로 강조하고, 더블클릭 시 상세로 이동한다.
              <div className="w-full h-full">
                <AgGridReact<Route>
                  rowData={filteredRoutes}
                  columnDefs={routeColumnDefs}
                  gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                  getRowId={(params) => String(params.data.routeId)}
                  defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
                  rowClassRules={{ 'bg-[#405189]/5': (params) => params.data?.routeId === selectedRouteId }}
                  onGridReady={(e) => {
                    routeGridApiRef.current = e.api;
                  }}
                  onRowClicked={(e) => {
                    if (e.data) handleCardSelect(e.data);
                  }}
                  onRowDoubleClicked={(e) => {
                    if (e.data) navigate(`/ipron/line/route/${e.data.routeId}`);
                  }}
                />
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
              <div className="flex-1 px-5">
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
