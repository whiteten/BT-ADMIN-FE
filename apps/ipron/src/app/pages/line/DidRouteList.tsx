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
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import { Network, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { didRouteQueryKeys, useDeleteDidRouteBatch, useGetDidRouteList, useGetNodes } from '../../features/did-route/hooks/useDidRouteQueries';
import { type DidRoute, getRoutingDisplayText } from '../../features/did-route/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '회선관리' }, { title: '호 라우팅' }, { title: 'DID라우트관리', path: '/ipron/line/did-route' }];

export default function DidRouteList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<DidRoute[]>([]);

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
  const { mutate: deleteDidRouteBatch } = useDeleteDidRouteBatch({
    mutationOptions: {
      onSuccess: () => {
        // SWAT IPR20S1036Controller.java:138: 삭제 성공 후 특수코드 연계 안내
        toast.success('DID라우트가 삭제되었습니다');
        toast.info('삭제된 라우트정보를 가지고 있던 특수코드 정보가 수정되었습니다');
        invalidateList();
        setSelectedRows([]);
      },
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeChange = (nodeId: number | null) => {
    setSelectedNodeId(nodeId);
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

  const handleDeleteSelected = useCallback(() => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => deleteDidRouteBatch(selectedRows.map((r) => r.didrouteId)),
      options: {
        title: 'DID라우트 삭제',
        content: `선택한 ${selectedRows.length}건의 DID라우트를 삭제하시겠습니까?`,
      },
    });
  }, [modal, selectedRows, deleteDidRouteBatch]);

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<DidRoute>[] = useMemo(
    () => [
      {
        headerName: '노드명',
        field: 'nodeName',
        flex: 1,
        minWidth: 110,
        tooltipField: 'nodeName',
        valueFormatter: (params) => params.data?.nodeName ?? `노드 ${params.data?.nodeId ?? '-'}`,
      },
      { headerName: '라우트명', field: 'didrouteName', flex: 2, minWidth: 140, tooltipField: 'didrouteName' },
      {
        headerName: 'ANI패턴',
        field: 'aniPattern',
        flex: 1.5,
        minWidth: 120,
        tooltipField: 'aniPattern',
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
        tooltipField: 'dnisPattern',
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
          if (!params.data) return null;
          return params.data.dnisPattern || '-';
        },
      },
      {
        // SWAT 그리드 컬럼: routingPositionName
        // 값: ROUTE_ID가 null/0이면 '내부착신', 그 외 '국선중계'
        headerName: '라우팅위치(내)',
        colId: 'routingPosition',
        flex: 1,
        minWidth: 110,
        filterValueGetter: (params) => {
          if (!params.data) return null;
          const routeId = params.data.routeId;
          return !routeId || routeId === 0 ? '내부착신' : '국선중계';
        },
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
          if (!params.data) return null;
          const routeId = params.data.routeId;
          return !routeId || routeId === 0 ? '내부착신' : '국선중계';
        },
      },
      {
        headerName: '업무시간 내',
        colId: 'routingIn',
        flex: 2,
        minWidth: 160,
        tooltipValueGetter: (params) => (params.data ? getRoutingDisplayText(params.data.routeName, params.data.dnNo) : null),
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
          if (!params.data) return null;
          return getRoutingDisplayText(params.data.routeName, params.data.dnNo);
        },
      },
      {
        // SWAT 그리드 컬럼: afterRoutingPositionName
        // 값: AFTER_ROUTE_ID가 null/0이면 '내부착신', 그 외 '국선중계'
        headerName: '라우팅위치(외)',
        colId: 'afterRoutingPosition',
        flex: 1,
        minWidth: 110,
        filterValueGetter: (params) => {
          if (!params.data) return null;
          const afterRouteId = params.data.afterRouteId;
          return !afterRouteId || afterRouteId === 0 ? '내부착신' : '국선중계';
        },
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
          if (!params.data) return null;
          const afterRouteId = params.data.afterRouteId;
          return !afterRouteId || afterRouteId === 0 ? '내부착신' : '국선중계';
        },
      },
      {
        headerName: '업무시간 외',
        colId: 'routingOut',
        flex: 2,
        minWidth: 160,
        tooltipValueGetter: (params) => (params.data ? getRoutingDisplayText(params.data.afterRouteName, params.data.afterDnNo) : null),
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
          if (!params.data) return null;
          return getRoutingDisplayText(params.data.afterRouteName, params.data.afterDnNo);
        },
      },
      { headerName: '우선순위', field: 'priority', flex: 0.7, minWidth: 80, filter: 'agNumberColumnFilter' },
      {
        headerName: '비고',
        field: 'didrouteDesc',
        flex: 2,
        minWidth: 140,
        tooltipField: 'didrouteDesc',
        cellRenderer: (params: ICellRendererParams<DidRoute>) => {
          if (!params.data) return null;
          return params.data.didrouteDesc || '-';
        },
      },
    ],
    [],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 Select + 검색 + 추가 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 노드 선택 (DID라우트는 노드 단위 스코프) */}
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

            {/* 요약 — 총 DID라우트 */}
            <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">
                총 DID라우트 <b className="text-gray-800 font-semibold">{didRouteList.length.toLocaleString()}</b>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
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
        </div>

        {/* ===== 하단: DID 라우트 그리드 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
            {selectedRows.length > 0 && (
              <span className="text-xs text-gray-500">
                {didRouteList.length}건 중 {selectedRows.length}건 선택
              </span>
            )}
            <div className="ml-auto">
              <Button
                danger
                icon={<Trash2 className="size-3.5" />}
                onClick={handleDeleteSelected}
                disabled={selectedRows.length === 0}
                title={selectedRows.length === 0 ? '삭제할 항목을 선택하세요' : `선택한 ${selectedRows.length}건 삭제`}
              >
                {selectedRows.length > 0 ? `삭제 (${selectedRows.length})` : '삭제'}
              </Button>
            </div>
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
              rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }}
              loading={isLoading}
              getRowId={(params) => String(params.data.didrouteId)}
              defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
              onRowDoubleClicked={(e) => {
                if (e.data) handleEdit(e.data);
              }}
              onSelectionChanged={(e) => setSelectedRows(e.api.getSelectedRows())}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
