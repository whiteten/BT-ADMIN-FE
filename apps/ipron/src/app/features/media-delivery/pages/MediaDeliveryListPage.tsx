/**
 * 미디어전달관리 목록 페이지
 * Pattern: 좌측 노드 트리 + 우측 상단 카드 슬라이더 (MD그룹) + 우측 하단 미디어전달 ag-Grid
 *
 * Layout:
 * +--------------+--------------------------------------------+
 * | 노드 트리     | 카드 슬라이더 (미디어전달그룹)                  |
 * | (280px)      | [그룹] [그룹] [그룹]                          |
 * |              | [+ 미디어전달] [+ 그룹 추가]                   |
 * | > 노드1      +--------------------------------------------+
 * | > 노드2      | 미디어전달 ag-Grid (선택 그룹의 아이템)         |
 * +--------------+--------------------------------------------+
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Dropdown, Empty, Input } from 'antd';
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Network, Plus, Trash2 } from 'lucide-react';
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
  type NodeMdGrpGroup,
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
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const mdGrpDrawerRef = useRef<MdGrpDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: mdGrps = [] } = useGetMdGrps();
  const { data: nodes = [] } = useGetNodes();
  const { data: mdItems = [], isLoading: isMdItemsLoading } = useGetMdItems({
    params: selectedGrpId ? { grpId: selectedGrpId } : undefined,
    queryOptions: { enabled: !!selectedGrpId },
  });
  // 전체 아이템 (트리/카드 장애 표시용 — 노드 무관하게 전체 조회)
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

  // ─── 그룹별 장애 상태 집계 (트리/카드 표시용) ─────────────────────────────────
  // grpId → { hasFault: boolean, normalCount: number, totalCount: number }
  const grpStatusMap = useMemo(() => {
    const map = new Map<number, { hasFault: boolean; faultCount: number; totalCount: number }>();
    for (const item of allItems) {
      const grpId = item.mediaDeliveryGrpId;
      if (!map.has(grpId)) {
        map.set(grpId, { hasFault: false, faultCount: 0, totalCount: 0 });
      }
      const st = map.get(grpId)!;
      st.totalCount++;
      // state1 또는 state2가 0(장애)이면 장애
      if (item.redisState1 === 0 || item.redisState2 === 0) {
        st.hasFault = true;
        st.faultCount++;
      }
    }
    return map;
  }, [allItems]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const nodeMdGrpGroups: NodeMdGrpGroup[] = useMemo(() => {
    const groupMap = new Map<number, NodeMdGrpGroup>();

    for (const node of nodes) {
      groupMap.set(node.nodeId, {
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        mdGrps: [],
      });
    }

    for (const grp of mdGrps) {
      let group = groupMap.get(grp.nodeId);
      if (!group) {
        group = {
          nodeId: grp.nodeId,
          nodeName: grp.nodeName || `Node ${grp.nodeId}`,
          mdGrps: [],
        };
        groupMap.set(grp.nodeId, group);
      }
      group.mdGrps.push(grp);
    }

    return Array.from(groupMap.values())
      .map((g) =>
        searchText
          ? {
              ...g,
              mdGrps: g.mdGrps.filter((grp) => grp.grpName?.toLowerCase().includes(searchText.toLowerCase())),
            }
          : g,
      )
      .sort((a, b) => a.nodeId - b.nodeId);
  }, [mdGrps, nodes, searchText]);

  const selectedMdGrps = useMemo(() => {
    if (!selectedNodeId) return [];
    return mdGrps.filter((grp) => grp.nodeId === selectedNodeId);
  }, [mdGrps, selectedNodeId]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  const selectedNodeName = selectedNode?.nodeName ?? '';

  const selectedGrp = useMemo(() => {
    if (!selectedGrpId) return null;
    return mdGrps.find((grp) => grp.grpId === selectedGrpId) ?? null;
  }, [mdGrps, selectedGrpId]);

  const filteredMdGrps = useMemo(() => {
    if (!searchText) return selectedMdGrps;
    return selectedMdGrps.filter((grp) => grp.grpName?.toLowerCase().includes(searchText.toLowerCase()));
  }, [selectedMdGrps, searchText]);

  // Auto-select first node
  useEffect(() => {
    if (!selectedNodeId && nodes.length > 0) {
      setSelectedNodeId(nodes[0].nodeId);
    }
  }, [nodes, selectedNodeId]);

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

  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedGrpId(null);
    setSearchText('');
  };

  const handleCardSelect = (grp: MdGrp) => {
    setSelectedGrpId(grp.grpId);
  };

  const handleTreeItemClick = (grp: MdGrp) => {
    setSelectedNodeId(grp.nodeId);
    setSelectedGrpId(grp.grpId);
    setTimeout(() => {
      const card = document.getElementById(`md-grp-card-${grp.grpId}`);
      card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
  };

  const handleCreateMdGrp = useCallback(() => {
    if (selectedNodeId) {
      mdGrpDrawerRef.current?.open(undefined, selectedNodeId, selectedNodeName);
    }
  }, [selectedNodeId, selectedNodeName]);

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
    if (selectedGrpId && selectedNodeId) {
      navigate(`/ipron/line/media-delivery/form?grpId=${selectedGrpId}&nodeId=${selectedNodeId}`);
    }
  }, [navigate, selectedGrpId, selectedNodeId]);

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

      {/* Split container: Left Tree + Right (Cards + Bottom Grid) */}
      <div className="flex flex-1 min-h-0 bg-white bt-shadow overflow-hidden rounded-md border border-gray-200">
        {/* ===== Left Panel: Node Tree (280px) ===== */}
        <div className="w-[280px] min-w-[280px] border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <Input placeholder="그룹명 검색" size="small" allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {nodeMdGrpGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-4">
                <span className="text-sm">등록된 노드가 없습니다</span>
              </div>
            ) : (
              nodeMdGrpGroups.map((group) => {
                const isCollapsed = collapsedNodes.has(group.nodeId);
                const isNodeSelected = selectedNodeId === group.nodeId;
                return (
                  <div key={group.nodeId} className="mb-0.5">
                    {/* Node group header */}
                    <button
                      type="button"
                      className={`w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none text-[13px] font-semibold transition-colors border-l-[3px] ${
                        isNodeSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189]' : 'border-l-transparent text-gray-800 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        handleNodeSelect(group.nodeId);
                        if (isCollapsed) toggleNodeGroup(group.nodeId);
                      }}
                    >
                      <button
                        type="button"
                        className="p-0 bg-transparent border-none cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNodeGroup(group.nodeId);
                        }}
                      >
                        {isCollapsed ? <ChevronRight className="size-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="size-3.5 text-gray-400 flex-shrink-0" />}
                      </button>
                      <Network className="size-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{group.nodeName}</span>
                      <span className="ml-auto text-[11px] text-gray-400 font-normal">{group.mdGrps.length}</span>
                    </button>

                    {/* MD Group items under node */}
                    {!isCollapsed && (
                      <div>
                        {group.mdGrps.map((grp) => {
                          const isItemSelected = selectedGrpId === grp.grpId;
                          const grpStatus = grpStatusMap.get(grp.grpId);
                          const hasFault = grpStatus?.hasFault ?? false;
                          // dot 색상: 선택=파란, 장애=빨간, 정상=초록, 아이템없음=회색
                          const dotColor = isItemSelected ? 'bg-[#405189]' : hasFault ? 'bg-red-500' : grp.itemCount > 0 ? 'bg-green-500' : 'bg-gray-300';
                          return (
                            <div
                              key={grp.grpId}
                              className={`group flex items-center gap-2 pl-[42px] pr-4 py-1.5 cursor-pointer text-[12px] transition-colors border-l-[3px] ${
                                isItemSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189] font-medium' : 'border-l-transparent text-gray-500 hover:bg-gray-50'
                              }`}
                              onClick={() => handleTreeItemClick(grp)}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                              <span className="truncate flex-1">{grp.grpName}</span>
                              {hasFault && <AlertTriangle className="size-3 text-red-500 flex-shrink-0" />}
                              <span className="text-[10px] text-gray-400">{grp.itemCount}/2</span>
                            </div>
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

        {/* ===== Right Panel: Cards (top) + MD Item Grid (bottom) ===== */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedNodeId ? (
            <>
              {/* -- Top: Card Slider Area -- */}
              <div className="flex flex-col overflow-hidden flex-shrink-0">
                {/* Card grid header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">
                      {selectedNodeName} 미디어전달그룹 ({filteredMdGrps.length}건)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={handleCreateMdGrp}>
                      그룹 추가
                    </Button>
                  </div>
                </div>

                {/* Card slider body */}
                <div className="flex items-center px-4 py-3">
                  {filteredMdGrps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3">
                      <Empty description={false} />
                      <span className="text-sm">{searchText ? '검색 결과가 없습니다' : '이 노드에 등록된 미디어전달그룹이 없습니다'}</span>
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
                              className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all min-w-[220px] max-w-[260px] min-h-[122px] flex-shrink-0 flex flex-col ${
                                isCardSelected
                                  ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                                  : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                              }`}
                              onClick={() => handleCardSelect(grp)}
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

              {/* -- Bottom: MD Item Cards -- */}
              <div className="border-t border-gray-200 flex flex-col flex-1 min-h-0">
                {/* Bottom header */}
                <div className="px-5 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100 min-h-[40px]">
                  <span className="text-sm font-semibold text-gray-800">
                    {selectedGrp ? `${selectedGrp.grpName} ` : ''}미디어전달 ({mdItems.length}/2건)
                  </span>
                  {selectedGrp && (
                    <Button size="small" icon={<Plus className="size-3.5" />} onClick={handleCreateMdItem} disabled={mdItems.length >= 2}>
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
            </>
          ) : (
            /* Empty state when no node selected */
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
              <Empty description={false} />
              <span className="text-sm">좌측에서 노드를 선택하세요</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Drawers ===== */}
      <MdGrpDrawer ref={mdGrpDrawerRef} onSuccess={handleMdGrpDrawerSuccess} />
    </div>
  );
}
