/**
 * 긴급코드 프로파일 관리 메인 페이지
 * Pattern C: Left Tree (280px) + Right ag-Grid
 *
 * 좌측: 노드 그룹별 프로파일 목록 (collapsible)
 * 우측: 선택된 프로파일의 긴급코드 ag-Grid 테이블
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty } from 'antd';
import { ChevronDown, ChevronRight, Copy, Edit3, MoreVertical, Network, Plus, Trash2 } from 'lucide-react';
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
  useUpdateCode,
  useUpdateProfile,
} from '../hooks/useEmergProfileQueries';
import type { EmergCode, EmergProfile, NodeProfileGroup } from '../types/emergProfile.types';
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
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());

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

  // ─── Derived data ───────────────────────────────────────────────────────────
  const selectedProfile = useMemo(() => profiles.find((p) => p.emergencyCodeProfileId === selectedProfileId) ?? null, [profiles, selectedProfileId]);

  const nodeProfileGroups: NodeProfileGroup[] = useMemo(() => {
    const groupMap = new Map<number, NodeProfileGroup>();

    // Initialize from nodes
    for (const node of nodes) {
      groupMap.set(node.nodeId, {
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        profiles: [],
      });
    }

    // Add profiles to groups
    for (const profile of profiles) {
      let group = groupMap.get(profile.nodeId);
      if (!group) {
        group = {
          nodeId: profile.nodeId,
          nodeName: profile.nodeName || `Node ${profile.nodeId}`,
          profiles: [],
        };
        groupMap.set(profile.nodeId, group);
      }
      group.profiles.push(profile);
    }

    // Filter out empty groups and sort
    return Array.from(groupMap.values())
      .filter((g) => g.profiles.length > 0)
      .sort((a, b) => a.nodeId - b.nodeId);
  }, [profiles, nodes]);

  // ─── Node group toggle ─────────────────────────────────────────────────────
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
  const columnDefs: ColDef<EmergCode>[] = [
    {
      headerName: '긴급코드',
      field: 'emergencyCode',
      maxWidth: 100,
      sortable: true,
    },
    {
      headerName: '코드명',
      field: 'emergencyCodeName',
      flex: 1,
      sortable: true,
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

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">프로파일 {profiles.length}건</span>
        </div>
        <div className="flex gap-2">
          <Button type="primary" icon={<Plus className="size-4" />} onClick={handleProfileCreate}>
            프로파일 추가
          </Button>
        </div>
      </div>

      {/* Split container: Left Tree + Right Grid */}
      <div className="flex flex-1 min-h-0 bg-white bt-shadow overflow-hidden rounded-md border border-gray-200">
        {/* ===== Left Panel: Profile Tree (280px) ===== */}
        <div className="w-[280px] min-w-[280px] border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-700">프로파일 목록</span>
            <span className="text-xs text-gray-400">{profiles.length}건</span>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {nodeProfileGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-4">
                <span className="text-sm">등록된 프로파일이 없습니다</span>
              </div>
            ) : (
              nodeProfileGroups.map((group) => {
                const isCollapsed = collapsedNodes.has(group.nodeId);
                return (
                  <div key={group.nodeId} className="mb-0.5">
                    {/* Node group header */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-4 py-2 cursor-pointer select-none text-[13px] font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
                      onClick={() => toggleNodeGroup(group.nodeId)}
                    >
                      {isCollapsed ? <ChevronRight className="size-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="size-3.5 text-gray-400 flex-shrink-0" />}
                      <Network className="size-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{group.nodeName}</span>
                      <span className="ml-auto text-[11px] text-gray-400 font-normal">{group.profiles.length}</span>
                    </button>

                    {/* Profile items */}
                    {!isCollapsed && (
                      <div>
                        {group.profiles.map((profile) => {
                          const isSelected = selectedProfileId === profile.emergencyCodeProfileId;
                          return (
                            <div
                              key={profile.emergencyCodeProfileId}
                              className={`group flex items-center gap-2 pl-[38px] pr-4 py-2 cursor-pointer text-[13px] transition-all border-l-[3px] ${
                                isSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189] font-medium' : 'border-l-transparent text-gray-600 hover:bg-gray-50'
                              }`}
                              onClick={() => handleProfileSelect(profile.emergencyCodeProfileId)}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-[#405189]' : 'bg-gray-300'}`} />
                              <span className="truncate flex-1">{profile.emergencyCodeProfileName}</span>
                              <span className="text-[11px] text-gray-400 mr-1">{profile.codeCount}</span>

                              {/* More actions dropdown */}
                              <Dropdown menu={{ items: getProfileMenuItems(profile) }} trigger={['click']} placement="bottomRight">
                                <button
                                  type="button"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="size-4 text-gray-500" />
                                </button>
                              </Dropdown>
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

        {/* ===== Right Panel: Code Grid ===== */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedProfile ? (
            <>
              {/* Grid header with profile info */}
              <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-[15px] font-semibold text-gray-800">{selectedProfile.emergencyCodeProfileName}</span>
                  <span className="w-px h-4 bg-gray-300" />
                  <span className="text-[13px] text-gray-500">
                    노드: <b className="text-gray-700 font-medium">{selectedProfile.nodeName}</b>
                  </span>
                  <span className="text-[13px] text-gray-500">
                    코드: <b className="text-gray-700 font-medium">{codes.length}건</b>
                  </span>
                </div>
                <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={handleCodeCreate}>
                  코드 추가
                </Button>
              </div>

              {/* ag-Grid */}
              <div className="flex-1">
                <AgGridReact<EmergCode>
                  rowData={codes}
                  columnDefs={columnDefs}
                  gridOptions={gridOptions}
                  loading={isCodesLoading}
                  onRowClicked={(e) => {
                    if (e.data) handleCodeEdit(e.data);
                  }}
                />
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
              <Empty description={false} />
              <span className="text-sm">좌측에서 프로파일을 선택하세요</span>
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
        routeOptions={[]}
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
