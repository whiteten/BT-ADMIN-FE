/**
 * DOD DNIS 관리 목록 페이지
 * Pattern: 상단 노드 탭 바 + 카드 슬라이더 (테넌트 Dropdown + DOD 변환 카드) + 하단 패턴 ag-Grid
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [←] [전체][C1N1][C1N2] [→]           🔍[검색] [+추가] │ ← 노드 탭 바
 * │ [테넌트▼] [Master1] [Master2] ...                     │ ← 슬라이더 (테넌트 Dropdown + 마스터 카드)
 * ├──────────────────────────────────────────────────────┤
 * │ {마스터} 패턴 (n건)                          [+ 패턴]  │
 * │ ag-Grid                                               │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input, type MenuProps } from 'antd';
import { Building2, ChevronDown, ChevronLeft, ChevronRight, Layers, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import DodTransItemDrawer, { type DodTransItemDrawerRef } from '../components/DodTransItemDrawer';
import DodTransMasterDrawer, { type DodTransMasterDrawerRef } from '../components/DodTransMasterDrawer';
import { dodTransQueryKeys, useDeleteItem, useDeleteMaster, useGetItemList, useGetMasterList, useGetNodeTenants, useGetNodes } from '../hooks/useDodTransQueries';
import { type DodTransItem, type DodTransMaster, EDIT_OPT_LABELS, TRANS_YN_LABELS } from '../types/dodTrans.types';
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
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // URL query params for initial selection
  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const initTenantId = searchParams.get('tenantId') ? Number(searchParams.get('tenantId')) : null;
  const initMasterId = searchParams.get('dodTransId') ? Number(searchParams.get('dodTransId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(initTenantId);
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(initMasterId);
  const [searchText, setSearchText] = useState('');
  const tabScrollRef = useRef<HTMLDivElement>(null);
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

  // ─── Derived data ─────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const searchFilteredMasters = useMemo(() => {
    if (!isSearching) return masters;
    const kw = searchText.trim().toLowerCase();
    return masters.filter((m) => [m.dodTransName, m.nodeName, m.tenantName].some((v) => v?.toString().toLowerCase().includes(kw)));
  }, [masters, isSearching, searchText]);

  // 노드 필터 적용된 마스터 카드 목록 (테넌트 필터는 그룹 표시로 대체)
  const filteredMasters = useMemo(() => {
    let list = searchFilteredMasters;
    if (!isSearching && selectedNodeId !== null) list = list.filter((m) => m.nodeId === selectedNodeId);
    return list;
  }, [searchFilteredMasters, selectedNodeId, isSearching]);

  // 테넌트별 그룹화 (카드 슬라이더 표시용)
  const mastersByTenant = useMemo(() => {
    const groupMap = new Map<number, { tenantId: number; tenantName: string; masters: typeof filteredMasters }>();
    for (const m of filteredMasters) {
      if (!groupMap.has(m.tenantId)) {
        groupMap.set(m.tenantId, { tenantId: m.tenantId, tenantName: m.tenantName, masters: [] });
      }
      groupMap.get(m.tenantId)!.masters.push(m);
    }
    return Array.from(groupMap.values()).sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [filteredMasters]);

  // 선택 가능한 테넌트 목록 (선택 노드의 테넌트들)
  const tenantOptionsForNode = useMemo(() => {
    const map = new Map<number, { tenantId: number; tenantName: string }>();
    const source = selectedNodeId === null ? masters : masters.filter((m) => m.nodeId === selectedNodeId);
    for (const m of source) {
      if (!map.has(m.tenantId)) map.set(m.tenantId, { tenantId: m.tenantId, tenantName: m.tenantName });
    }
    return Array.from(map.values());
  }, [masters, selectedNodeId]);

  const tenantMenuItems: MenuProps['items'] = useMemo(
    () => [
      { key: 'all', label: '전체 테넌트', onClick: () => setSelectedTenantId(null) },
      { type: 'divider' as const },
      ...tenantOptionsForNode.map((t) => ({
        key: String(t.tenantId),
        label: t.tenantName,
        onClick: () => setSelectedTenantId(t.tenantId),
      })),
    ],
    [tenantOptionsForNode],
  );

  const selectedTenantLabel = useMemo(() => {
    if (selectedTenantId === null) return '전체 테넌트';
    return tenantOptionsForNode.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? '전체 테넌트';
  }, [selectedTenantId, tenantOptionsForNode]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  const selectedNodeName = selectedNode?.nodeName ?? '';

  const selectedTenantName = useMemo(() => {
    if (!selectedTenantId) return '';
    const m = masters.find((x) => x.tenantId === selectedTenantId);
    return m?.tenantName ?? '';
  }, [masters, selectedTenantId]);

  const selectedMaster = useMemo(() => {
    if (!selectedMasterId) return null;
    return masters.find((m) => m.dodTransId === selectedMasterId) ?? null;
  }, [masters, selectedMasterId]);

  // ─── Effects ─────────────────────────────────────────────────────────────
  // 노드 변경 시 현재 선택된 테넌트가 노드에 없으면 해제
  useEffect(() => {
    if (selectedTenantId !== null && selectedNodeId !== null) {
      const exists = tenantOptionsForNode.some((t) => t.tenantId === selectedTenantId);
      if (!exists) setSelectedTenantId(null);
    }
  }, [selectedNodeId, tenantOptionsForNode, selectedTenantId]);

  // 자동 마스터 선택 — 그룹화된 첫 테넌트의 첫 마스터로 (정렬 일관성 유지)
  useEffect(() => {
    const firstMaster = mastersByTenant[0]?.masters[0];
    if (!selectedMasterId && firstMaster) {
      setSelectedMasterId(firstMaster.dodTransId);
    } else if (selectedMasterId && !filteredMasters.some((m) => m.dodTransId === selectedMasterId)) {
      setSelectedMasterId(firstMaster?.dodTransId ?? null);
    }
  }, [mastersByTenant, filteredMasters, selectedMasterId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number | null) => {
    setSelectedNodeId(nodeId);
    setSelectedMasterId(null);
    setSearchText('');
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setSelectedNodeId(null);
      setSelectedTenantId(null);
      setSelectedMasterId(null);
    }
  };

  const handleCardSelect = (master: DodTransMaster) => {
    setSelectedMasterId(master.dodTransId);
  };

  const handleCreateMaster = useCallback(() => {
    const nodeId = selectedNodeId ?? nodes[0]?.nodeId;
    if (!nodeId) return;
    const nodeName = nodes.find((n) => n.nodeId === nodeId)?.nodeName ?? '';
    const tenantId = selectedTenantId ?? undefined;
    const tenantName = selectedTenantName || '';
    masterDrawerRef.current?.open(undefined, nodeId, nodeName, tenantId, tenantName);
  }, [selectedNodeId, selectedTenantId, selectedTenantName, nodes]);

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
        headerName: '노드명',
        colId: 'nodeName',
        flex: 1,
        minWidth: 110,
        valueGetter: () => selectedMaster?.nodeName ?? '-',
      },
      {
        headerName: '테넌트',
        colId: 'tenantName',
        flex: 1,
        minWidth: 110,
        valueGetter: () => selectedMaster?.tenantName ?? '-',
      },
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
    [handleDeleteItem, selectedMaster],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Single column: Tab + Cards (top) + Item Grid (bottom) */}
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 탭 바 + 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
          {/* Header: 노드 탭 바 + 검색 + 추가 버튼 */}
          <div className="flex items-stretch bg-white border-b border-gray-200 pr-3 flex-shrink-0 h-[56px]">
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
              {/* 전체 탭 */}
              <button
                type="button"
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] max-w-[200px] flex-shrink-0 transition-colors ${
                  selectedNodeId === null && !isSearching
                    ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]'
                    : 'text-gray-500 border-b-transparent hover:text-gray-700'
                }`}
                onClick={() => handleNodeSelect(null)}
              >
                <Layers className="size-3.5" />
                <span>전체</span>
                <span className="text-[11px] text-gray-400">({searchFilteredMasters.length})</span>
              </button>

              {/* 노드 탭들 */}
              {nodes.map((node) => {
                const nodeCount = searchFilteredMasters.filter((m) => m.nodeId === node.nodeId).length;
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
                    <span className="text-[11px] text-gray-400 flex-shrink-0">({nodeCount})</span>
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

            {/* 우측: 검색 + 추가 버튼 */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="DOD DNIS 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreateMaster}>
                추가
              </Button>
            </div>
          </div>

          {/* Card slider body — 높이 고정 */}
          <div className="flex items-center h-[170px] px-4 py-3">
            <div className="relative flex items-center gap-2 w-full">
              <Button
                type="text"
                icon={<ChevronLeft className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {/* 마스터 카드들 — 테넌트별 그룹화 */}
                {mastersByTenant.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">
                      {isSearching ? '검색 결과가 없습니다' : selectedNodeId ? '이 노드에 등록된 DOD DNIS 변환이 없습니다' : '등록된 DOD DNIS 변환이 없습니다'}
                    </span>
                  </div>
                ) : (
                  mastersByTenant.map((group, groupIdx) => {
                    const isTenantActive = selectedMaster?.tenantId === group.tenantId;
                    return (
                      <div key={group.tenantId} className="flex items-stretch gap-3 flex-shrink-0">
                        {/* 테넌트 라벨 (그룹 헤더) — 선택된 마스터의 테넌트면 강조 */}
                        <div
                          className={`flex flex-col items-center justify-center w-[100px] flex-shrink-0 px-2 rounded transition-all border-l-4 ${
                            isTenantActive
                              ? 'border-l-[#405189] bg-[#405189] text-white shadow-[0_2px_8px_rgba(64,81,137,0.25)]'
                              : 'border-l-[#a3b1d6] bg-blue-50/50 text-[#405189]'
                          }`}
                        >
                          <Building2 className={`size-4 flex-shrink-0 ${isTenantActive ? 'text-white' : 'text-[#405189]'}`} />
                          <span
                            className={`text-[11px] font-semibold mt-1 w-full text-center truncate ${isTenantActive ? 'text-white' : 'text-[#405189]'}`}
                            title={group.tenantName}
                          >
                            {group.tenantName}
                          </span>
                          <span className={`text-[10px] ${isTenantActive ? 'text-white/80' : 'text-gray-500'}`}>{group.masters.length}건</span>
                        </div>

                        {/* 그룹 내 마스터 카드들 */}
                        {group.masters.map((master) => {
                          const isCardSelected = selectedMasterId === master.dodTransId;
                          return (
                            <div
                              key={master.dodTransId}
                              id={`dod-trans-card-${master.dodTransId}`}
                              className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[160px] h-[130px] flex-shrink-0 flex flex-col ${
                                isCardSelected
                                  ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                                  : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                              }`}
                              onClick={(e) => {
                                handleCardSelect(master);
                                (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                              }}
                              onDoubleClick={() => handleEditMaster(master)}
                            >
                              {/* Card header */}
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-gray-800 truncate">{master.dodTransName}</span>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Dropdown menu={{ items: getCardMenuItems(master) }} trigger={['click']} placement="bottomRight">
                                    <button type="button" className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0">
                                      <MoreVertical className="size-3.5 text-gray-400" />
                                    </button>
                                  </Dropdown>
                                </div>
                              </div>

                              {/* Card info */}
                              <div className="text-xs text-gray-500 space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <Network className="size-3 text-gray-400" />
                                  <span className="truncate">{master.nodeName ?? `Node ${master.nodeId}`}</span>
                                </div>
                              </div>

                              {/* 패턴 건수 태그 */}
                              <div className="flex flex-wrap gap-1 mt-auto">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                    master.itemCount > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  {master.itemCount > 0 ? `패턴 ${master.itemCount}건` : '패턴 미등록'}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* 그룹 사이 구분선 */}
                        {groupIdx < mastersByTenant.length - 1 && <div className="border-l border-gray-200 mx-1" />}
                      </div>
                    );
                  })
                )}
              </div>
              <Button
                type="text"
                icon={<ChevronRight className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
            </div>
          </div>
        </div>

        {/* ===== 하단: 패턴 ag-Grid ===== */}
        <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Bottom header */}
          <div className="px-5 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100 min-h-[40px]">
            <span className="text-sm font-semibold text-gray-800">
              {selectedMaster ? `${selectedMaster.dodTransName} ` : ''}패턴 ({items.length}건)
            </span>
            {selectedMaster && (
              <Button icon={<Plus className="size-3.5" />} onClick={handleCreateItem}>
                패턴 추가
              </Button>
            )}
          </div>

          {/* Grid */}
          <div className="flex-1 min-h-0">
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
                defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
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
      </div>

      {/* ===== Drawers ===== */}
      <DodTransMasterDrawer ref={masterDrawerRef} onSuccess={handleMasterDrawerSuccess} nodes={nodes} nodeTenants={nodeTenants} />
      <DodTransItemDrawer ref={itemDrawerRef} onSuccess={handleItemDrawerSuccess} />
    </div>
  );
}
