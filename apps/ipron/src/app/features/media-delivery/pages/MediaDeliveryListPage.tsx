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
import { Button, Dropdown, Empty, Input } from 'antd';
import { AlertTriangle, ChevronLeft, ChevronRight, Layers, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import MdGrpDrawer, { type MdGrpDrawerRef } from '../components/MdGrpDrawer';
import { mediaDeliveryQueryKeys, useDeleteMdGrp, useDeleteMdItem, useGetMdGrps, useGetMdItems, useGetNodes } from '../hooks/useMediaDeliveryQueries';
import {
  CHECK_TYPE_LABELS,
  HA_TYPE_LABELS,
  MD_STATE_LABELS,
  MD_VENDOR_LABELS,
  type MdGrp,
  type MdItem,
  RTP_TRANS_TYPE_LABELS,
  TRANSPORT_TYPE_LABELS,
} from '../types/mediaDelivery.types';
import PageHeader from '@/components/custom/PageHeader';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '회선관리', path: '/ipron/line/media-delivery' },
  { title: '미디어전달관리', path: '/ipron/line/media-delivery' },
];

export default function MediaDeliveryListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const modal = useModal();

  // URL query params for initial selection
  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const initGrpId = searchParams.get('grpId') ? Number(searchParams.get('grpId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedGrpId, setSelectedGrpId] = useState<number | null>(initGrpId);
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const mdGrpDrawerRef = useRef<MdGrpDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: mdGrps = [] } = useGetMdGrps();
  const { data: nodes = [] } = useGetNodes();
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
        toast.success('미디어전달그룹이 삭제되었습니다.');
        if (selectedGrpId) setSelectedGrpId(null);
        invalidateMdGrps();
      },
    },
  });

  const { mutate: deleteMdItem } = useDeleteMdItem({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어전달이 삭제되었습니다.');
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

  // ─── 노드별 장애 상태 집계 (탭 표시용) ────────────────────────────────
  const nodesFaultMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const item of allItems) {
      if (item.redisState1 === 0 || item.redisState2 === 0) {
        map.set(item.nodeId, true);
      }
    }
    return map;
  }, [allItems]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const searchFilteredMdGrps = useMemo(() => {
    if (!isSearching) return mdGrps;
    const kw = searchText.trim().toLowerCase();
    return mdGrps.filter((g) => [g.grpName, g.nodeName].some((v) => v?.toString().toLowerCase().includes(kw)));
  }, [mdGrps, isSearching, searchText]);

  const filteredMdGrps = useMemo(
    () => (isSearching || selectedNodeId === null ? searchFilteredMdGrps : searchFilteredMdGrps.filter((g) => g.nodeId === selectedNodeId)),
    [searchFilteredMdGrps, selectedNodeId, isSearching],
  );

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  const selectedNodeName = selectedNode?.nodeName ?? '';

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

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
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
      modal.confirm.execute({
        onOk: () => deleteMdGrp({ id: grp.grpId }),
        options: {
          title: '미디어전달그룹 삭제',
          content: `"${grp.grpName}" 그룹을 삭제하시겠습니까?\n할당된 미디어전달이 있으면 삭제할 수 없습니다.`,
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Single column: Cards (top) + MD Item list (bottom) */}
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 탭 바 + 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* Header: 노드 탭 바 + 검색 + 추가 버튼 */}
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
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
                onClick={() => {
                  setSelectedNodeId(null);
                  setSearchText('');
                  setSelectedGrpId(null);
                }}
              >
                <Layers className="size-3.5" />
                <span>전체</span>
                <span className="text-[11px] text-gray-400">({searchFilteredMdGrps.length})</span>
              </button>

              {/* 노드 탭들 */}
              {nodes.map((node) => {
                const nodeGroups = searchFilteredMdGrps.filter((g) => g.nodeId === node.nodeId);
                const hasFault = nodesFaultMap.get(node.nodeId) ?? false;
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
                    <span className="text-[11px] text-gray-400 flex-shrink-0">({nodeGroups.length})</span>
                    {hasFault && <AlertTriangle className="size-3 text-red-500" />}
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

            {/* 우측: 검색 + 그룹 추가 */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
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

        {/* ===== 카드 슬라이더 박스 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* Card slider body — 높이 고정 */}
          <div className="flex items-center px-4 py-3 h-[170px]">
            {filteredMdGrps.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3 min-h-[100px]">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">
                  {isSearching ? '검색 결과가 없습니다' : selectedNodeId ? '이 노드에 등록된 미디어전달그룹이 없습니다' : '등록된 미디어전달그룹이 없습니다'}
                </span>
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
                                  color: cardHasFault ? '#ff4d4f' : '#16a34a',
                                  backgroundColor: cardHasFault ? '#fff2f0' : '#f0fdf4',
                                  borderColor: cardHasFault ? '#ff4d4f40' : '#16a34a40',
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
                          <div>할당 미디어전달: {grp.itemCount}/2</div>
                        </div>

                        {/* Item count tag — pushed to bottom */}
                        <div className="flex flex-wrap gap-1 mt-auto pt-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              grp.itemCount >= 2 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-blue-700 bg-blue-50 border-blue-200'
                            }`}
                          >
                            {grp.itemCount >= 2 ? '할당완료' : `${2 - grp.itemCount}건 추가가능`}
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
                            <span className="text-gray-400">Block</span>
                            <span className={`font-medium ${item.blockYn1 === 1 ? 'text-red-500' : 'text-gray-500'}`}>{item.blockYn1 === 1 ? 'ON' : 'OFF'}</span>
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
                                <span className="text-gray-400">Block</span>
                                <span className={`font-medium ${item.blockYn2 === 1 ? 'text-red-500' : 'text-gray-500'}`}>{item.blockYn2 === 1 ? 'ON' : 'OFF'}</span>
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
