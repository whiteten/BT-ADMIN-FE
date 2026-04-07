/**
 * 발신 DNIS 사전변환 목록 페이지
 *
 * 좌측 트리 (280px) — 카테고리 없이 노드만 나열:
 * ┌─────────────┐
 * │ 노드명 검색  │
 * ├─────────────┤
 * │  C1N1       │  ← 클릭 시 해당 노드만
 * │  C1N2       │
 * │  C1N3       │
 * └─────────────┘
 *
 * 우측: ag-Grid (노드명, DNIS패턴, 편집옵션, Digit수, 추가Digit, 우선순위, 변환동작, 변환후라우트, 비고, 삭제)
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input } from 'antd';
import { Network, Plus } from 'lucide-react';
import PreNumTransDrawer, { type PreNumTransDrawerRef } from '../components/PreNumTransDrawer';
import { preNumTransQueryKeys, useDeletePreNumTrans, useGetNodes, useGetPreNumTransList } from '../hooks/usePreNumTransQueries';
import { EDIT_OPT_LABELS, type PreNumTrans, TRANS_ACTION_LABELS } from '../types/preNumTrans.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '회선관리', path: '/ipron/line/pre-num-trans' },
  { title: '발신DNIS사전변환', path: '/ipron/line/pre-num-trans' },
];

export default function PreNumTransListPage() {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const drawerRef = useRef<PreNumTransDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();

  const listParams = useMemo(() => (selectedNodeId ? { nodeId: selectedNodeId } : undefined), [selectedNodeId]);
  const { data: transList = [], isLoading } = useGetPreNumTransList({
    params: listParams,
  });

  // ─── Derived data ─────────────────────────────────────────────────────────
  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;
  }, [nodes, selectedNodeId]);

  const gridHeaderText = useMemo(() => {
    const suffix = selectedNodeName ? `${selectedNodeName}` : '전체';
    return `${suffix} 발신 DNIS 사전변환 (${transList.length}건)`;
  }, [selectedNodeName, transList.length]);

  const filteredNodes = useMemo(() => {
    if (!searchText) return nodes;
    return nodes.filter((n) => n.nodeName?.toLowerCase().includes(searchText.toLowerCase()));
  }, [nodes, searchText]);

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: preNumTransQueryKeys.getList(listParams).queryKey });
  }, [queryClient, listParams]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  };

  const handleCreate = useCallback(() => {
    drawerRef.current?.open(undefined, selectedNodeId ?? undefined, selectedNodeName ?? undefined, selectedNodeId ? undefined : nodes);
  }, [selectedNodeId, selectedNodeName, nodes]);

  const handleEdit = useCallback((trans: PreNumTrans) => {
    drawerRef.current?.open(trans);
  }, []);

  const { mutate: deletePreNumTrans } = useDeletePreNumTrans({
    mutationOptions: { onSuccess: () => invalidateList() },
  });

  const handleDelete = useCallback(
    (trans: PreNumTrans) => {
      modal.confirm.execute({
        onOk: () => deletePreNumTrans({ id: trans.preTransId }),
        options: {
          title: '발신 DNIS 사전변환 삭제',
          content: `DNIS 패턴 "${trans.dnisPattern}" 사전변환을 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deletePreNumTrans],
  );

  const handleDrawerSuccess = useCallback(() => {
    invalidateList();
  }, [invalidateList]);

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<PreNumTrans>[] = useMemo(
    () => [
      { headerName: '노드명', field: 'nodeName', flex: 1, minWidth: 100 },
      { headerName: 'DNIS패턴', field: 'dnisPattern', flex: 2, minWidth: 140 },
      {
        headerName: '편집옵션',
        field: 'editOpt',
        flex: 1,
        minWidth: 100,
        cellRenderer: (params: ICellRendererParams<PreNumTrans>) => {
          if (!params.data) return null;
          const label = EDIT_OPT_LABELS[params.data.editOpt] ?? String(params.data.editOpt);
          return <span>{label}</span>;
        },
      },
      { headerName: 'Digit수', field: 'delCount', flex: 0.7, minWidth: 80 },
      {
        headerName: '추가Digit',
        field: 'addDigit',
        flex: 1,
        minWidth: 100,
        valueFormatter: (params) => params.data?.addDigit ?? '-',
      },
      { headerName: '우선순위', field: 'priority', flex: 0.7, minWidth: 80 },
      {
        headerName: '변환동작',
        field: 'transAction',
        flex: 1,
        minWidth: 110,
        cellRenderer: (params: ICellRendererParams<PreNumTrans>) => {
          if (params.data?.transAction == null) return <span>-</span>;
          const label = TRANS_ACTION_LABELS[params.data.transAction] ?? String(params.data.transAction);
          return <span>{label}</span>;
        },
      },
      {
        headerName: '변환후라우트',
        field: 'routeName',
        flex: 1.2,
        minWidth: 120,
        valueFormatter: (params) => params.data?.routeName ?? '-',
      },
      {
        headerName: '비고',
        field: 'transDesc',
        flex: 2,
        minWidth: 140,
        valueFormatter: (params) => params.data?.transDesc ?? '-',
      },
      {
        headerName: '',
        field: 'preTransId',
        width: 50,
        maxWidth: 50,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<PreNumTrans>) => {
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
            <AgGridReact<PreNumTrans>
              rowData={transList}
              columnDefs={columnDefs}
              gridOptions={{
                ...gridOptions,
                statusBar: undefined,
                pagination: false,
                sideBar: false,
              }}
              loading={isLoading}
              getRowId={(params) => String(params.data.preTransId)}
              defaultColDef={{ filter: true, sortable: true }}
              onRowDoubleClicked={(e) => {
                if (e.data) handleEdit(e.data);
              }}
            />
          </div>
        </div>
      </div>

      {/* ===== Drawer ===== */}
      <PreNumTransDrawer ref={drawerRef} onSuccess={handleDrawerSuccess} />
    </div>
  );
}
