/**
 * DOD DNIS 관리 목록 페이지
 *
 * 멀티테넌트 개편(상담사 관리/내선 프로파일 정합): byNode/byTenant 뷰전환 + 탭바 제거
 *   → 상단에 노드 Select + 테넌트 ScopeSelect 두 필터(각 "전체" 포함) + 요약.
 *   마스터→패턴 2단 구조라 마스터 선택용 카드 슬라이더는 유지(노드/테넌트/검색 클라이언트 필터).
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [노드▼] [테넌트▼]  총 변환/패턴      🔍[검색] [+추가]  │ ← 헤더
 * │ [변환카드] [변환카드] ...                              │ ← 마스터 슬라이더
 * ├──────────────────────────────────────────────────────┤
 * │ {마스터} 패턴 (n건)                          [+ 패턴]  │
 * │ ag-Grid                                               │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowSelectionOptions, SelectionChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input, Select } from 'antd';
import { ArrowLeftRight, ChevronLeft, ChevronRight, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import DodTransItemDrawer, { type DodTransItemDrawerRef } from '../../features/dod-trans/components/DodTransItemDrawer';
import DodTransMasterDrawer, { type DodTransMasterDrawerRef } from '../../features/dod-trans/components/DodTransMasterDrawer';
import { dodTransQueryKeys, useDeleteItemBatch, useDeleteMaster, useGetItemList, useGetMasterList, useGetNodes } from '../../features/dod-trans/hooks/useDodTransQueries';
import { type DodTransItem, type DodTransMaster, TRANS_YN_LABELS } from '../../features/dod-trans/types';
import { useGetNodeTenants, useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
import ScopeSelect from '@/components/custom/ScopeSelect';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '회선관리' }, { title: '번호 변환' }, { title: 'DOD DNIS관리', path: '/ipron/line/dod-trans' }];

export default function DodTransList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // URL query params for initial selection
  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const initTenantId = searchParams.get('tenantId') ? Number(searchParams.get('tenantId')) : null;
  const initMasterId = searchParams.get('dodTransId') ? Number(searchParams.get('dodTransId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId); // null=전체 노드
  const [tenantFilter, setTenantFilter] = useState<number | null>(initTenantId); // 운영자 전용 필터 (null=전체 테넌트)
  const selectedTenantId = operatorMode ? tenantFilter : ctxTenantId; // 일반=ctx(본인 테넌트), 운영자=필터
  const [tenantFirst, setTenantFirst] = useState(true); // 스코프 필터 순서 — 기본 테넌트→노드, ↔ 버튼으로 스위칭
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(initMasterId);
  const [searchText, setSearchText] = useState('');
  const [numPatternSearch, setNumPatternSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<DodTransItem[]>([]);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const masterDrawerRef = useRef<DodTransMasterDrawerRef>(null);
  const itemDrawerRef = useRef<DodTransItemDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: masters = [] } = useGetMasterList();
  const { data: allNodes = [] } = useGetNodes();
  // 운영자 모드=전체 노드, 일반 테넌트 모드=로그인 테넌트에 매핑된 노드만
  const nodes = useScopedNodes(allNodes);
  const { data: nodeTenants = [] } = useGetNodeTenants();

  // 운영자 모드 → 테넌트 모드 전환 시, 선택 노드가 스코프 밖이면 해제
  useEffect(() => {
    if (selectedNodeId != null && nodes.length > 0 && !nodes.some((n) => n.nodeId === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);
  const itemListParams = useMemo(() => {
    if (!selectedMasterId) return undefined;
    const p: Record<string, unknown> = { dodTransId: selectedMasterId };
    if (numPatternSearch.trim()) p.numPattern = numPatternSearch.trim();
    return p;
  }, [selectedMasterId, numPatternSearch]);

  const { data: items = [], isLoading: isItemsLoading } = useGetItemList({
    params: itemListParams,
    queryOptions: { enabled: !!selectedMasterId },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteMaster } = useDeleteMaster({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DOD DNIS 변환이 삭제되었습니다');
        if (selectedMasterId) setSelectedMasterId(null);
        invalidateMasters();
      },
    },
  });

  const { mutate: deleteItemBatch } = useDeleteItemBatch({
    mutationOptions: {
      onSuccess: () => {
        toast.success('변환 패턴이 삭제되었습니다');
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

  // ─── Options — 노드/테넌트 셀렉트 소스 (기존 탭이 쓰던 목록 그대로) ─────────────
  // 노드: 전체 노드 목록(byNode 탭이 쓰던 것)
  // 테넌트: 마스터에 존재하는 테넌트(byTenant 탭이 쓰던 것)
  // 테넌트: 공통 소스(토큰의 접근가능 테넌트). masters 에서 뽑으면 "마스터가 있는 테넌트"만 나와
  // 데이터 없는 테넌트로는 신규 등록조차 못 하므로, 접근 가능한 전체 테넌트를 노출한다.
  // 선택 노드가 있으면 그 노드에 매핑된 테넌트(nodeTenants)만 노출 (양방향 필터).
  // 데이터가 없어도 노드에 매핑된 테넌트면 신규 등록 대상으로 남긴다.
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants);
  const assignedTenants = useMemo(() => {
    const base = (availableTenants ?? []).map((t) => ({ tenantId: t.tenantId, tenantName: t.tenantName ?? `테넌트 ${t.tenantId}` }));
    const scoped = selectedNodeId != null ? base.filter((t) => nodeTenants.some((nt) => nt.nodeId === selectedNodeId && nt.tenantId === t.tenantId)) : base;
    return scoped.sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [availableTenants, nodeTenants, selectedNodeId]);

  // 선택 노드로 테넌트 옵션이 좁혀져 현재 운영자 테넌트 필터가 목록에 없으면 전체로 리셋 (교착 방지)
  useEffect(() => {
    if (operatorMode && tenantFilter != null && !assignedTenants.some((t) => t.tenantId === tenantFilter)) {
      setTenantFilter(null);
    }
  }, [operatorMode, tenantFilter, assignedTenants]);

  // ─── Derived — 노드/테넌트/검색 클라이언트 필터 ─────────────────────────────────
  const filteredMasters = useMemo(() => {
    let list = masters;
    if (selectedNodeId != null) list = list.filter((m) => m.nodeId === selectedNodeId);
    if (selectedTenantId != null) list = list.filter((m) => m.tenantId === selectedTenantId);
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      list = list.filter((m) => [m.dodTransName, m.nodeName, m.tenantName].some((v) => v?.toString().toLowerCase().includes(kw)));
    }
    return list;
  }, [masters, selectedNodeId, selectedTenantId, searchText]);

  // 헤더 요약 — 현재 필터 기준 총 변환/패턴 합계
  const summary = useMemo(() => {
    let patterns = 0;
    for (const m of filteredMasters) patterns += m.itemCount ?? 0;
    return { total: filteredMasters.length, patterns };
  }, [filteredMasters]);

  const selectedTenantName = useMemo(() => {
    if (selectedTenantId == null) return '';
    return assignedTenants.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? '';
  }, [assignedTenants, selectedTenantId]);

  const selectedMaster = useMemo(() => {
    if (!selectedMasterId) return null;
    return masters.find((m) => m.dodTransId === selectedMasterId) ?? null;
  }, [masters, selectedMasterId]);

  // ─── Effects ─────────────────────────────────────────────────────────────
  // 필터 결과가 바뀌면 선택 마스터 유효성 보정 (없으면 첫 마스터로)
  useEffect(() => {
    const first = filteredMasters[0];
    if (!selectedMasterId && first) {
      setSelectedMasterId(first.dodTransId);
    } else if (selectedMasterId && !filteredMasters.some((m) => m.dodTransId === selectedMasterId)) {
      setSelectedMasterId(first?.dodTransId ?? null);
    }
  }, [filteredMasters, selectedMasterId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleCardSelect = (master: DodTransMaster) => {
    setSelectedMasterId(master.dodTransId);
    setNumPatternSearch('');
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
      if ((master.itemCount ?? 0) > 0) {
        toast.error(`등록된 패턴 ${master.itemCount}건이 있어 삭제할 수 없습니다`);
        return;
      }
      modal.confirm.execute({
        onOk: () => deleteMaster({ id: master.dodTransId }),
        options: {
          title: 'DOD DNIS 변환 삭제',
          content: `"${master.dodTransName}" 변환을 삭제하시겠습니까?`,
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

  const handleDeleteSelectedItems = useCallback(() => {
    if (selectedItems.length === 0) return;
    modal.confirm.execute({
      onOk: () => {
        deleteItemBatch(selectedItems.map((item) => ({ dodTransId: item.dodTransId, listSeq: item.listSeq })));
        setSelectedItems([]);
      },
      options: {
        title: '변환 패턴 삭제',
        content: `선택한 ${selectedItems.length}건을 삭제하시겠습니까?`,
      },
    });
  }, [modal, deleteItemBatch, selectedItems]);

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

  // ─── Row selection ────────────────────────────────────────────────────────
  const itemRowSelection = useMemo<RowSelectionOptions>(
    () => ({ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<DodTransItem>[] = useMemo(
    () => [
      {
        headerName: '노드명',
        colId: 'nodeName',
        flex: 1,
        minWidth: 110,
        valueGetter: () => selectedMaster?.nodeName ?? '-',
        tooltipValueGetter: () => selectedMaster?.nodeName ?? '-',
      },
      {
        headerName: '테넌트',
        colId: 'tenantName',
        flex: 1,
        minWidth: 110,
        valueGetter: () => selectedMaster?.tenantName ?? '-',
        tooltipValueGetter: () => selectedMaster?.tenantName ?? '-',
      },
      {
        headerName: '번호패턴',
        field: 'numPattern',
        flex: 2,
        minWidth: 160,
        cellStyle: { fontFamily: 'monospace' },
        tooltipField: 'numPattern',
      },
      {
        headerName: 'Digit 수',
        field: 'delCount',
        flex: 0.7,
        minWidth: 80,
        filter: 'agNumberColumnFilter',
      },
      {
        headerName: '추가 Digit',
        field: 'addDigit',
        flex: 1,
        minWidth: 100,
        valueFormatter: (params) => params.data?.addDigit ?? '-',
        tooltipField: 'addDigit',
      },
      {
        headerName: '사용여부',
        field: 'transYn',
        flex: 0.8,
        minWidth: 90,
        filterValueGetter: (params) => (params.data ? (TRANS_YN_LABELS[params.data.transYn] ?? '-') : null),
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
    ],
    [selectedMaster],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 박스1: 헤더 (노드/테넌트 스코프 + 요약 + 검색/추가) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 스코프 필터 — 일반=노드만, 운영자=테넌트↔노드(기본 테넌트→노드, ↔ 버튼으로 스위칭) */}
            {(() => {
              const nodeFilterEl = (
                <div key="node" className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
                  <Network className="size-3.5 shrink-0 text-blue-600" />
                  <Select
                    size="small"
                    variant="borderless"
                    value={selectedNodeId ?? '__all__'}
                    onChange={(v) => {
                      setSelectedNodeId(v === '__all__' ? null : Number(v));
                      setSelectedMasterId(null);
                    }}
                    options={[{ value: '__all__', label: '전체 노드' }, ...nodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))]}
                    style={{ width: 150 }}
                    popupMatchSelectWidth={false}
                  />
                </div>
              );
              const tenantFilterEl = (
                <ScopeSelect
                  key="tenant"
                  kind="tenant"
                  options={assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
                  value={tenantFilter == null ? null : String(tenantFilter)}
                  onChange={(id) => {
                    setTenantFilter(id == null ? null : Number(id));
                    setSelectedMasterId(null);
                  }}
                />
              );
              const swapBtnEl = (
                <button
                  key="swap"
                  type="button"
                  onClick={() => setTenantFirst((v) => !v)}
                  title="테넌트/노드 순서 전환"
                  className="inline-flex items-center justify-center size-7 rounded-md border border-gray-200 text-gray-400 hover:text-[#405189] hover:border-[#c5cbe0] transition"
                >
                  <ArrowLeftRight className="size-3.5" />
                </button>
              );
              // 일반 모드: 노드 Select만. 운영자 모드: 테넌트+노드(스위칭 가능).
              if (!operatorMode) return nodeFilterEl;
              return tenantFirst ? [tenantFilterEl, swapBtnEl, nodeFilterEl] : [nodeFilterEl, swapBtnEl, tenantFilterEl];
            })()}
            {/* 요약 — 총 변환/패턴 */}
            <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">
                총 변환 <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
              </span>
              <span className="text-gray-500">
                패턴 <b className="text-blue-600 font-semibold">{summary.patterns.toLocaleString()}</b>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
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
        </div>

        {/* ===== 박스2: 마스터(변환) 선택 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center h-[170px] px-4 py-3">
            {filteredMasters.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">{searchText.trim().length > 0 ? '검색 결과가 없습니다' : '등록된 DOD DNIS 변환이 없습니다'}</span>
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
                        className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[180px] h-[130px] flex-shrink-0 flex flex-col ${
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
                            <span className="truncate">{master.nodeName ?? `노드 ${master.nodeId}`}</span>
                          </div>
                          <div className="truncate">{master.tenantName ?? '-'}</div>
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

        {/* ===== 박스3: 패턴 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Bottom header */}
          <div className="px-5 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100 min-h-[40px]">
            <span className="text-sm font-semibold text-gray-800">
              {selectedMaster ? `${selectedMaster.dodTransName} ` : ''}패턴 ({items.length}건)
            </span>
            <div className="flex items-center gap-2">
              <Button
                danger
                icon={<Trash2 className="size-3.5" />}
                disabled={selectedItems.length === 0}
                title={selectedItems.length === 0 ? '삭제할 항목을 선택하세요' : `선택한 ${selectedItems.length}건 삭제`}
                onClick={handleDeleteSelectedItems}
              >
                삭제
              </Button>
              {selectedMaster && (
                <Input
                  allowClear
                  prefix={<Search className="size-3.5 text-gray-400" />}
                  placeholder="번호패턴 검색"
                  value={numPatternSearch}
                  onChange={(e) => setNumPatternSearch(e.target.value)}
                  style={{ width: 180 }}
                  size="small"
                />
              )}
              {selectedMaster && (
                <Button icon={<Plus className="size-3.5" />} onClick={handleCreateItem}>
                  패턴 추가
                </Button>
              )}
            </div>
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
                rowSelection={itemRowSelection}
                loading={isItemsLoading}
                getRowId={(params) => `${params.data.dodTransId}-${params.data.listSeq}`}
                defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
                onRowDoubleClicked={(e) => {
                  if (e.data) handleEditItem(e.data);
                }}
                onSelectionChanged={(e: SelectionChangedEvent<DodTransItem>) => {
                  setSelectedItems(e.api.getSelectedRows());
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
