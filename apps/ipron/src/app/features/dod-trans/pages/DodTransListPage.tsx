/**
 * DOD DNIS 관리 목록 페이지
 * Pattern: 좌측 노드 트리 + 우측 상단 카드 슬라이더 (DOD DNIS 마스터) + 우측 하단 패턴 ag-Grid
 *
 * Layout:
 * +--------------+--------------------------------------------+
 * | 노드 트리     | 카드 슬라이더 (DOD DNIS 변환)                |
 * | (280px)      | [카드] [카드] [카드]                          |
 * |              | [+ 추가]                                    |
 * | > 노드1      +--------------------------------------------+
 * | > 노드2      | 패턴 ag-Grid (선택 변환의 아이템)              |
 * +--------------+--------------------------------------------+
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input } from 'antd';
import { ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Network, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import DodTransItemDrawer, { type DodTransItemDrawerRef } from '../components/DodTransItemDrawer';
import DodTransMasterDrawer, { type DodTransMasterDrawerRef } from '../components/DodTransMasterDrawer';
import { dodTransQueryKeys, useDeleteItem, useDeleteMaster, useGetItemList, useGetMasterList, useGetNodeTenants, useGetNodes } from '../hooks/useDodTransQueries';
import { type DodTransItem, type DodTransMaster, EDIT_OPT_LABELS, type NodeDodTransGroup, TRANS_YN_LABELS } from '../types/dodTrans.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '회선관리', path: '/ipron/line/dod-trans' },
  { title: 'DOD DNIS관리', path: '/ipron/line/dod-trans' },
];

export default function DodTransListPage() {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const masterDrawerRef = useRef<DodTransMasterDrawerRef>(null);
  const itemDrawerRef = useRef<DodTransItemDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: masters = [] } = useGetMasterList();
  const { data: nodes = [] } = useGetNodes();
  const { data: nodeTenants = [] } = useGetNodeTenants();
  const { data: items = [], isLoading: isItemsLoading } = useGetItemList({
    params: selectedMasterId ? { dodTransId: selectedMasterId } : undefined,
    queryOptions: { enabled: !!selectedMasterId },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteMaster } = useDeleteMaster({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DOD DNIS 변환이 삭제되었습니다.');
        if (selectedMasterId) setSelectedMasterId(null);
        invalidateMasters();
      },
    },
  });

  const { mutate: deleteItem } = useDeleteItem({
    mutationOptions: {
      onSuccess: () => {
        toast.success('변환 패턴이 삭제되었습니다.');
        invalidateItems();
        invalidateMasters();
      },
    },
  });

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateMasters = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dodTransQueryKeys.getMasterList().queryKey });
  }, [queryClient]);

  const invalidateItems = useCallback(() => {
    if (selectedMasterId) {
      queryClient.invalidateQueries({
        queryKey: dodTransQueryKeys.getItemList({ dodTransId: selectedMasterId }).queryKey,
      });
    }
  }, [queryClient, selectedMasterId]);

  // ─── Derived data: 노드 > 테넌트 트리 구조 ──────────────────────────────────
  interface TenantInfo {
    tenantId: number;
    tenantName: string;
    masterCount: number;
  }
  interface NodeTenantGroup {
    nodeId: number;
    nodeName: string;
    tenants: TenantInfo[];
  }

  const nodeTenantTree: NodeTenantGroup[] = useMemo(() => {
    // TB_CC_NODETENANTMASTER 기반으로 노드 > 테넌트 트리 구성
    const nodeMap = new Map<number, { nodeName: string; tenantMap: Map<number, { tenantName: string; masterCount: number }> }>();

    for (const nt of nodeTenants) {
      if (!nodeMap.has(nt.nodeId)) {
        nodeMap.set(nt.nodeId, { nodeName: nt.nodeName, tenantMap: new Map() });
      }
      const node = nodeMap.get(nt.nodeId)!;
      if (!node.tenantMap.has(nt.tenantId)) {
        node.tenantMap.set(nt.tenantId, { tenantName: nt.tenantName, masterCount: 0 });
      }
    }

    // 마스터 데이터에서 카운트 집계
    for (const m of masters) {
      const node = nodeMap.get(m.nodeId);
      if (node) {
        const tenant = node.tenantMap.get(m.tenantId);
        if (tenant) tenant.masterCount++;
      }
    }

    return Array.from(nodeMap.entries())
      .map(([nodeId, data]) => ({
        nodeId,
        nodeName: data.nodeName,
        tenants: Array.from(data.tenantMap.entries()).map(([tenantId, t]) => ({
          tenantId,
          tenantName: t.tenantName,
          masterCount: t.masterCount,
        })),
      }))
      .sort((a, b) => a.nodeId - b.nodeId);
  }, [nodeTenants, masters]);

  const selectedMasters = useMemo(() => {
    if (!selectedNodeId || !selectedTenantId) return [];
    return masters.filter((m) => m.nodeId === selectedNodeId && m.tenantId === selectedTenantId);
  }, [masters, selectedNodeId, selectedTenantId]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  const selectedNodeName = selectedNode?.nodeName ?? '';

  const selectedTenantName = useMemo(() => {
    if (!selectedNodeId || !selectedTenantId) return '';
    const group = nodeTenantTree.find((g) => g.nodeId === selectedNodeId);
    return group?.tenants.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? '';
  }, [nodeTenantTree, selectedNodeId, selectedTenantId]);

  const selectedMaster = useMemo(() => {
    if (!selectedMasterId) return null;
    return masters.find((m) => m.dodTransId === selectedMasterId) ?? null;
  }, [masters, selectedMasterId]);

  const filteredMasters = useMemo(() => {
    if (!searchText) return selectedMasters;
    return selectedMasters.filter((m) => m.dodTransName?.toLowerCase().includes(searchText.toLowerCase()));
  }, [selectedMasters, searchText]);

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
    setSelectedMasterId(null);
    setSearchText('');
  };

  const handleCardSelect = (master: DodTransMaster) => {
    setSelectedMasterId(master.dodTransId);
  };

  const handleTreeItemClick = (master: DodTransMaster) => {
    setSelectedNodeId(master.nodeId);
    setSelectedMasterId(master.dodTransId);
    setTimeout(() => {
      const card = document.getElementById(`dod-trans-card-${master.dodTransId}`);
      card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
  };

  const handleCreateMaster = useCallback(() => {
    if (selectedNodeId && selectedTenantId) {
      masterDrawerRef.current?.open(undefined, selectedNodeId, selectedNodeName, selectedTenantId, selectedTenantName);
    }
  }, [selectedNodeId, selectedTenantId, selectedNodeName, selectedTenantName]);

  const handleEditMaster = useCallback((master: DodTransMaster) => {
    masterDrawerRef.current?.open(master);
  }, []);

  const handleDeleteMaster = useCallback(
    (master: DodTransMaster) => {
      modal.confirm.execute({
        onOk: () => deleteMaster({ id: master.dodTransId }),
        options: {
          title: 'DOD DNIS 변환 삭제',
          content: `"${master.dodTransName}" 변환을 삭제하시겠습니까?\n등록된 패턴이 있으면 삭제할 수 없습니다.`,
        },
      });
    },
    [modal, deleteMaster],
  );

  const handleCreateItem = useCallback(() => {
    if (selectedMasterId) {
      itemDrawerRef.current?.open(undefined, selectedMasterId);
    }
  }, [selectedMasterId]);

  const handleEditItem = useCallback((item: DodTransItem) => {
    itemDrawerRef.current?.open(item);
  }, []);

  const handleDeleteItem = useCallback(
    (item: DodTransItem) => {
      modal.confirm.execute({
        onOk: () => deleteItem({ dodTransId: item.dodTransId, listSeq: item.listSeq }),
        options: {
          title: '변환 패턴 삭제',
          content: `"${item.numPattern}" 패턴을 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteItem],
  );

  const handleMasterDrawerSuccess = useCallback(() => {
    invalidateMasters();
  }, [invalidateMasters]);

  const handleItemDrawerSuccess = useCallback(() => {
    invalidateItems();
    invalidateMasters();
  }, [invalidateItems, invalidateMasters]);

  const getCardMenuItems = (master: DodTransMaster) => [
    {
      key: 'edit',
      label: '수정',
      onClick: () => handleEditMaster(master),
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <Trash2 className="size-4" />,
      danger: true,
      onClick: () => handleDeleteMaster(master),
    },
  ];

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<DodTransItem>[] = useMemo(
    () => [
      {
        headerName: '번호패턴',
        field: 'numPattern',
        flex: 2,
        minWidth: 160,
        cellStyle: { fontFamily: 'monospace' },
      },
      {
        headerName: '편집옵션',
        field: 'editOpt',
        flex: 1,
        minWidth: 100,
        cellRenderer: (params: ICellRendererParams<DodTransItem>) => {
          if (!params.data) return null;
          return <span>{EDIT_OPT_LABELS[params.data.editOpt] ?? String(params.data.editOpt)}</span>;
        },
      },
      {
        headerName: 'Digit수',
        field: 'delCount',
        flex: 0.7,
        minWidth: 80,
      },
      {
        headerName: '추가Digit',
        field: 'addDigit',
        flex: 1,
        minWidth: 100,
        valueFormatter: (params) => params.data?.addDigit ?? '-',
      },
      {
        headerName: '사용여부',
        field: 'transYn',
        flex: 0.8,
        minWidth: 90,
        cellRenderer: (params: ICellRendererParams<DodTransItem>) => {
          if (!params.data) return null;
          const isOn = params.data.transYn === 1;
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                isOn ? 'text-green-700 bg-green-50 border border-green-200' : 'text-gray-500 bg-gray-100 border border-gray-200'
              }`}
            >
              {TRANS_YN_LABELS[params.data.transYn] ?? '-'}
            </span>
          );
        },
      },
      {
        headerName: '',
        field: 'listSeq',
        width: 50,
        maxWidth: 50,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<DodTransItem>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              className="flex items-center justify-center w-full h-full"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteItem(params.data!);
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [handleDeleteItem],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Split container: Left Tree + Right (Cards + Bottom Grid) */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* ===== Left Panel: Node Tree (280px) ===== */}
        <div className="w-[280px] min-w-[280px] bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <Input placeholder="변환명 검색" size="small" allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} />
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
                              <span className="text-[10px] text-gray-400">{tenant.masterCount}</span>
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

        {/* ===== Right Panel: Cards (top) + Item Grid (bottom) ===== */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {selectedNodeId ? (
            <>
              {/* -- Top: Card Slider Area -- */}
              <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
                {/* Card grid header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">
                      {selectedNodeName} {selectedTenantName && `/ ${selectedTenantName}`} DOD DNIS 변환 ({filteredMasters.length}건)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={handleCreateMaster}>
                      추가
                    </Button>
                  </div>
                </div>

                {/* Card slider body */}
                <div className="flex items-center px-4 py-3 h-[150px]">
                  {filteredMasters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
                      <Empty description={false} imageStyle={{ height: 40 }} />
                      <span className="text-sm">{searchText ? '검색 결과가 없습니다' : '이 테넌트에 등록된 DOD DNIS 변환이 없습니다'}</span>
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
                        {filteredMasters.map((master) => {
                          const isCardSelected = selectedMasterId === master.dodTransId;
                          return (
                            <div
                              key={master.dodTransId}
                              id={`dod-trans-card-${master.dodTransId}`}
                              className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all min-w-[220px] max-w-[260px] min-h-[100px] flex-shrink-0 flex flex-col ${
                                isCardSelected
                                  ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                                  : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                              }`}
                              onClick={() => handleCardSelect(master)}
                              onDoubleClick={() => handleEditMaster(master)}
                            >
                              {/* Card header */}
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-semibold text-gray-800 truncate">{master.dodTransName}</span>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Dropdown menu={{ items: getCardMenuItems(master) }} trigger={['click']} placement="bottomRight">
                                    <button type="button" className="p-1 rounded hover:bg-gray-100 transition-colors">
                                      <MoreVertical className="size-4 text-gray-400" />
                                    </button>
                                  </Dropdown>
                                </div>
                              </div>

                              {/* Card info */}
                              <div className="text-xs text-gray-500 space-y-0.5">
                                <div>{master.nodeName}</div>
                                <div>패턴: {master.itemCount}건</div>
                              </div>

                              {/* Item count tag */}
                              <div className="flex flex-wrap gap-1 mt-auto pt-2">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                    master.itemCount > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  {master.itemCount > 0 ? `${master.itemCount}건 등록` : '패턴 미등록'}
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

              {/* -- Bottom: Item Grid -- */}
              <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Bottom header */}
                <div className="px-5 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100 min-h-[40px]">
                  <span className="text-sm font-semibold text-gray-800">
                    {selectedMaster ? `${selectedMaster.dodTransName} ` : ''}패턴 ({items.length}건)
                  </span>
                  {selectedMaster && (
                    <Button size="small" icon={<Plus className="size-3.5" />} onClick={handleCreateItem}>
                      추가
                    </Button>
                  )}
                </div>

                {/* Grid */}
                <div className="flex-1">
                  {selectedMasterId ? (
                    <AgGridReact<DodTransItem>
                      rowData={items}
                      columnDefs={columnDefs}
                      gridOptions={{
                        ...gridOptions,
                        statusBar: undefined,
                        pagination: false,
                        sideBar: false,
                      }}
                      loading={isItemsLoading}
                      getRowId={(params) => `${params.data.dodTransId}-${params.data.listSeq}`}
                      defaultColDef={{ filter: true, sortable: true }}
                      onRowDoubleClicked={(e) => {
                        if (e.data) handleEditItem(e.data);
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                      <Empty description={false} />
                      <span className="text-sm">상단에서 변환을 선택하세요</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Empty state when no node selected */
            <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
              <Empty description={false} />
              <span className="text-sm">좌측에서 테넌트를 선택하세요</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Drawers ===== */}
      <DodTransMasterDrawer ref={masterDrawerRef} onSuccess={handleMasterDrawerSuccess} />
      <DodTransItemDrawer ref={itemDrawerRef} onSuccess={handleItemDrawerSuccess} />
    </div>
  );
}
