/**
 * DID라우트 관리 목록 페이지
 *
 * 상단 노드 카드 슬라이더 + 하단 ag-Grid (DOD DNIS관리 패턴)
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ 노드 ({n}개)                          [+ 추가]        │
 * │ [◀ ] [C1N1] [C1N2] [C1N3] [C1N5] [ ▶]                │
 * ├──────────────────────────────────────────────────────┤
 * │ {노드명} DID라우트 (n건)                               │
 * │ ag-Grid: 라우트명│ANI패턴│DNIS패턴│업무시간내│외│우선│  │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, Layers, Network, Plus, Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { didRouteQueryKeys, useDeleteDidRoute, useGetDidRouteList, useGetNodes } from '../hooks/useDidRouteQueries';
import { type DidRoute, getRoutingDisplayText } from '../types/didRoute.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '회선관리', path: '/ipron/line/did-route' },
  { title: 'DID라우트관리', path: '/ipron/line/did-route' },
];

export default function DidRouteListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();

  // 노드별 카운트용으로 전체 목록을 한 번 가져와서 클라이언트에서 필터링
  const listParams = useMemo(() => undefined, []);
  const { data: allDidRouteList = [], isLoading } = useGetDidRouteList({
    params: listParams,
  });

  // 검색어로 필터링 (검색 필드: 라우트명, ANI패턴, DNIS패턴, 비고, 노드명)
  const isSearching = searchText.trim().length > 0;
  const searchFilteredRoutes = useMemo(() => {
    if (!isSearching) return allDidRouteList;
    const kw = searchText.trim().toLowerCase();
    return allDidRouteList.filter((r) => [r.didrouteName, r.aniPattern, r.dnisPattern, r.didrouteDesc, r.nodeName].some((v) => v?.toString().toLowerCase().includes(kw)));
  }, [allDidRouteList, isSearching, searchText]);

  // 검색 중이면 노드 선택 무시 (전체 표시)
  const didRouteList = useMemo(
    () => (isSearching || !selectedNodeId ? searchFilteredRoutes : searchFilteredRoutes.filter((r) => r.nodeId === selectedNodeId)),
    [searchFilteredRoutes, selectedNodeId, isSearching],
  );

  // 노드별 DID라우트 개수 (검색 결과 기준)
  const routeCountByNode = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of searchFilteredRoutes) {
      map.set(r.nodeId, (map.get(r.nodeId) ?? 0) + 1);
    }
    return map;
  }, [searchFilteredRoutes]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setSelectedNodeId(null);
    }
  };

  // ─── Derived data ─────────────────────────────────────────────────────────
  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;
  }, [nodes, selectedNodeId]);

  const gridHeaderText = useMemo(() => {
    const suffix = selectedNodeName ? `${selectedNodeName}` : '전체';
    return `${suffix} DID라우트 (${didRouteList.length}건)`;
  }, [selectedNodeName, didRouteList.length]);

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: didRouteQueryKeys.getList(listParams).queryKey });
  }, [queryClient, listParams]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteDidRoute } = useDeleteDidRoute({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DID라우트가 삭제되었습니다.');
        invalidateList();
      },
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  };

  const handleCreate = useCallback(() => {
    navigate('/ipron/line/did-route/form' + (selectedNodeId ? `?nodeId=${selectedNodeId}` : ''));
  }, [navigate, selectedNodeId]);

  const handleEdit = useCallback(
    (didRoute: DidRoute) => {
      navigate(`/ipron/line/did-route/form/${didRoute.didrouteId}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (didRoute: DidRoute) => {
      modal.confirm.execute({
        onOk: () => deleteDidRoute({ id: didRoute.didrouteId }),
        options: {
          title: 'DID라우트 삭제',
          content: `"${didRoute.didrouteName}" DID라우트를 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteDidRoute],
  );

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<DidRoute>[] = useMemo(
    () => [
      {
        headerName: '노드명',
        field: 'nodeName',
        flex: 1,
        minWidth: 110,
        valueFormatter: (params) => params.data?.nodeName ?? `Node ${params.data?.nodeId ?? '-'}`,
      },
      { headerName: '라우트명', field: 'didrouteName', flex: 2, minWidth: 140 },
      {
        headerName: 'ANI패턴',
        field: 'aniPattern',
        flex: 1.5,
        minWidth: 120,
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
          if (!params.data) return null;
          return params.data.aniPattern || '-';
        },
      },
      {
        headerName: 'DNIS패턴',
        field: 'dnisPattern',
        flex: 1.5,
        minWidth: 120,
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
          if (!params.data) return null;
          return params.data.dnisPattern || '-';
        },
      },
      {
        headerName: '업무시간 내',
        colId: 'routingIn',
        flex: 2,
        minWidth: 160,
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
          if (!params.data) return null;
          return getRoutingDisplayText(params.data.routeName, params.data.dnNo);
        },
      },
      {
        headerName: '업무시간 외',
        colId: 'routingOut',
        flex: 2,
        minWidth: 160,
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
          if (!params.data) return null;
          return getRoutingDisplayText(params.data.afterRouteName, params.data.afterDnNo);
        },
      },
      { headerName: '우선순위', field: 'priority', flex: 0.7, minWidth: 80 },
      {
        headerName: '비고',
        field: 'didrouteDesc',
        flex: 2,
        minWidth: 140,
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
          if (!params.data) return null;
          return params.data.didrouteDesc || '-';
        },
      },
      {
        headerName: '',
        field: 'didrouteId',
        width: 50,
        maxWidth: 50,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
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
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 카드 슬라이더 (DOD DNIS관리 패턴) ===== */}
        <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
          {/* Header */}
          <div className="px-5 h-[56px] bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">DID라우트 (총 {allDidRouteList.length}건)</span>
            <div className="flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="DID 라우트 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                추가
              </Button>
            </div>
          </div>

          {/* Card slider body */}
          <div className="flex items-center px-4 py-3 h-[170px]">
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">등록된 노드가 없습니다</span>
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
                  {/* 전체 카드 (노드 필터 해제) — 작은 사이즈 */}
                  {(() => {
                    const isAllSelected = selectedNodeId === null;
                    return (
                      <div
                        key="__all__"
                        className={`border rounded-lg p-3 cursor-pointer transition-all w-[110px] h-[130px] flex-shrink-0 flex flex-col items-center justify-center gap-1.5 ${
                          isAllSelected
                            ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-dashed border-gray-300 bg-white text-gray-500 hover:border-[#c5cbe0] hover:text-[#405189]'
                        }`}
                        onClick={() => setSelectedNodeId(null)}
                      >
                        <Layers className="size-5" />
                        <span className="text-sm font-semibold">전체</span>
                        <span className={`text-[11px] ${isAllSelected ? 'text-white/80' : 'text-gray-400'}`}>{allDidRouteList.length}건</span>
                      </div>
                    );
                  })()}

                  {nodes.map((node) => {
                    const isSelected = selectedNodeId === node.nodeId;
                    const count = routeCountByNode.get(node.nodeId) ?? 0;
                    return (
                      <div
                        key={node.nodeId}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[130px] flex-shrink-0 flex flex-col ${
                          isSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={() => handleNodeSelect(node.nodeId)}
                      >
                        {/* Card header: 노드 + ID */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <Network className={`size-4 flex-shrink-0 ${isSelected ? 'text-[#405189]' : 'text-gray-400'}`} />
                          <span className="text-sm font-semibold text-gray-800 truncate">{node.nodeName}</span>
                        </div>

                        {/* Card info: Node ID */}
                        <div className="text-xs text-gray-500">Node ID: {node.nodeId}</div>

                        {/* 하단 태그: 등록 건수 */}
                        <div className="flex flex-wrap gap-1 mt-auto pt-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              count > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
                            }`}
                          >
                            {count > 0 ? `DID라우트 ${count}건` : '미등록'}
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

        {/* ===== 하단: DID 라우트 그리드 ===== */}
        <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
          </div>

          {/* Grid */}
          <div className="flex-1">
            <AgGridReact<DidRoute>
              rowData={didRouteList}
              columnDefs={columnDefs}
              gridOptions={{
                ...gridOptions,
                statusBar: undefined,
                pagination: false,
                sideBar: false,
              }}
              loading={isLoading}
              getRowId={(params) => String(params.data.didrouteId)}
              defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
              onRowDoubleClicked={(e) => {
                if (e.data) handleEdit(e.data);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
