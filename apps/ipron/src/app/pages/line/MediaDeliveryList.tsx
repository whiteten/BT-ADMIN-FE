/**
 * 미디어전달관리 목록 페이지
 * Pattern: 상단 노드 탭 바 + 카드 슬라이더 (MD그룹) + 하단 미디어전달 카드 리스트
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [←] [전체(n)] [C1N1(2)] [C1N2(3)] [→]  🔍[검색] [+추가] │  ← 노드 탭 바
 * │ [Card1] [Card2] [Card3] ...                           │  ← MD그룹 카드 슬라이더
 * ├──────────────────────────────────────────────────────┤
 * │ {그룹명} 미디어전달 (n/2건)                  [+추가]    │
 * │ A/B 장비 카드 리스트                                   │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, GridApi, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input, Select } from 'antd';
import { ChevronLeft, ChevronRight, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
import { VIEW_MODE, useBreadcrumbStore, useViewMode } from '@/shared-store';
import { toast } from '@/shared-util';
import MdGrpDrawer, { type MdGrpDrawerRef } from '../../features/media-delivery/components/MdGrpDrawer';
import { mediaDeliveryQueryKeys, useDeleteMdGrp, useDeleteMdItem, useGetMdGrps, useGetMdItems, useGetNodes } from '../../features/media-delivery/hooks/useMediaDeliveryQueries';
import {
  CHECK_TYPE_LABELS,
  HA_TYPE_LABELS,
  MD_STATE_LABELS,
  MD_VENDOR_LABELS,
  type MdGrp,
  type MdItem,
  RTP_TRANS_TYPE_LABELS,
  TRANSPORT_TYPE_LABELS,
} from '../../features/media-delivery/types';
import { useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
import ViewModeToggle from '@/components/custom/ViewModeToggle';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '미디어 관리', path: '/ipron/line/media-delivery' },
  { title: '미디어전달관리', path: '/ipron/line/media-delivery' },
];

export default function MediaDeliveryList() {
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

  // URL query params for initial selection
  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const initGrpId = searchParams.get('grpId') ? Number(searchParams.get('grpId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedGrpId, setSelectedGrpId] = useState<number | null>(initGrpId);
  const [searchText, setSearchText] = useState('');
  // MD그룹 목록 표기방식(카드형/리스트형) — localStorage 유지. 화면키는 미디어전달관리 전용.
  const [viewMode, setViewMode] = useViewMode('ipron-media-delivery');
  const cardScrollRef = useRef<HTMLDivElement>(null);
  // 리스트형 그룹 그리드 api — 선택 행 강조(rowClassRules)는 데이터 변경 시에만 재평가되므로 수동 redraw 가 필요하다.
  const grpGridApiRef = useRef<GridApi<MdGrp> | null>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const mdGrpDrawerRef = useRef<MdGrpDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  // 갭-2: 그룹명 검색은 서버사이드 LIKE 필터 (SWAT IPR20S1090_SQL.xml search1 파라미터 대응)
  const grpNameParam = searchText.trim() || undefined;
  const { data: mdGrps = [] } = useGetMdGrps({
    params: grpNameParam ? { grpName: grpNameParam } : undefined,
  });
  const { data: allNodes = [] } = useGetNodes();
  // 운영자 모드=전체 노드, 일반 테넌트 모드=로그인 테넌트에 매핑된 노드만
  const nodes = useScopedNodes(allNodes);

  // 운영자 모드 → 테넌트 모드 전환 시, 선택 노드가 스코프 밖이면 해제
  useEffect(() => {
    if (selectedNodeId != null && nodes.length > 0 && !nodes.some((n) => n.nodeId === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  const { data: mdItems = [] } = useGetMdItems({
    params: selectedGrpId ? { grpId: selectedGrpId } : undefined,
    queryOptions: { enabled: !!selectedGrpId },
  });
  // 전체 아이템 (카드 장애 표시용 — 노드 무관하게 전체 조회)
  const { data: allItems = [] } = useGetMdItems({
    queryOptions: { enabled: true },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteMdGrp } = useDeleteMdGrp({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어전달그룹이 삭제되었습니다');
        if (selectedGrpId) setSelectedGrpId(null);
        invalidateMdGrps();
      },
    },
  });

  const { mutate: deleteMdItem } = useDeleteMdItem({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어전달이 삭제되었습니다');
        invalidateMdItems();
        invalidateMdGrps();
      },
    },
  });

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateMdGrps = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: mediaDeliveryQueryKeys.getMdGrps().queryKey });
  }, [queryClient]);

  const invalidateMdItems = useCallback(() => {
    if (selectedGrpId) {
      queryClient.invalidateQueries({
        queryKey: mediaDeliveryQueryKeys.getMdItems({ grpId: selectedGrpId }).queryKey,
      });
    }
  }, [queryClient, selectedGrpId]);

  // ─── 그룹별 장애 상태 집계 (카드 표시용) ─────────────────────────────────
  // grpId → { hasFault, faultCount, totalCount }
  const grpStatusMap = useMemo(() => {
    const map = new Map<number, { hasFault: boolean; faultCount: number; totalCount: number }>();
    for (const item of allItems) {
      const grpId = item.mediaDeliveryGrpId;
      if (!map.has(grpId)) {
        map.set(grpId, { hasFault: false, faultCount: 0, totalCount: 0 });
      }
      const st = map.get(grpId)!;
      st.totalCount++;
      if (item.redisState1 === 0 || item.redisState2 === 0) {
        st.hasFault = true;
        st.faultCount++;
      }
    }
    return map;
  }, [allItems]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  // 갭-2: 서버사이드 검색 결과를 그대로 사용.
  // 검색 중에는 nodeId를 null로 리셋하므로 클라이언트 nodeId 필터만 남김.
  const filteredMdGrps = useMemo(
    () => (isSearching || selectedNodeId === null ? mdGrps : mdGrps.filter((g) => g.nodeId === selectedNodeId)),
    [mdGrps, selectedNodeId, isSearching],
  );

  const selectedGrp = useMemo(() => {
    if (!selectedGrpId) return null;
    return mdGrps.find((grp) => grp.grpId === selectedGrpId) ?? null;
  }, [mdGrps, selectedGrpId]);

  // Auto-select first group when list changes
  useEffect(() => {
    if (!selectedGrpId && filteredMdGrps.length > 0) {
      setSelectedGrpId(filteredMdGrps[0].grpId);
    }
  }, [filteredMdGrps, selectedGrpId]);

  // ─── 리스트형 선택 행 강조 갱신 ─────────────────────────────────────────
  // rowClassRules 는 외부 state 변경을 감지하지 못하므로 선택이 바뀌면 직접 redraw 한다.
  useEffect(() => {
    if (viewMode === VIEW_MODE.LIST) grpGridApiRef.current?.redrawRows();
  }, [selectedGrpId, viewMode]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeChange = (nodeId: number | null) => {
    setSelectedNodeId(nodeId);
    setSelectedGrpId(null);
    setSearchText('');
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setSelectedNodeId(null);
      setSelectedGrpId(null);
    }
  };

  const handleCardSelect = (grp: MdGrp) => {
    setSelectedGrpId(grp.grpId);
  };

  const handleCreateMdGrp = useCallback(() => {
    const nodeId = selectedNodeId ?? nodes[0]?.nodeId;
    const nodeName = nodes.find((n) => n.nodeId === nodeId)?.nodeName ?? '';
    if (nodeId) {
      mdGrpDrawerRef.current?.open(undefined, nodeId, nodeName);
    }
  }, [selectedNodeId, nodes]);

  const handleEditMdGrp = useCallback((grp: MdGrp) => {
    mdGrpDrawerRef.current?.open(grp);
  }, []);

  const handleDeleteMdGrp = useCallback(
    (grp: MdGrp) => {
      if ((grp.itemCount ?? 0) > 0) {
        toast.error(`배정된 미디어전달 ${grp.itemCount}건이 있어 삭제할 수 없습니다`);
        return;
      }
      modal.confirm.execute({
        onOk: () => deleteMdGrp({ id: grp.grpId }),
        options: {
          title: '미디어전달그룹 삭제',
          content: `"${grp.grpName}" 그룹을 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteMdGrp],
  );

  const handleCreateMdItem = useCallback(() => {
    if (selectedGrpId && selectedGrp) {
      navigate(`/ipron/line/media-delivery/form?grpId=${selectedGrpId}&nodeId=${selectedGrp.nodeId}`);
    }
  }, [navigate, selectedGrpId, selectedGrp]);

  const handleEditMdItem = useCallback(
    (item: MdItem) => {
      navigate(`/ipron/line/media-delivery/form?id=${item.mediaDeliveryId}`);
    },
    [navigate],
  );

  const handleDeleteMdItem = useCallback(
    (item: MdItem) => {
      modal.confirm.execute({
        onOk: () => deleteMdItem({ id: item.mediaDeliveryId }),
        options: {
          title: '미디어전달 삭제',
          content: `"${item.mediaDeliveryName}"을(를) 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteMdItem],
  );

  const handleMdGrpDrawerSuccess = useCallback(() => {
    invalidateMdGrps();
  }, [invalidateMdGrps]);

  const getCardMenuItems = (grp: MdGrp) => [
    {
      key: 'edit',
      label: '수정',
      onClick: () => handleEditMdGrp(grp),
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <Trash2 className="size-4" />,
      danger: true,
      onClick: () => handleDeleteMdGrp(grp),
    },
  ];

  // ─── Status cell renderer ─────────────────────────────────────────────────
  const renderStateCell = (state: number | null | undefined) => {
    if (state != null && MD_STATE_LABELS[state]) {
      const s = MD_STATE_LABELS[state];
      return <span style={{ color: s.color, fontWeight: 500 }}>{s.label}</span>;
    }
    return '-';
  };

  // ─── ag-Grid: MD그룹 columns (리스트형 목록) ────────────────────────────
  // 카드가 보여주는 정보와 동일한 항목 구성. 액션 컬럼은 카드 더보기 메뉴를 그대로 재사용한다.
  const grpColumnDefs: ColDef<MdGrp>[] = useMemo(
    () => [
      {
        headerName: '상태',
        colId: 'status',
        flex: 0.8,
        minWidth: 90,
        valueGetter: (params) => {
          if (!params.data || (params.data.itemCount ?? 0) === 0) return '미배정';
          return grpStatusMap.get(params.data.grpId)?.hasFault ? '장애' : '정상';
        },
        cellRenderer: (params: ICellRendererParams<MdGrp>) => {
          if (!params.data) return null;
          if ((params.data.itemCount ?? 0) === 0) {
            return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border text-gray-500 bg-gray-50 border-gray-200">미배정</span>;
          }
          const hasFault = grpStatusMap.get(params.data.grpId)?.hasFault ?? false;
          return (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
                hasFault ? 'text-red-500 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'
              }`}
            >
              {hasFault ? '장애' : '정상'}
            </span>
          );
        },
      },
      {
        headerName: '그룹명',
        field: 'grpName',
        flex: 2,
        minWidth: 160,
        tooltipField: 'grpName',
      },
      {
        headerName: '노드',
        field: 'nodeName',
        flex: 1,
        minWidth: 110,
        valueGetter: (params) => params.data?.nodeName ?? (params.data ? `Node ${params.data.nodeId}` : null),
      },
      {
        headerName: '배정 미디어전달',
        field: 'itemCount',
        flex: 1,
        minWidth: 120,
        filter: 'agNumberColumnFilter',
        valueFormatter: (params) => `${params.data?.itemCount ?? 0}/2`,
      },
      {
        headerName: '',
        colId: 'actions',
        width: 56,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<MdGrp>) => {
          if (!params.data) return null;
          const grp = params.data;
          const menuItems = [
            { key: 'edit', label: '수정', onClick: () => handleEditMdGrp(grp) },
            { key: 'delete', label: '삭제', icon: <Trash2 className="size-4" />, danger: true, onClick: () => handleDeleteMdGrp(grp) },
          ];
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                <button type="button" className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                  <MoreVertical className="size-3.5 text-gray-400" />
                </button>
              </Dropdown>
            </div>
          );
        },
      },
    ],
    [grpStatusMap, handleEditMdGrp, handleDeleteMdGrp],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Single column: Cards (top) + MD Item list (bottom) */}
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 Select + 검색 + 추가 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 노드 선택 (미디어전달은 노드 단위 스코프) */}
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

            {/* 요약 — 총 미디어전달그룹 */}
            <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">
                총 그룹 <b className="text-gray-800 font-semibold">{filteredMdGrps.length.toLocaleString()}</b>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="미디어전달그룹 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreateMdGrp}>
                추가
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 카드 슬라이더 박스 (카드형 / 리스트형 — 선택은 localStorage 유지) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* 목록 헤더: 타이틀 + 건수 / 우측 표기방식 토글 */}
          <div className="flex items-center gap-2 px-4 h-[44px] border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">미디어전달그룹</span>
            <span className="text-xs text-gray-400">{filteredMdGrps.length}</span>
            <div className="ml-auto">
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {/* 목록 본문 — 카드형은 가로 슬라이더, 리스트형은 ag-Grid */}
          <div className={`flex items-center px-4 py-3 ${viewMode === VIEW_MODE.CARD ? 'h-[170px]' : 'h-[240px]'}`}>
            {filteredMdGrps.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3 min-h-[100px]">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">
                  {isSearching ? '검색 결과가 없습니다' : selectedNodeId ? '이 노드에 등록된 미디어전달그룹이 없습니다' : '등록된 미디어전달그룹이 없습니다'}
                </span>
              </div>
            ) : viewMode === VIEW_MODE.LIST ? (
              // 리스트형 — ag-Grid. 선택 행은 rowClassRules 로 강조하고, 더블클릭 시 수정 Drawer 를 연다.
              <div className="w-full h-full">
                <AgGridReact<MdGrp>
                  rowData={filteredMdGrps}
                  columnDefs={grpColumnDefs}
                  gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                  getRowId={(params) => String(params.data.grpId)}
                  defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
                  rowClassRules={{ 'bg-[#405189]/5': (params) => params.data?.grpId === selectedGrpId }}
                  onGridReady={(e) => {
                    grpGridApiRef.current = e.api;
                  }}
                  onRowClicked={(e) => {
                    if (e.data) handleCardSelect(e.data);
                  }}
                  onRowDoubleClicked={(e) => {
                    if (e.data) handleEditMdGrp(e.data);
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
                  {filteredMdGrps.map((grp) => {
                    const isCardSelected = selectedGrpId === grp.grpId;
                    const cardStatus = grpStatusMap.get(grp.grpId);
                    const cardHasFault = cardStatus?.hasFault ?? false;
                    return (
                      <div
                        key={grp.grpId}
                        id={`md-grp-card-${grp.grpId}`}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[130px] flex-shrink-0 flex flex-col ${
                          isCardSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          handleCardSelect(grp);
                          (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                        onDoubleClick={() => handleEditMdGrp(grp)}
                      >
                        {/* Card header: 상태 배지 + 그룹명 + 더보기 */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {grp.itemCount > 0 && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0"
                                style={{
                                  color: cardHasFault ? '#ff4d4f' : '#52c41a',
                                  backgroundColor: cardHasFault ? '#fff2f0' : '#f6ffed',
                                  borderColor: cardHasFault ? '#ff4d4f40' : '#52c41a40',
                                }}
                              >
                                {cardHasFault ? '장애' : '정상'}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-gray-800 truncate">{grp.grpName}</span>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Dropdown menu={{ items: getCardMenuItems(grp) }} trigger={['click']} placement="bottomRight">
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
                            <span className="truncate">{grp.nodeName ?? `Node ${grp.nodeId}`}</span>
                          </div>
                          <div>배정 미디어전달: {grp.itemCount}/2</div>
                        </div>

                        {/* Item count tag — pushed to bottom */}
                        <div className="flex flex-wrap gap-1 mt-auto pt-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              grp.itemCount >= 2 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-blue-700 bg-blue-50 border-blue-200'
                            }`}
                          >
                            {grp.itemCount >= 2 ? '배정완료' : `${2 - grp.itemCount}건 추가가능`}
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

        {/* ===== 하단: 미디어전달 아이템 카드 리스트 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Bottom header */}
          <div className="px-5 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100 min-h-[40px]">
            <span className="text-sm font-semibold text-gray-800">
              {selectedGrp ? `${selectedGrp.grpName} ` : ''}미디어전달 ({mdItems.length}/2건)
            </span>
            {selectedGrp && (
              <Button icon={<Plus className="size-3.5" />} onClick={handleCreateMdItem} disabled={mdItems.length >= 2}>
                미디어전달 추가
              </Button>
            )}
          </div>

          {/* Card content */}
          <div className="flex-1 overflow-y-auto p-5">
            {selectedGrpId ? (
              mdItems.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {mdItems.map((item) => (
                    <div
                      key={item.mediaDeliveryId}
                      className="border border-gray-200 rounded-lg hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all cursor-pointer overflow-hidden"
                      onClick={() => handleEditMdItem(item)}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between px-5 py-3 bg-gray-50/60 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="text-[13px] font-bold text-gray-900">{item.mediaDeliveryName}</span>
                          <span className="text-[11px] text-gray-400">
                            {[
                              item.mediaDeliveryVendor != null ? MD_VENDOR_LABELS[item.mediaDeliveryVendor] : null,
                              TRANSPORT_TYPE_LABELS[item.transportType],
                              item.rtpTransType != null ? RTP_TRANS_TYPE_LABELS[item.rtpTransType] : null,
                              item.haType != null ? HA_TYPE_LABELS[item.haType] : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Dropdown
                            menu={{
                              items: [
                                { key: 'edit', label: '수정', onClick: () => handleEditMdItem(item) },
                                { key: 'delete', label: '삭제', icon: <Trash2 className="size-4" />, danger: true, onClick: () => handleDeleteMdItem(item) },
                              ],
                            }}
                            trigger={['click']}
                            placement="bottomRight"
                          >
                            <button type="button" className="p-1 rounded hover:bg-gray-100 transition-colors">
                              <MoreVertical className="size-4 text-gray-400" />
                            </button>
                          </Dropdown>
                        </div>
                      </div>

                      {/* Card body: A/B 좌우 분할 */}
                      <div className="grid grid-cols-2 divide-x divide-gray-100">
                        {/* A장비 */}
                        <div className="px-5 py-3 text-[12px] space-y-1.5">
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">A장비</div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-[50px] shrink-0">IP</span>
                            <span className="font-mono text-gray-800">
                              {item.ipAddr1}:{item.portNo1}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-[50px] shrink-0">상태</span>
                            {renderStateCell(item.redisState1)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-[50px] shrink-0">체크</span>
                            <span className="text-gray-700">
                              {CHECK_TYPE_LABELS[item.checkType1 ?? 0] ?? '-'} / {item.chkInterval1 ?? 60}초
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-[50px] shrink-0">실패</span>
                            <span className="text-gray-700">{item.failCnt1 ?? 3}회</span>
                            <span className="text-gray-300 mx-1">|</span>
                            <span className="text-gray-400">차단</span>
                            <span className={`font-medium ${item.blockYn1 === 1 ? 'text-red-500' : 'text-gray-500'}`}>{item.blockYn1 === 1 ? '사용' : '미사용'}</span>
                          </div>
                        </div>
                        {/* B장비 */}
                        <div className="px-5 py-3 text-[12px] space-y-1.5">
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">B장비</div>
                          {item.ipAddr2 ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 w-[50px] shrink-0">IP</span>
                                <span className="font-mono text-gray-800">
                                  {item.ipAddr2}:{item.portNo2}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 w-[50px] shrink-0">상태</span>
                                {renderStateCell(item.redisState2)}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 w-[50px] shrink-0">체크</span>
                                <span className="text-gray-700">
                                  {CHECK_TYPE_LABELS[item.checkType2 ?? 0] ?? '-'} / {item.chkInterval2 ?? 60}초
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 w-[50px] shrink-0">실패</span>
                                <span className="text-gray-700">{item.failCnt2 ?? 3}회</span>
                                <span className="text-gray-300 mx-1">|</span>
                                <span className="text-gray-400">차단</span>
                                <span className={`font-medium ${item.blockYn2 === 1 ? 'text-red-500' : 'text-gray-500'}`}>{item.blockYn2 === 1 ? '사용' : '미사용'}</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-300 py-4">미설정</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <Empty description={false} />
                  <span className="text-sm">등록된 미디어전달이 없습니다</span>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <Empty description={false} />
                <span className="text-sm">상단에서 그룹을 선택하세요</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Drawers ===== */}
      <MdGrpDrawer ref={mdGrpDrawerRef} onSuccess={handleMdGrpDrawerSuccess} />
    </div>
  );
}
