/**
 * MS 관리 목록 페이지
 * Pattern: 좌측 노드 트리 + 우측 상단 카드 슬라이더 (MS그룹) + 우측 하단 미디어서버 ag-Grid
 *
 * Layout:
 * ┌────────────┬─────────────────────────────────────────┐
 * │ 노드 트리   │ 카드 슬라이더 (MS그룹)                    │
 * │ (280px)    │ ┌────┐ ┌────┐ ┌────┐                    │
 * │            │ │그룹 │ │그룹 │ │그룹 │                    │
 * │ ▼ 노드1    │ └────┘ └────┘ └────┘                    │
 * │ ▼ 노드2    │ [+ 미디어서버] [+ MS그룹 추가]            │
 * │            ├─────────────────────────────────────────┤
 * │            │ 미디어서버 ag-Grid (선택 그룹의 서버)      │
 * │            │ [MS그룹 멤버관리]                         │
 * └────────────┴─────────────────────────────────────────┘
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input } from 'antd';
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Network, Plus, Settings, Trash2, Users } from 'lucide-react';
import { toast } from '@/shared-util';
import MediaServerDrawer, { type MediaServerDrawerRef } from '../components/MediaServerDrawer';
import MsGroupDrawer, { type MsGroupDrawerRef } from '../components/MsGroupDrawer';
import MsGroupMemberDrawer, { type MsGroupMemberDrawerRef } from '../components/MsGroupMemberDrawer';
import NodeMsSettingDrawer, { type NodeMsSettingDrawerRef } from '../components/NodeMsSettingDrawer';
import { msGroupQueryKeys, useDeleteMsGroup, useGetMediaServers, useGetMsGroupMembers, useGetMsGroups, useGetNodes } from '../hooks/useMsGroupQueries';
import { type MediaServer, type MsGroup, type NodeMsGroupGroup, ROUTE_TYPE_LABELS, getMsGroupTagList } from '../types/msGroup.types';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '회선관리', path: '/ipron/line/ms-group' },
  { title: 'MS관리', path: '/ipron/line/ms-group' },
];

export default function MsGroupListPage() {
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
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);

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
        toast.success('MS그룹이 삭제되었습니다.');
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

  // 전체 미디어서버 (트리 장애 표시용 — 노드 무관하게 전체 조회)
  const { data: allServersForStatus = [] } = useGetMediaServers({
    queryOptions: { enabled: true },
  });

  // ─── 노드별 장애 상태 집계 (트리/카드 표시용) ────────────────────────────
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
  const nodeMsGroupGroups: NodeMsGroupGroup[] = useMemo(() => {
    const groupMap = new Map<number, NodeMsGroupGroup>();

    // All nodes shown in tree (even without MS groups)
    for (const node of nodes) {
      groupMap.set(node.nodeId, {
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        msGroups: [],
      });
    }

    for (const grp of msGroups) {
      let group = groupMap.get(grp.nodeId);
      if (!group) {
        group = {
          nodeId: grp.nodeId,
          nodeName: `Node ${grp.nodeId}`,
          msGroups: [],
        };
        groupMap.set(grp.nodeId, group);
      }
      group.msGroups.push(grp);
    }

    return Array.from(groupMap.values())
      .map((g) =>
        searchText
          ? {
              ...g,
              msGroups: g.msGroups.filter((grp) => grp.msGroupName?.toLowerCase().includes(searchText.toLowerCase())),
            }
          : g,
      )
      .sort((a, b) => a.nodeId - b.nodeId);
  }, [msGroups, nodes, searchText]);

  const selectedMsGroups = useMemo(() => {
    if (!selectedNodeId) return [];
    return msGroups.filter((grp) => grp.nodeId === selectedNodeId);
  }, [msGroups, selectedNodeId]);

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

  const filteredMsGroups = useMemo(() => {
    if (!searchText) return selectedMsGroups;
    return selectedMsGroups.filter((grp) => grp.msGroupName?.toLowerCase().includes(searchText.toLowerCase()));
  }, [selectedMsGroups, searchText]);

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
    setSelectedGroupId(null);
    setSearchText('');
  };

  const handleCardSelect = (grp: MsGroup) => {
    setSelectedGroupId(grp.msGroupId);
  };

  const handleTreeItemClick = (grp: MsGroup) => {
    setSelectedNodeId(grp.nodeId);
    setSelectedGroupId(grp.msGroupId);
    // scroll card into view
    setTimeout(() => {
      const card = document.getElementById(`msg-card-${grp.msGroupId}`);
      card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
  };

  const handleCreateMsGroup = useCallback(() => {
    if (selectedNodeId) {
      msGroupDrawerRef.current?.open(undefined, selectedNodeId);
    }
  }, [selectedNodeId]);

  const handleEditMsGroup = useCallback((grp: MsGroup) => {
    msGroupDrawerRef.current?.open(grp);
  }, []);

  const handleDeleteMsGroup = useCallback(
    (grp: MsGroup) => {
      modal.confirm.execute({
        onOk: () => deleteMsGroup({ id: grp.msGroupId }),
        options: {
          title: 'MS그룹 삭제',
          content: `"${grp.msGroupName}" MS그룹을 삭제하시겠습니까?\n할당된 멤버가 있으면 삭제할 수 없습니다.`,
        },
      });
    },
    [modal, deleteMsGroup],
  );

  const handleCreateMediaServer = useCallback(() => {
    if (selectedNodeId) {
      mediaServerDrawerRef.current?.open(undefined, selectedNodeId);
    }
  }, [selectedNodeId]);

  const handleEditMediaServer = useCallback((ms: MediaServer) => {
    mediaServerDrawerRef.current?.open(ms);
  }, []);

  const handleMemberManage = useCallback(() => {
    if (selectedGroup) {
      msGroupMemberDrawerRef.current?.open(selectedGroup);
    }
  }, [selectedGroup]);

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
            1: { label: '정상', color: '#16a34a' },
            2: { label: '준비', color: '#eab308' },
          };
          if (state != null && statusMap[state]) {
            const s = statusMap[state];
            return <span style={{ color: s.color, fontWeight: 500 }}>{s.label}</span>;
          }
          return '-';
        },
      },
    ],
    [],
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
            <Input placeholder="MS그룹명 검색" size="small" allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {nodeMsGroupGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-4">
                <span className="text-sm">등록된 노드가 없습니다</span>
              </div>
            ) : (
              nodeMsGroupGroups.map((group) => {
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
                      <span className="ml-auto text-[11px] text-gray-400 font-normal">{group.msGroups.length}</span>
                    </button>

                    {/* MS Group items under node */}
                    {!isCollapsed && (
                      <div>
                        {group.msGroups.map((grp) => {
                          const isItemSelected = selectedGroupId === grp.msGroupId;
                          // 선택된 노드이고 장애 서버가 있으면 dot을 빨간색으로
                          const grpNodeFault = nodesFaultMap.get(group.nodeId) ?? false;
                          const grpDotColor = isItemSelected ? 'bg-[#405189]' : grpNodeFault ? 'bg-red-500' : 'bg-green-500';
                          return (
                            <div
                              key={grp.msGroupId}
                              className={`group flex items-center gap-2 pl-[42px] pr-4 py-1.5 cursor-pointer text-[12px] transition-colors border-l-[3px] ${
                                isItemSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189] font-medium' : 'border-l-transparent text-gray-500 hover:bg-gray-50'
                              }`}
                              onClick={() => handleTreeItemClick(grp)}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${grpDotColor}`} />
                              <span className="truncate flex-1">{grp.msGroupName}</span>
                              {grpNodeFault && <AlertTriangle className="size-3 text-red-500 flex-shrink-0" />}
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

        {/* ===== Right Panel: Cards (top) + Media Server Grid (bottom) ===== */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {selectedNodeId ? (
            <>
              {/* ── Top: Card Slider Area ── */}
              <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
                {/* Card grid header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">
                      {selectedNodeName} MS그룹 ({filteredMsGroups.length})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="small"
                      icon={<Settings className="size-3.5" />}
                      onClick={() => {
                        if (selectedNodeId) {
                          nodeSettingDrawerRef.current?.open(selectedNodeId, selectedNodeName, selectedMsGroups);
                        }
                      }}
                    >
                      노드 기본 MS설정
                    </Button>
                    <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={handleCreateMsGroup}>
                      MS그룹 추가
                    </Button>
                  </div>
                </div>

                {/* Card slider body */}
                <div className="flex items-center px-4 py-3">
                  {filteredMsGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3">
                      <Empty description={false} />
                      <span className="text-sm">{searchText ? '검색 결과가 없습니다' : '이 노드에 등록된 MS그룹이 없습니다'}</span>
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
                          const isDefaultGroup = defaultMsGroupId === grp.msGroupId;
                          const tags = getMsGroupTagList(grp);
                          return (
                            <div
                              key={grp.msGroupId}
                              id={`msg-card-${grp.msGroupId}`}
                              className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all min-w-[220px] max-w-[260px] flex-shrink-0 ${
                                isCardSelected
                                  ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                                  : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                              }`}
                              onClick={() => handleCardSelect(grp)}
                              onDoubleClick={() => handleEditMsGroup(grp)}
                            >
                              {/* Card header: 상태배지 + 그룹명 + 기본 뱃지 + 더보기 */}
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  {(nodesFaultMap.get(grp.nodeId) ?? false) && (
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
                                <div>분배방식: {ROUTE_TYPE_LABELS[grp.routeType] ?? grp.routeType}</div>
                                <div>할당 MS 수: {grp.routeCnt ?? 0}</div>
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
              </div>

              {/* ── Bottom: Media Server Grid ── */}
              <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-col flex-1 min-h-0">
                  {/* Bottom header */}
                  <div className="px-5 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-800">미디어서버 ({filteredMediaServers.length})</span>
                    <div className="flex gap-2">
                      <Button size="small" icon={<Plus className="size-3.5" />} onClick={handleCreateMediaServer}>
                        미디어서버 추가
                      </Button>
                      <Button size="small" icon={<Users className="size-3.5" />} onClick={handleMemberManage} disabled={!selectedGroup}>
                        MS그룹 멤버관리
                      </Button>
                    </div>
                  </div>

                  {/* Grid content */}
                  <div className="flex-1">
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
                      defaultColDef={{ filter: true, sortable: true }}
                      onRowDoubleClicked={(e) => {
                        if (e.data) handleEditMediaServer(e.data);
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty state when no node selected */
            <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
              <Empty description={false} />
              <span className="text-sm">좌측에서 노드를 선택하세요</span>
            </div>
          )}
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
