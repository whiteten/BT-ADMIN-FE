/**
 * 수신번호 차단 관리 목록 페이지
 * Pattern: 좌측 노드>테넌트 트리 + 우측 ag-Grid + Drawer CRUD
 *
 * Layout:
 * +--------------+--------------------------------------------+
 * | 노드 트리     | ag-Grid (차단번호 목록)                      |
 * | (280px)      | 테넌트명 | 차단번호패턴 | 차단설명 | 🗑️     |
 * |              |                                            |
 * | > 노드1      |                                            |
 * |   - 테넌트A  |                                            |
 * |   - 테넌트B  |                                            |
 * | > 노드2      |                                            |
 * +--------------+--------------------------------------------+
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty } from 'antd';
import { ChevronDown, ChevronRight, Network, Plus } from 'lucide-react';
import { toast } from '@/shared-util';
import CallScreenDrawer, { type CallScreenDrawerRef } from '../components/CallScreenDrawer';
import { callScreenQueryKeys, useDeleteCallScreen, useGetCallScreenList, useGetNodeTenants } from '../hooks/useCallScreenQueries';
import type { CallScreen } from '../types/callScreen.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '회선관리', path: '/ipron/line/call-screen' },
  { title: '수신번호차단관리', path: '/ipron/line/call-screen' },
];

export default function CallScreenListPage() {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const drawerRef = useRef<CallScreenDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodeTenants = [] } = useGetNodeTenants();
  const { data: callScreens = [], isLoading } = useGetCallScreenList({
    params: selectedNodeId && selectedTenantId ? { nodeId: selectedNodeId, tenantId: selectedTenantId } : undefined,
    queryOptions: { enabled: !!selectedNodeId && !!selectedTenantId },
  });

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
    if (selectedNodeId && selectedTenantId) {
      queryClient.invalidateQueries({
        queryKey: callScreenQueryKeys.getList({ nodeId: selectedNodeId, tenantId: selectedTenantId }).queryKey,
      });
    }
  }, [queryClient, selectedNodeId, selectedTenantId]);

  // ─── Derived data: 노드 > 테넌트 트리 구조 ──────────────────────────────────
  interface TenantInfo {
    tenantId: number;
    tenantName: string;
  }
  interface NodeTenantGroup {
    nodeId: number;
    nodeName: string;
    tenants: TenantInfo[];
  }

  const nodeTenantTree: NodeTenantGroup[] = useMemo(() => {
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

    return Array.from(nodeMap.entries())
      .map(([nodeId, data]) => ({
        nodeId,
        nodeName: data.nodeName,
        tenants: Array.from(data.tenantMap.entries()).map(([tenantId, tenantName]) => ({
          tenantId,
          tenantName,
        })),
      }))
      .sort((a, b) => a.nodeId - b.nodeId);
  }, [nodeTenants]);

  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return '';
    return nodeTenantTree.find((g) => g.nodeId === selectedNodeId)?.nodeName ?? '';
  }, [nodeTenantTree, selectedNodeId]);

  const selectedTenantName = useMemo(() => {
    if (!selectedNodeId || !selectedTenantId) return '';
    const group = nodeTenantTree.find((g) => g.nodeId === selectedNodeId);
    return group?.tenants.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? '';
  }, [nodeTenantTree, selectedNodeId, selectedTenantId]);

  // Auto-select first node+tenant
  useEffect(() => {
    if (!selectedNodeId && nodeTenantTree.length > 0) {
      const first = nodeTenantTree[0];
      setSelectedNodeId(first.nodeId);
      if (first.tenants.length > 0) {
        setSelectedTenantId(first.tenants[0].tenantId);
      }
    }
  }, [nodeTenantTree, selectedNodeId]);

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

  const handleTenantSelect = (nodeId: number, tenantId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedTenantId(tenantId);
  };

  const handleCreate = useCallback(() => {
    if (selectedNodeId && selectedTenantId) {
      drawerRef.current?.open(undefined, selectedNodeId, selectedNodeName, selectedTenantId, selectedTenantName);
    }
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
      <PageHeader breadcrumb={breadcrumb} />

      {/* Split container: Left Tree + Right Grid */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* ===== Left Panel: Node > Tenant Tree (280px) ===== */}
        <div className="w-[280px] min-w-[280px] bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-700">노드 / 테넌트</span>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {nodeTenantTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-4">
                <span className="text-sm">등록된 데이터가 없습니다</span>
              </div>
            ) : (
              nodeTenantTree.map((group) => {
                const isCollapsed = collapsedNodes.has(group.nodeId);
                return (
                  <div key={group.nodeId} className="mb-0.5">
                    {/* Node header */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none text-[13px] font-bold transition-colors border-l-[3px] border-l-transparent text-gray-800 hover:bg-gray-50"
                      onClick={() => toggleNodeGroup(group.nodeId)}
                    >
                      {isCollapsed ? <ChevronRight className="size-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="size-3.5 text-gray-400 flex-shrink-0" />}
                      <Network className="size-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{group.nodeName}</span>
                      <span className="ml-auto text-[11px] text-gray-400 font-normal">{group.tenants.length}</span>
                    </button>

                    {/* Tenant items under node */}
                    {!isCollapsed && (
                      <div>
                        {group.tenants.map((tenant) => {
                          const isSelected = selectedNodeId === group.nodeId && selectedTenantId === tenant.tenantId;
                          return (
                            <button
                              key={`${group.nodeId}-${tenant.tenantId}`}
                              type="button"
                              className={`w-full flex items-center gap-2 pl-[42px] pr-4 py-1.5 cursor-pointer text-[12px] text-left transition-colors border-l-[3px] ${
                                isSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189] font-medium' : 'border-l-transparent text-gray-500 hover:bg-gray-50'
                              }`}
                              onClick={() => handleTenantSelect(group.nodeId, tenant.tenantId)}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-[#405189]' : 'bg-green-500'}`} />
                              <span className="truncate flex-1">{tenant.tenantName}</span>
                            </button>
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

        {/* ===== Right Panel: ag-Grid ===== */}
        <div className="flex-1 bg-white bt-shadow rounded-md border border-gray-200 flex flex-col min-w-0 overflow-hidden">
          {selectedNodeId && selectedTenantId ? (
            <>
              {/* Grid header */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-800">
                    {selectedNodeName} / {selectedTenantName} 수신번호 차단 ({callScreens.length}건)
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                    추가
                  </Button>
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1">
                {callScreens.length === 0 && !isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                    <Empty description={false} />
                    <span className="text-sm">이 테넌트에 등록된 차단번호가 없습니다</span>
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
                    defaultColDef={{ filter: true, sortable: true }}
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
              <span className="text-sm">좌측에서 테넌트를 선택하세요</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Drawer ===== */}
      <CallScreenDrawer ref={drawerRef} onSuccess={handleDrawerSuccess} />
    </div>
  );
}
