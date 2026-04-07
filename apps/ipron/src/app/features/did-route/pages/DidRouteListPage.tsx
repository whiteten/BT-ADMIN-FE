/**
 * DID라우트 관리 목록 페이지
 *
 * 좌측 노드 트리 (280px, 심플) + 우측 ag-Grid 목록
 *
 * Layout:
 * ┌─────────────┬──────────────────────────────────────┐
 * │ 노드 트리    │ {노드명} DID라우트 (n건) [+ 추가]      │
 * │ (280px)     ├──────────────────────────────────────┤
 * │             │ ag-Grid: 라우트명│ANI패턴│DNIS패턴│    │
 * │  C1N1       │  업무시간내│업무시간외│우선순위│비고│🗑️   │
 * │  C1N2       │                                      │
 * │  C1N3       │                                      │
 * └─────────────┴──────────────────────────────────────┘
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input } from 'antd';
import { Network, Plus } from 'lucide-react';
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

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();

  const listParams = useMemo(() => (selectedNodeId ? { nodeId: selectedNodeId } : undefined), [selectedNodeId]);
  const { data: didRouteList = [], isLoading } = useGetDidRouteList({
    params: listParams,
  });

  // ─── Derived data ─────────────────────────────────────────────────────────
  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;
  }, [nodes, selectedNodeId]);

  const gridHeaderText = useMemo(() => {
    const suffix = selectedNodeName ? `${selectedNodeName}` : '전체';
    return `${suffix} DID라우트 (${didRouteList.length}건)`;
  }, [selectedNodeName, didRouteList.length]);

  const filteredNodes = useMemo(() => {
    if (!searchText) return nodes;
    return nodes.filter((n) => n.nodeName?.toLowerCase().includes(searchText.toLowerCase()));
  }, [nodes, searchText]);

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
        headerName: '라우트명',
        field: 'didrouteName',
        flex: 2,
        minWidth: 140,
      },
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
      {
        headerName: '우선순위',
        field: 'priority',
        flex: 0.7,
        minWidth: 80,
      },
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

      <div className="flex flex-1 min-h-0 gap-4">
        {/* ===== Left Panel: Node Tree (280px) ===== */}
        <div className="w-[280px] min-w-[280px] bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <Input placeholder="노드명 검색" size="small" allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {filteredNodes.map((node) => {
              const isSelected = selectedNodeId === node.nodeId;
              return (
                <button
                  key={node.nodeId}
                  type="button"
                  className={`w-full flex items-center gap-2 px-4 py-2 cursor-pointer select-none text-[13px] font-medium transition-colors border-l-[3px] ${
                    isSelected ? 'bg-blue-50 border-l-blue-600 text-blue-700' : 'border-l-transparent text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => handleNodeSelect(node.nodeId)}
                >
                  <Network className={`size-3.5 ${isSelected ? 'text-blue-700' : 'text-gray-400'} flex-shrink-0`} />
                  <span className="truncate">{node.nodeName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== Right Panel: Grid ===== */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white bt-shadow rounded-md border border-gray-200">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
            <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
              추가
            </Button>
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
              defaultColDef={{ filter: true, sortable: true }}
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
