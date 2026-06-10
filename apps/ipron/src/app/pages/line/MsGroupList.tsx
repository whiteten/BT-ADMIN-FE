/**
 * MS 관리 목록 페이지
 * Pattern: 상단 노드 탭 바 + 카드 슬라이더 (MS그룹) + 하단 미디어서버 ag-Grid
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [←] [전체(n)] [C1N1(2)] [C1N2(3)] [→]  🔍[검색] [+추가] │  ← 노드 탭 바
 * │ [Card1] [Card2] [Card3] ...                           │  ← MS그룹 카드 슬라이더
 * ├──────────────────────────────────────────────────────┤
 * │ {그룹명} 미디어서버 (n건)         [멤버관리][+서버추가]  │
 * │ ag-Grid                                               │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input } from 'antd';
import { AlertTriangle, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Layers, MoreVertical, Network, Plus, Search, Settings, Trash2, Users } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import MediaServerDrawer, { type MediaServerDrawerRef } from '../../features/ms-group/components/MediaServerDrawer';
import MsGroupDrawer, { type MsGroupDrawerRef } from '../../features/ms-group/components/MsGroupDrawer';
import MsGroupMemberDrawer, { type MsGroupMemberDrawerRef } from '../../features/ms-group/components/MsGroupMemberDrawer';
import NodeMsSettingDrawer, { type NodeMsSettingDrawerRef } from '../../features/ms-group/components/NodeMsSettingDrawer';
import { msGroupQueryKeys, useDeleteMsGroup, useGetMediaServers, useGetMsGroupMembers, useGetMsGroups, useGetNodes } from '../../features/ms-group/hooks/useMsGroupQueries';
import { type MediaServer, type MsGroup, ROUTE_TYPE_LABELS, getMsGroupTagList } from '../../features/ms-group/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '미디어 관리', path: '/ipron/line/ms-group' },
  { title: '미디어 서버 관리', path: '/ipron/line/ms-group' },
];

export default function MsGroupList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // URL query params for initial selection
  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const initGroupId = searchParams.get('msGroupId') ? Number(searchParams.get('msGroupId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(initGroupId);
  const [searchText, setSearchText] = useState('');
  const [cardExpanded, setCardExpanded] = useState(false);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const msGroupDrawerRef = useRef<MsGroupDrawerRef>(null);
  const msGroupMemberDrawerRef = useRef<MsGroupMemberDrawerRef>(null);
  const mediaServerDrawerRef = useRef<MediaServerDrawerRef>(null);
  const nodeSettingDrawerRef = useRef<NodeMsSettingDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: msGroups = [] } = useGetMsGroups();
  const { data: nodes = [] } = useGetNodes();
  const { data: allMediaServers = [] } = useGetMediaServers({
    params: selectedNodeId ? { nodeId: selectedNodeId } : undefined,
    queryOptions: { enabled: !!selectedNodeId },
  });
  const { data: groupMembers = [], isLoading: isMediaServersLoading } = useGetMsGroupMembers({
    params: selectedGroupId ? { id: selectedGroupId } : undefined,
    queryOptions: { enabled: !!selectedGroupId },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteMsGroup } = useDeleteMsGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('MS그룹이 삭제되었습니다');
        if (selectedGroupId) setSelectedGroupId(null);
        invalidateMsGroups();
      },
    },
  });

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateMsGroups = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: msGroupQueryKeys.getMsGroups().queryKey });
  }, [queryClient]);

  const invalidateMediaServers = useCallback(() => {
    if (selectedNodeId) {
      queryClient.invalidateQueries({
        queryKey: msGroupQueryKeys.getMediaServers({ nodeId: selectedNodeId }).queryKey,
      });
    }
  }, [queryClient, selectedNodeId]);

  // 전체 미디어서버 (장애 표시용 — 노드 무관하게 전체 조회)
  const { data: allServersForStatus = [] } = useGetMediaServers({
    queryOptions: { enabled: true },
  });

  // ─── 노드별 장애 상태 집계 (탭/카드 표시용) ────────────────────────────
  const nodesFaultMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const ms of allServersForStatus) {
      const state = (ms as unknown as { redisState?: number }).redisState;
      if (state === 0) {
        map.set(ms.nodeId, true);
      }
    }
    return map;
  }, [allServersForStatus]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const nodeNameMap = useMemo(() => new Map(nodes.map((n) => [n.nodeId, n.nodeName])), [nodes]);

  const searchFilteredMsGroups = useMemo(() => {
    if (!isSearching) return msGroups;
    const kw = searchText.trim().toLowerCase();
    return msGroups.filter((g) => [g.msGroupName, g.nodeName || nodeNameMap.get(g.nodeId)].some((v) => v?.toString().toLowerCase().includes(kw)));
  }, [msGroups, isSearching, searchText, nodeNameMap]);

  const filteredMsGroups = useMemo(
    () => (isSearching || selectedNodeId === null ? searchFilteredMsGroups : searchFilteredMsGroups.filter((g) => g.nodeId === selectedNodeId)),
    [searchFilteredMsGroups, selectedNodeId, isSearching],
  );

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  const selectedNodeName = selectedNode?.nodeName ?? '';
  const defaultMsGroupId = selectedNode?.msGroupId ?? null;

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return msGroups.find((grp) => grp.msGroupId === selectedGroupId) ?? null;
  }, [msGroups, selectedGroupId]);

  // 선택된 그룹에 배정된 미디어서버 (AS-IS: INNER JOIN TB_IE_MS_GRP_LIST)
  const filteredMediaServers = useMemo(() => {
    if (!selectedGroupId || groupMembers.length === 0) return [];
    const assignedIds = new Set(groupMembers.filter((m) => m.assigned).map((m) => m.mediaServerId));
    return allMediaServers
      .filter((ms) => assignedIds.has(ms.mediaServerId))
      .map((ms) => {
        const member = groupMembers.find((m) => m.mediaServerId === ms.mediaServerId);
        return { ...ms, priority: member?.priority ?? 0 };
      });
  }, [selectedGroupId, groupMembers, allMediaServers]);

  // Auto-select first group when list changes
  useEffect(() => {
    if (!selectedGroupId && filteredMsGroups.length > 0) {
      setSelectedGroupId(filteredMsGroups[0].msGroupId);
    }
  }, [filteredMsGroups, selectedGroupId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
    setSelectedGroupId(null);
    setSearchText('');
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setSelectedNodeId(null);
      setSelectedGroupId(null);
    }
  };

  const handleCardSelect = (grp: MsGroup) => {
    setSelectedGroupId(grp.msGroupId);
  };

  const handleCreateMsGroup = useCallback(() => {
    if (!selectedNodeId) {
      toast.warning('검색할 노드를 선택하십시오');
      return;
    }
    const name = nodeNameMap.get(selectedNodeId) ?? '';
    msGroupDrawerRef.current?.open(undefined, selectedNodeId, name);
  }, [selectedNodeId, nodeNameMap]);

  const handleEditMsGroup = useCallback(
    (grp: MsGroup) => {
      const name = nodeNameMap.get(grp.nodeId) ?? '';
      msGroupDrawerRef.current?.open(grp, undefined, name);
    },
    [nodeNameMap],
  );

  const handleDeleteMsGroup = useCallback(
    (grp: MsGroup) => {
      modal.confirm.execute({
        onOk: () => deleteMsGroup({ id: grp.msGroupId }),
        options: {
          title: 'MS그룹 삭제',
          content: `"${grp.msGroupName}" MS그룹을 삭제하시겠습니까?\n배정된 멤버가 있으면 삭제할 수 없습니다.`,
        },
      });
    },
    [modal, deleteMsGroup],
  );

  const handleCreateMediaServer = useCallback(() => {
    const nodeId = selectedNodeId ?? selectedGroup?.nodeId;
    if (!nodeId) {
      toast.warning('검색할 노드를 선택하십시오');
      return;
    }
    const name = nodeNameMap.get(nodeId) ?? '';
    mediaServerDrawerRef.current?.open(undefined, nodeId, name);
  }, [selectedNodeId, selectedGroup, nodeNameMap]);

  const handleEditMediaServer = useCallback(
    (ms: MediaServer) => {
      const name = nodeNameMap.get(ms.nodeId) ?? '';
      mediaServerDrawerRef.current?.open(ms, undefined, name);
    },
    [nodeNameMap],
  );

  const handleMemberManage = useCallback(() => {
    if (selectedGroup) {
      msGroupMemberDrawerRef.current?.open(selectedGroup);
    }
  }, [selectedGroup]);

  const handleNodeMsSetting = useCallback(() => {
    const nodeId = selectedNodeId ?? nodes[0]?.nodeId;
    if (!nodeId) return;
    const nodeName = nodes.find((n) => n.nodeId === nodeId)?.nodeName ?? '';
    const nodeGroups = msGroups.filter((g) => g.nodeId === nodeId);
    nodeSettingDrawerRef.current?.open(nodeId, nodeName, nodeGroups);
  }, [selectedNodeId, nodes, msGroups]);

  const handleMsGroupDrawerSuccess = useCallback(() => {
    invalidateMsGroups();
  }, [invalidateMsGroups]);

  const handleMediaServerDrawerSuccess = useCallback(() => {
    invalidateMediaServers();
    invalidateMsGroups();
  }, [invalidateMediaServers, invalidateMsGroups]);

  const handleMemberDrawerSuccess = useCallback(() => {
    invalidateMsGroups();
    invalidateMediaServers();
    // 멤버 목록도 무효화 (하단 그리드 갱신)
    if (selectedGroupId) {
      queryClient.invalidateQueries({
        queryKey: msGroupQueryKeys.getMsGroupMembers({ id: selectedGroupId }).queryKey,
      });
    }
    // 전체 서버 상태도 갱신
    queryClient.invalidateQueries({
      queryKey: msGroupQueryKeys.getMediaServers().queryKey,
    });
  }, [invalidateMsGroups, invalidateMediaServers, queryClient, selectedGroupId]);

  const getCardMenuItems = (grp: MsGroup) => [
    {
      key: 'edit',
      label: '수정',
      onClick: () => handleEditMsGroup(grp),
    },
    {
      key: 'member',
      label: 'MS그룹 멤버관리',
      icon: <Users className="size-4" />,
      onClick: () => {
        setSelectedGroupId(grp.msGroupId);
        setTimeout(() => msGroupMemberDrawerRef.current?.open(grp), 50);
      },
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <Trash2 className="size-4" />,
      danger: true,
      onClick: () => handleDeleteMsGroup(grp),
    },
  ];

  // ─── ag-Grid: Media Server columns ──────────────────────────────────────
  const mediaServerColumnDefs: ColDef<MediaServer>[] = useMemo(
    () => [
      {
        headerName: 'MS 이름',
        field: 'mediaServerName',
        flex: 2,
        minWidth: 120,
      },
      {
        headerName: '최대 채널',
        field: 'totalChannel',
        flex: 1,
        minWidth: 80,
      },
      {
        headerName: 'IP 주소',
        field: 'ipAddr',
        flex: 2,
        minWidth: 120,
      },
      {
        headerName: 'NAT IP 주소',
        field: 'natIpAddr',
        flex: 2,
        minWidth: 120,
        cellRenderer: (params: ICellRendererParams<MediaServer>) => {
          if (!params.data) return null;
          return params.data.natIpAddr ?? '-';
        },
      },
      {
        headerName: '포트 번호',
        field: 'portNo',
        flex: 1,
        minWidth: 80,
      },
      {
        headerName: 'MS 상태',
        field: 'redisState',
        flex: 1,
        minWidth: 80,
        cellRenderer: (params: ICellRendererParams<MediaServer>) => {
          if (!params.data) return null;
          const state = (params.data as unknown as { redisState?: number | null }).redisState;
          const statusMap: Record<number, { label: string; color: string }> = {
            0: { label: '장애', color: '#ef4444' },
            1: { label: '정상', color: '#52c41a' },
            2: { label: '준비', color: '#eab308' },
          };
          if (state != null && statusMap[state]) {
            const s = statusMap[state];
            return <span style={{ color: s.color, fontWeight: 500 }}>{s.label}</span>;
          }
          return '-';
        },
      },
      // SWAT IPR20S1092.jsp:39-41 — hidden 컬럼 (Drawer 참조용)
      { headerName: '블록여부', field: 'blockYn', hide: true },
      { headerName: '상태갱신시간', field: 'stateUpdateTime', hide: true },
      { headerName: '확장옵션', field: 'extOptions', hide: true },
    ],
    [],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Single column: Cards (top) + Media Server Grid (bottom) */}
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
                  setSelectedGroupId(null);
                }}
              >
                <Layers className="size-3.5" />
                <span>전체</span>
                <span className="text-[11px] text-gray-400">({searchFilteredMsGroups.length})</span>
              </button>

              {/* 노드 탭들 */}
              {nodes.map((node) => {
                const nodeGroups = searchFilteredMsGroups.filter((g) => g.nodeId === node.nodeId);
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

            {/* 우측: 검색 + 노드 기본 MS설정 + MS그룹 추가 */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="MS그룹 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button icon={<Settings className="size-3.5" />} onClick={handleNodeMsSetting} disabled={!selectedNodeId}>
                노드 기본 MS설정
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreateMsGroup}>
                추가
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 카드 슬라이더 박스 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* 접기/펼치기 토글 헤더 */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-2 text-[12px] text-gray-500 hover:bg-gray-50 border-b border-gray-100 transition-colors"
            onClick={() => setCardExpanded((v) => !v)}
          >
            <span>MS그룹 선택</span>
            {cardExpanded ? <ChevronsUp className="size-4" /> : <ChevronsDown className="size-4" />}
          </button>
          {/* Card slider body — 기본 접힘 */}
          {cardExpanded && (
            <div className="flex items-center px-4 py-3 h-[180px]">
              {filteredMsGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3 min-h-[100px]">
                  <Empty description={false} imageStyle={{ height: 40 }} />
                  <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : selectedNodeId ? '이 노드에 등록된 MS그룹이 없습니다' : '등록된 MS그룹이 없습니다'}</span>
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
                    {filteredMsGroups.map((grp) => {
                      const isCardSelected = selectedGroupId === grp.msGroupId;
                      const isDefaultGroup = defaultMsGroupId === grp.msGroupId && selectedNodeId === grp.nodeId;
                      const tags = getMsGroupTagList(grp);
                      const grpNodeFault = nodesFaultMap.get(grp.nodeId) ?? false;
                      return (
                        <div
                          key={grp.msGroupId}
                          id={`msg-card-${grp.msGroupId}`}
                          className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[145px] flex-shrink-0 flex flex-col ${
                            isCardSelected
                              ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                              : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                          }`}
                          onClick={(e) => {
                            handleCardSelect(grp);
                            (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                          }}
                          onDoubleClick={() => handleEditMsGroup(grp)}
                        >
                          {/* Card header: 상태배지 + 그룹명 + 기본 뱃지 + 더보기 */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {grpNodeFault && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0"
                                  style={{ color: '#ff4d4f', backgroundColor: '#fff2f0', borderColor: '#ff4d4f40' }}
                                >
                                  장애
                                </span>
                              )}
                              <span className="text-sm font-semibold text-gray-800 truncate">{grp.msGroupName}</span>
                              {isDefaultGroup && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                                  기본
                                </span>
                              )}
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
                              <span className="truncate">{grp.nodeName || nodeNameMap.get(grp.nodeId) || `Node ${grp.nodeId}`}</span>
                            </div>
                            <div>분배방식: {ROUTE_TYPE_LABELS[grp.routeType] ?? grp.routeType}</div>
                            <div>배정 MS 수: {grp.routeCnt ?? 0}</div>
                          </div>

                          {/* Tags */}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tags.map((tag) => (
                                <span
                                  key={tag.label}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                  style={{
                                    color: tag.color,
                                    backgroundColor: tag.bgColor,
                                    borderColor: tag.borderColor,
                                  }}
                                >
                                  {tag.label}
                                </span>
                              ))}
                            </div>
                          )}
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
          )}
        </div>

        {/* ===== 하단: 미디어서버 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Bottom header */}
          <div className="px-5 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">
              {selectedGroup ? `${selectedGroup.msGroupName} 미디어서버` : '미디어서버'} ({filteredMediaServers.length})
            </span>
            <div className="flex gap-2">
              <Button icon={<Users className="size-3.5" />} onClick={handleMemberManage} disabled={!selectedGroup}>
                멤버관리
              </Button>
              <Button icon={<Plus className="size-3.5" />} onClick={handleCreateMediaServer}>
                미디어서버 추가
              </Button>
            </div>
          </div>

          {/* Grid content */}
          <div className="flex-1 min-h-0">
            {selectedGroupId ? (
              <AgGridReact<MediaServer>
                rowData={filteredMediaServers}
                columnDefs={mediaServerColumnDefs}
                gridOptions={{
                  ...gridOptions,
                  statusBar: undefined,
                  pagination: false,
                  sideBar: false,
                }}
                loading={isMediaServersLoading}
                getRowId={(params) => String(params.data.mediaServerId)}
                defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                onRowDoubleClicked={(e) => {
                  if (e.data) handleEditMediaServer(e.data);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
                <Empty description={false} />
                <span className="text-sm">상단에서 MS그룹을 선택하세요</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Drawers ===== */}
      <MsGroupDrawer ref={msGroupDrawerRef} onSuccess={handleMsGroupDrawerSuccess} />

      <MsGroupMemberDrawer ref={msGroupMemberDrawerRef} onSuccess={handleMemberDrawerSuccess} />

      <MediaServerDrawer ref={mediaServerDrawerRef} onSuccess={handleMediaServerDrawerSuccess} />

      {/* 노드 기본 MS 설정 Drawer */}
      <NodeMsSettingDrawer
        ref={nodeSettingDrawerRef}
        onSuccess={() => {
          invalidateMsGroups();
          queryClient.invalidateQueries({ queryKey: msGroupQueryKeys.getNodes.queryKey });
        }}
      />
    </div>
  );
}
