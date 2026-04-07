/**
 * 긴급코드 프로파일 관리 메인 페이지
 * Pattern: 좌측 노드 트리 (280px) + 우측 상단 카드 슬라이더 (프로파일) + 우측 하단 ag-Grid (긴급코드)
 *
 * Layout:
 * ┌────────────┬─────────────────────────────────────────┐
 * │ 노드 트리   │ 카드 슬라이더 (프로파일)                   │
 * │ (280px)    │ ┌────┐ ┌────┐ ┌────┐                    │
 * │            │ │prof│ │prof│ │prof│                    │
 * │ ▼ 노드1    │ └────┘ └────┘ └────┘                    │
 * │ ▼ 노드2    │ [+ 프로파일 추가]                         │
 * │            ├─────────────────────────────────────────┤
 * │            │ 긴급코드 ag-Grid (선택 프로파일의 코드)     │
 * │            │ [+ 긴급코드 추가]                         │
 * └────────────┴─────────────────────────────────────────┘
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input } from 'antd';
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Copy, Edit3, MoreVertical, Network, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import EmergCodeDrawer, { type EmergCodeDrawerRef } from '../components/EmergCodeDrawer';
import EmergProfileCopyDialog, { type EmergProfileCopyDialogRef } from '../components/EmergProfileCopyDialog';
import EmergProfileDrawer, { type EmergProfileDrawerRef } from '../components/EmergProfileDrawer';
import {
  emergProfileQueryKeys,
  useCopyProfile,
  useCreateCode,
  useCreateProfile,
  useDeleteCode,
  useDeleteProfile,
  useGetCodes,
  useGetNodes,
  useGetProfiles,
  useGetRoutesByNode,
  useUpdateCode,
  useUpdateProfile,
} from '../hooks/useEmergProfileQueries';
import type { EmergCode, EmergProfile } from '../types/emergProfile.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '프로파일 관리', path: '/ipron/emerg-profile' },
  { title: '긴급코드 프로파일', path: '/ipron/emerg-profile' },
];

export default function EmergProfilePage() {
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const profileDrawerRef = useRef<EmergProfileDrawerRef>(null);
  const codeDrawerRef = useRef<EmergCodeDrawerRef>(null);
  const copyDialogRef = useRef<EmergProfileCopyDialogRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: profiles = [] } = useGetProfiles();
  const { data: nodes = [] } = useGetNodes();
  const { data: codes = [], isLoading: isCodesLoading } = useGetCodes({
    params: selectedProfileId ? { profileId: selectedProfileId } : undefined,
    queryOptions: {
      enabled: !!selectedProfileId,
    },
  });
  const { data: routes = [] } = useGetRoutesByNode(selectedNodeId);

  // ─── Derived data ───────────────────────────────────────────────────────────
  const selectedProfile = useMemo(() => profiles.find((p) => p.emergencyCodeProfileId === selectedProfileId) ?? null, [profiles, selectedProfileId]);

  /** Route options for EmergCodeDrawer */
  const routeOptions = useMemo(() => routes.map((r) => ({ label: r.routeName, value: r.routeId })), [routes]);

  /** Nodes with profiles grouped (for the left tree) */
  const nodeList = useMemo(() => {
    const list = nodes.map((node) => ({
      ...node,
      nodeProfiles: profiles.filter((p) => p.nodeId === node.nodeId),
      profileCount: profiles.filter((p) => p.nodeId === node.nodeId).length,
    }));

    if (!searchText) return list;

    // Filter: show nodes/profiles matching search text
    const lower = searchText.toLowerCase();
    return list
      .map((node) => ({
        ...node,
        nodeProfiles: node.nodeProfiles.filter((p) => p.emergencyCodeProfileName.toLowerCase().includes(lower)),
      }))
      .filter((node) => node.nodeName.toLowerCase().includes(lower) || node.nodeProfiles.length > 0);
  }, [nodes, profiles, searchText]);

  /** Profiles filtered by selected node */
  const filteredProfiles = useMemo(() => {
    if (!selectedNodeId) return [];
    return profiles.filter((p) => p.nodeId === selectedNodeId);
  }, [profiles, selectedNodeId]);

  /** Selected node name */
  const selectedNodeName = useMemo(() => {
    const node = nodes.find((n) => n.nodeId === selectedNodeId);
    return node?.nodeName ?? '';
  }, [nodes, selectedNodeId]);

  // ─── Auto-select first node on load ──────────────────────────────────────────
  useEffect(() => {
    if (nodes.length > 0 && selectedNodeId === null) {
      setSelectedNodeId(nodes[0].nodeId);
    }
  }, [nodes, selectedNodeId]);

  // ─── Auto-select first profile when node changes ─────────────────────────────
  useEffect(() => {
    if (selectedNodeId) {
      const nodeProfiles = profiles.filter((p) => p.nodeId === selectedNodeId);
      if (nodeProfiles.length > 0) {
        setSelectedProfileId(nodeProfiles[0].emergencyCodeProfileId);
      } else {
        setSelectedProfileId(null);
      }
    }
  }, [selectedNodeId, profiles]);

  // ─── Invalidate helpers ─────────────────────────────────────────────────────
  const invalidateProfiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: emergProfileQueryKeys.getProfiles().queryKey });
  }, [queryClient]);

  const invalidateCodes = useCallback(() => {
    if (selectedProfileId) {
      queryClient.invalidateQueries({
        queryKey: emergProfileQueryKeys.getCodes({ profileId: selectedProfileId }).queryKey,
      });
    }
  }, [queryClient, selectedProfileId]);

  const invalidateAll = useCallback(() => {
    invalidateProfiles();
    invalidateCodes();
  }, [invalidateProfiles, invalidateCodes]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createProfile, isPending: isCreatingProfile } = useCreateProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 등록되었습니다.');
        profileDrawerRef.current?.close();
        invalidateProfiles();
      },
    },
  });

  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 수정되었습니다.');
        profileDrawerRef.current?.close();
        invalidateProfiles();
      },
    },
  });

  const { mutate: deleteProfile } = useDeleteProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 삭제되었습니다.');
        setSelectedProfileId(null);
        invalidateProfiles();
      },
    },
  });

  const { mutate: copyProfile, isPending: isCopyingProfile } = useCopyProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 복사되었습니다.');
        copyDialogRef.current?.close();
        invalidateProfiles();
      },
    },
  });

  const { mutate: createCode, isPending: isCreatingCode } = useCreateCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('긴급코드가 등록되었습니다.');
        codeDrawerRef.current?.close();
        invalidateAll();
      },
    },
  });

  const { mutate: updateCode, isPending: isUpdatingCode } = useUpdateCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('긴급코드가 수정되었습니다.');
        codeDrawerRef.current?.close();
        invalidateCodes();
      },
    },
  });

  const { mutate: deleteCode } = useDeleteCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('긴급코드가 삭제되었습니다.');
        invalidateAll();
      },
    },
  });

  // ─── Node selection ──────────────────────────────────────────────────────────
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
  };

  // ─── Profile actions ───────────────────────────────────────────────────────
  const handleProfileCreate = () => {
    profileDrawerRef.current?.open();
  };

  const handleProfileEdit = (profile: EmergProfile) => {
    profileDrawerRef.current?.open(profile);
  };

  const handleProfileDelete = (profile: EmergProfile) => {
    modal.confirm.execute({
      onOk: () => deleteProfile({ profileId: profile.emergencyCodeProfileId }),
      options: {
        title: '프로파일 삭제',
        content: `"${profile.emergencyCodeProfileName}" 프로파일을 삭제하시겠습니까?\n하위 긴급코드도 함께 삭제됩니다.`,
      },
    });
  };

  const handleProfileCopy = (profile: EmergProfile) => {
    copyDialogRef.current?.open(profile);
  };

  const handleProfileSelect = (profileId: number) => {
    setSelectedProfileId(profileId);
  };

  // ─── Code actions ──────────────────────────────────────────────────────────
  const handleCodeCreate = () => {
    codeDrawerRef.current?.open();
  };

  const handleCodeEdit = (code: EmergCode) => {
    codeDrawerRef.current?.open(code);
  };

  const handleCodeDelete = (code: EmergCode) => {
    modal.confirm.execute({
      onOk: () =>
        deleteCode({
          profileId: code.emergencyCodeProfileId,
          code: code.emergencyCode,
        }),
      options: {
        title: '긴급코드 삭제',
        content: `"${code.emergencyCodeName}" (${code.emergencyCode}) 코드를 삭제하시겠습니까?`,
      },
    });
  };

  // ─── Profile dropdown menu ─────────────────────────────────────────────────
  const getProfileMenuItems = (profile: EmergProfile) => [
    {
      key: 'edit',
      label: '수정',
      icon: <Edit3 className="size-4" />,
      onClick: () => handleProfileEdit(profile),
    },
    {
      key: 'copy',
      label: '복사',
      icon: <Copy className="size-4" />,
      onClick: () => handleProfileCopy(profile),
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <Trash2 className="size-4" />,
      danger: true,
      onClick: () => handleProfileDelete(profile),
    },
  ];

  // ─── ag-Grid columns ──────────────────────────────────────────────────────
  const defaultColDef: ColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    [],
  );

  const columnDefs: ColDef<EmergCode>[] = [
    {
      headerName: '긴급코드',
      field: 'emergencyCode',
      minWidth: 120,
      maxWidth: 150,
    },
    {
      headerName: '코드명',
      field: 'emergencyCodeName',
      flex: 1,
    },
    {
      headerName: '라우트',
      field: 'routeName',
      maxWidth: 140,
      cellRenderer: (params: ICellRendererParams) => {
        if (params.value) return params.value;
        return <span className="text-red-500 font-semibold">⚠ 미지정</span>;
      },
    },
    {
      headerName: '설명',
      field: 'emergencyCodeDesc',
      flex: 1,
      valueFormatter: (params) => params.value ?? '-',
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<EmergCode>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCodeDelete(data);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Split container: Left Tree + Right (Cards + Bottom Grid) */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* ===== Left Panel: Node Tree (280px) ===== */}
        <div className="w-[280px] min-w-[280px] bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <Input placeholder="프로파일명 검색" size="small" allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {nodeList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-4">
                <span className="text-sm">{searchText ? '검색 결과가 없습니다' : '등록된 노드가 없습니다'}</span>
              </div>
            ) : (
              nodeList.map((node) => {
                const isCollapsed = collapsedNodes.has(node.nodeId);
                const isNodeSelected = selectedNodeId === node.nodeId;
                return (
                  <div key={node.nodeId} className="mb-0.5">
                    {/* Node group header */}
                    <button
                      type="button"
                      className={`w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none text-[13px] font-semibold transition-colors border-l-[3px] ${
                        isNodeSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189]' : 'border-l-transparent text-gray-800 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        handleNodeSelect(node.nodeId);
                        if (isCollapsed) toggleNodeGroup(node.nodeId);
                      }}
                    >
                      <button
                        type="button"
                        className="p-0 bg-transparent border-none cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNodeGroup(node.nodeId);
                        }}
                      >
                        {isCollapsed ? <ChevronRight className="size-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="size-3.5 text-gray-400 flex-shrink-0" />}
                      </button>
                      <Network className="size-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate flex-1 text-left">{node.nodeName}</span>
                      <span className="ml-auto text-[11px] text-gray-400 font-normal">{node.profileCount}</span>
                    </button>

                    {/* Profile items under node */}
                    {!isCollapsed && (
                      <div>
                        {node.nodeProfiles.map((profile) => {
                          const isItemSelected = selectedProfileId === profile.emergencyCodeProfileId;
                          const dotColor = isItemSelected ? 'bg-[#405189]' : profile.hasUnassignedRoute ? 'bg-red-500' : profile.codeCount > 0 ? 'bg-green-500' : 'bg-gray-300';
                          return (
                            <div
                              key={profile.emergencyCodeProfileId}
                              className={`group flex items-center gap-2 pl-[42px] pr-2 py-1.5 cursor-pointer text-[12px] transition-colors border-l-[3px] ${
                                isItemSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189] font-medium' : 'border-l-transparent text-gray-500 hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                setSelectedNodeId(profile.nodeId);
                                handleProfileSelect(profile.emergencyCodeProfileId);
                              }}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                              <span className="truncate flex-1">{profile.emergencyCodeProfileName}</span>
                              {profile.hasUnassignedRoute && <AlertTriangle className="size-3 text-red-500 flex-shrink-0" />}
                              <span className="text-[11px] text-gray-400">{profile.codeCount ?? 0}</span>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <Dropdown menu={{ items: getProfileMenuItems(profile) }} trigger={['click']} placement="bottomRight">
                                  <button type="button" className="p-0.5 rounded hover:bg-gray-200 transition-colors">
                                    <MoreVertical className="size-3.5 text-gray-400" />
                                  </button>
                                </Dropdown>
                              </div>
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

        {/* ===== Right Panel: Cards (top) + Code Grid (bottom) ===== */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {selectedNodeId ? (
            <>
              {/* ── Top: Card Slider Area ── */}
              <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
                {/* Card slider header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">
                      {selectedNodeName} 프로파일 ({filteredProfiles.length}건)
                    </span>
                  </div>
                  <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={handleProfileCreate}>
                    프로파일 추가
                  </Button>
                </div>

                {/* Card slider body */}
                <div className="flex items-center px-4 py-3">
                  {filteredProfiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3">
                      <Empty description={false} />
                      <span className="text-sm">이 노드에 등록된 프로파일이 없습니다</span>
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
                        {filteredProfiles.map((profile) => {
                          const isCardSelected = selectedProfileId === profile.emergencyCodeProfileId;
                          const cardHasUnassigned = profile.hasUnassignedRoute;
                          return (
                            <div
                              key={profile.emergencyCodeProfileId}
                              className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all min-w-[220px] max-w-[260px] flex-shrink-0 ${
                                isCardSelected
                                  ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                                  : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                              }`}
                              onClick={() => handleProfileSelect(profile.emergencyCodeProfileId)}
                              onDoubleClick={() => handleProfileEdit(profile)}
                            >
                              {/* Card header: 상태배지 + 프로파일명 + 더보기 */}
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  {cardHasUnassigned && (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0"
                                      style={{ color: '#ff4d4f', backgroundColor: '#fff2f0', borderColor: '#ff4d4f40' }}
                                    >
                                      미지정
                                    </span>
                                  )}
                                  <span className="text-sm font-semibold text-gray-800 truncate">{profile.emergencyCodeProfileName}</span>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Dropdown menu={{ items: getProfileMenuItems(profile) }} trigger={['click']} placement="bottomRight">
                                    <button type="button" className="p-1 rounded hover:bg-gray-100 transition-colors">
                                      <MoreVertical className="size-4 text-gray-400" />
                                    </button>
                                  </Dropdown>
                                </div>
                              </div>

                              {/* Card info */}
                              <div className="text-xs text-gray-500 space-y-0.5">
                                <div>긴급코드 수: {profile.codeCount ?? 0}</div>
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

              {/* ── Bottom: Code Grid ── */}
              <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden">
                {selectedProfile ? (
                  <>
                    {/* Grid header */}
                    <div className="px-5 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
                      <span className="text-sm font-semibold text-gray-800">
                        {selectedProfile.emergencyCodeProfileName} 긴급코드 ({codes.length}건)
                      </span>
                      <Button size="small" icon={<Plus className="size-3.5" />} onClick={handleCodeCreate}>
                        긴급코드 추가
                      </Button>
                    </div>

                    {/* ag-Grid */}
                    <div className="flex-1">
                      <AgGridReact<EmergCode>
                        rowData={codes}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        gridOptions={gridOptions}
                        loading={isCodesLoading}
                        onRowClicked={(e) => {
                          if (e.data) handleCodeEdit(e.data);
                        }}
                      />
                    </div>
                  </>
                ) : (
                  /* Empty state when no profile selected */
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
                    <Empty description={false} />
                    <span className="text-sm">프로파일을 선택하세요</span>
                  </div>
                )}
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

      {/* ===== Drawers & Dialogs ===== */}
      <EmergProfileDrawer
        ref={profileDrawerRef}
        nodes={nodes}
        onCreate={(data) => createProfile(data)}
        onUpdate={(id, data) => updateProfile({ id, data })}
        isLoading={isCreatingProfile || isUpdatingProfile}
      />

      <EmergCodeDrawer
        ref={codeDrawerRef}
        routeOptions={routeOptions}
        onCreate={(data) => {
          if (selectedProfileId) {
            createCode({ profileId: selectedProfileId, data });
          }
        }}
        onUpdate={(code, data) => {
          if (selectedProfileId) {
            updateCode({ profileId: selectedProfileId, code, data });
          }
        }}
        isLoading={isCreatingCode || isUpdatingCode}
      />

      <EmergProfileCopyDialog ref={copyDialogRef} nodes={nodes} onCopy={(profileId, data) => copyProfile({ id: profileId, data })} isLoading={isCopyingProfile} />
    </div>
  );
}
