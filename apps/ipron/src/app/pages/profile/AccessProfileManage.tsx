/**
 * 접근코드 프로파일 관리 메인 페이지
 * Pattern: 상단 노드 탭 + 테넌트별 그룹화 카드 슬라이더 + 하단 접근코드 ag-Grid
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [←] [Node1(n)] [Node2(n)] [→]       🔍[검색] [+추가]   │ ← 노드 탭 바
 * │ [테넌트A] [P1][P2] | [테넌트B] [P3] ...                 │ ← 카드 슬라이더 (테넌트 그룹 + 프로파일 카드)
 * ├──────────────────────────────────────────────────────┤
 * │ {프로파일명} 접근코드 (n건)                 [+코드 추가] │
 * │ ag-Grid                                               │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input } from 'antd';
import { ArrowUpDown, Building2, ChevronLeft, ChevronRight, Copy, Edit3, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AccessCodeDrawer, { type AccessCodeDrawerRef } from '../../features/access-profile/components/AccessCodeDrawer';
import AccessProfileCopyDialog, { type AccessProfileCopyDialogRef } from '../../features/access-profile/components/AccessProfileCopyDialog';
import AccessProfileDrawer, { type AccessProfileDrawerRef } from '../../features/access-profile/components/AccessProfileDrawer';
import {
  accessProfileQueryKeys,
  useCopyProfile,
  useCreateCode,
  useCreateProfile,
  useDeleteCode,
  useDeleteProfile,
  useGetCodes,
  useGetNodeTenants,
  useGetNodes,
  useGetProfiles,
  useGetRoutesByNode,
  useGetTenants,
  useUpdateCode,
  useUpdateProfile,
} from '../../features/access-profile/hooks/useAccessProfileQueries';
import type { AccessCode, AccessProfile } from '../../features/access-profile/types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '프로파일 관리', path: '/ipron/profile/access-profile' },
  { title: '접근코드 프로파일', path: '/ipron/profile/access-profile' },
];

export default function AccessProfileManage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  // viewMode: byNode(탭=노드, 카드 그룹=테넌트별) / byTenant(탭=테넌트, 카드 그룹=노드별)
  const [viewMode, setViewMode] = useState<'byNode' | 'byTenant'>('byNode');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedNodeRef = useRef(false);
  const hasInitializedTenantRef = useRef(false);

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const profileDrawerRef = useRef<AccessProfileDrawerRef>(null);
  const codeDrawerRef = useRef<AccessCodeDrawerRef>(null);
  const copyDialogRef = useRef<AccessProfileCopyDialogRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: profiles = [] } = useGetProfiles();
  const { data: tenants = [] } = useGetTenants();
  const { data: nodes = [] } = useGetNodes();
  const { data: nodeTenants = [] } = useGetNodeTenants();

  // 노드-테넌트에 할당된 노드만 (byNode 모드 탭용)
  const assignedNodes = useMemo(() => {
    const nodeIds = new Set(nodeTenants.map((nt) => nt.nodeId));
    return nodes.filter((n) => nodeIds.has(n.nodeId));
  }, [nodes, nodeTenants]);

  // 프로파일 보유 테넌트 목록 (byTenant 모드 탭용)
  const assignedTenants = useMemo(() => {
    const ids = new Set(profiles.map((p) => p.tenantId));
    return tenants.filter((t) => ids.has(t.tenantId));
  }, [profiles, tenants]);

  const { data: codes = [], isLoading: isCodesLoading } = useGetCodes({
    params: selectedProfileId ? { profileId: selectedProfileId } : undefined,
    queryOptions: { enabled: !!selectedProfileId },
  });

  // ─── Derived data ───────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const searchFilteredProfiles = useMemo(() => {
    if (!isSearching) return profiles;
    const kw = searchText.trim().toLowerCase();
    return profiles.filter((p) => [p.accessCodeProfileName, p.nodeName, p.tenantName].some((v) => v?.toString().toLowerCase().includes(kw)));
  }, [profiles, isSearching, searchText]);

  // 탭(1차 필터) 적용된 프로파일 목록
  const filteredProfiles = useMemo(() => {
    let list = searchFilteredProfiles;
    if (!isSearching) {
      if (viewMode === 'byNode' && selectedNodeId !== null) {
        list = list.filter((p) => p.nodeId === selectedNodeId);
      } else if (viewMode === 'byTenant' && selectedTenantId !== null) {
        list = list.filter((p) => p.tenantId === selectedTenantId);
      }
    }
    return list;
  }, [searchFilteredProfiles, selectedNodeId, selectedTenantId, isSearching, viewMode]);

  // 2차 그룹화 — byNode: 테넌트별 / byTenant: 노드별 (카드 슬라이더 섹션 라벨)
  const profilesByGroup = useMemo(() => {
    const map = new Map<number, { groupId: number; groupName: string; profiles: AccessProfile[] }>();
    for (const p of filteredProfiles) {
      const key = viewMode === 'byNode' ? p.tenantId : p.nodeId;
      const name = (viewMode === 'byNode' ? p.tenantName : p.nodeName) ?? '-';
      if (!map.has(key)) {
        map.set(key, { groupId: key, groupName: name, profiles: [] });
      }
      map.get(key)!.profiles.push(p);
    }
    return Array.from(map.values()).sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [filteredProfiles, viewMode]);

  const selectedProfile = useMemo(() => profiles.find((p) => p.accessCodeProfileId === selectedProfileId) ?? null, [profiles, selectedProfileId]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  // 선택 프로파일의 노드 기준 라우트 로딩 (코드 Drawer에서 사용)
  const { data: routesForSelectedNode = [], isLoading: isRoutesLoading } = useGetRoutesByNode(selectedProfile?.nodeId ?? null);

  const routeOptionsForSelectedNode = useMemo(() => routesForSelectedNode.map((r) => ({ label: r.routeName, value: r.routeId })), [routesForSelectedNode]);

  // ─── Auto-select ────────────────────────────────────────────────────────────
  // 탭 자동 선택 (byNode: 첫 노드 / byTenant: 첫 테넌트)
  useEffect(() => {
    if (viewMode === 'byNode') {
      if (assignedNodes.length > 0 && !hasInitializedNodeRef.current) {
        hasInitializedNodeRef.current = true;
        setSelectedNodeId(assignedNodes[0].nodeId);
      }
    } else {
      if (assignedTenants.length > 0 && !hasInitializedTenantRef.current) {
        hasInitializedTenantRef.current = true;
        setSelectedTenantId(assignedTenants[0].tenantId);
      }
    }
  }, [viewMode, assignedNodes, assignedTenants]);

  // 자동 프로파일 선택 — 그룹화된 첫 그룹의 첫 프로파일로
  useEffect(() => {
    const firstProfile = profilesByGroup[0]?.profiles[0];
    if (!selectedProfileId && firstProfile) {
      setSelectedProfileId(firstProfile.accessCodeProfileId);
    } else if (selectedProfileId && !filteredProfiles.some((p) => p.accessCodeProfileId === selectedProfileId)) {
      setSelectedProfileId(firstProfile?.accessCodeProfileId ?? null);
    }
  }, [profilesByGroup, filteredProfiles, selectedProfileId]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleTabSelect = useCallback(
    (id: number | null) => {
      if (viewMode === 'byNode') {
        setSelectedNodeId(id);
      } else {
        setSelectedTenantId(id);
      }
      setSelectedProfileId(null);
      setSearchText('');
    },
    [viewMode],
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'byNode' ? 'byTenant' : 'byNode'));
    setSelectedNodeId(null);
    setSelectedTenantId(null);
    setSelectedProfileId(null);
    hasInitializedNodeRef.current = false;
    hasInitializedTenantRef.current = false;
    setSearchText('');
  }, []);

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim()) {
      setSelectedNodeId(null);
      setSelectedProfileId(null);
    }
  }, []);

  const handleCardSelect = useCallback((profile: AccessProfile) => {
    setSelectedProfileId(profile.accessCodeProfileId);
  }, []);

  // ─── Invalidate helpers ─────────────────────────────────────────────────────
  const invalidateProfiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: accessProfileQueryKeys.getProfiles().queryKey });
  }, [queryClient]);

  const invalidateCodes = useCallback(() => {
    if (selectedProfileId) {
      queryClient.invalidateQueries({
        queryKey: accessProfileQueryKeys.getCodes({ profileId: selectedProfileId }).queryKey,
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
        toast.success('접근코드가 등록되었습니다.');
        codeDrawerRef.current?.close();
        invalidateAll();
      },
    },
  });

  const { mutate: updateCode, isPending: isUpdatingCode } = useUpdateCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('접근코드가 수정되었습니다.');
        codeDrawerRef.current?.close();
        invalidateCodes();
      },
    },
  });

  const { mutate: deleteCode } = useDeleteCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('접근코드가 삭제되었습니다.');
        invalidateAll();
      },
    },
  });

  // ─── Profile actions ───────────────────────────────────────────────────────
  const handleProfileCreate = () => {
    // Drawer signature: open(profile, tenantId, nodeId)
    profileDrawerRef.current?.open(null, undefined, selectedNodeId ?? undefined);
  };

  const handleProfileEdit = (profile: AccessProfile) => {
    profileDrawerRef.current?.open(profile);
  };

  const handleProfileDelete = (profile: AccessProfile) => {
    modal.confirm.execute({
      onOk: () => deleteProfile({ id: profile.accessCodeProfileId }),
      options: {
        title: '프로파일 삭제',
        content: `"${profile.accessCodeProfileName}" 프로파일을 삭제하시겠습니까?\n하위 접근코드도 함께 삭제됩니다.`,
      },
    });
  };

  const handleProfileCopy = (profile: AccessProfile) => {
    copyDialogRef.current?.open(profile);
  };

  // ─── Code actions ──────────────────────────────────────────────────────────
  const handleCodeCreate = () => {
    codeDrawerRef.current?.open();
  };

  const handleCodeEdit = (code: AccessCode) => {
    codeDrawerRef.current?.open(code);
  };

  const handleCodeDelete = (code: AccessCode) => {
    modal.confirm.execute({
      onOk: () =>
        deleteCode({
          profileId: code.accessCodeProfileId,
          code: code.accessCode,
        }),
      options: {
        title: '접근코드 삭제',
        content: `"${code.accessCodeName}" (${code.accessCode}) 코드를 삭제하시겠습니까?`,
      },
    });
  };

  // ─── Profile dropdown menu ─────────────────────────────────────────────────
  const getProfileMenuItems = (profile: AccessProfile) => [
    { key: 'edit', label: '수정', icon: <Edit3 className="size-4" />, onClick: () => handleProfileEdit(profile) },
    { key: 'copy', label: '복사', icon: <Copy className="size-4" />, onClick: () => handleProfileCopy(profile) },
    { key: 'delete', label: '삭제', icon: <Trash2 className="size-4" />, danger: true, onClick: () => handleProfileDelete(profile) },
  ];

  // ─── ag-Grid columns ──────────────────────────────────────────────────────
  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  const columnDefs: ColDef<AccessCode>[] = [
    {
      headerName: '접근코드',
      field: 'accessCode',
      minWidth: 110,
      maxWidth: 140,
      cellRenderer: (params: ICellRendererParams<AccessCode>) => {
        if (!params.data) return null;
        return <span className="font-semibold text-gray-800 font-mono text-sm">{params.data.accessCode}</span>;
      },
    },
    {
      headerName: '코드명',
      field: 'accessCodeName',
      flex: 1,
      minWidth: 150,
    },
    {
      headerName: '최소자릿수',
      field: 'minDigits',
      maxWidth: 110,
      cellStyle: { textAlign: 'center' },
    },
    {
      headerName: '최대자릿수',
      field: 'maxDigits',
      maxWidth: 110,
      cellStyle: { textAlign: 'center' },
    },
    {
      headerName: '라우트명',
      field: 'routeName',
      minWidth: 140,
      flex: 1,
      valueFormatter: (params) => params.value ?? '-',
    },
    {
      headerName: '설명',
      field: 'accessCodeDesc',
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
      cellRenderer: (params: ICellRendererParams<AccessCode>) => {
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
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 탭 바 + 프로파일 카드 슬라이더 (viewMode에 따라 탭/그룹 swap) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* Header: [뷰 전환] [탭 바] [검색+추가] */}
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            {/* 뷰 모드 전환 버튼 (아이콘만) */}
            <button
              type="button"
              onClick={toggleViewMode}
              title={`현재: 탭=${viewMode === 'byNode' ? '노드' : '테넌트'} / 카드그룹=${viewMode === 'byNode' ? '테넌트' : '노드'}. 클릭 시 전환`}
              className="flex-shrink-0 flex flex-col items-center justify-center w-[44px] h-[56px] border-r border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              {viewMode === 'byNode' ? <Network size={14} className="text-blue-600" /> : <Building2 size={14} className="text-blue-600" />}
              <ArrowUpDown size={12} className="text-blue-500 my-0.5" />
              {viewMode === 'byNode' ? <Building2 size={14} className="text-gray-500" /> : <Network size={14} className="text-gray-500" />}
            </button>

            {/* 좌측 스크롤 버튼 */}
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              aria-label="이전 탭"
            >
              <ChevronLeft className="size-4 text-gray-500" />
            </button>

            {/* 탭 스크롤 컨테이너 — viewMode에 따라 노드 탭 or 테넌트 탭 */}
            <div
              ref={tabScrollRef}
              className="flex items-stretch max-w-[900px] min-w-0 overflow-x-auto divide-x divide-gray-200"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {(viewMode === 'byNode' ? assignedNodes.map((n) => ({ id: n.nodeId, name: n.nodeName })) : assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))).map(
                (item) => {
                  const itemCount = searchFilteredProfiles.filter((p) => (viewMode === 'byNode' ? p.nodeId === item.id : p.tenantId === item.id)).length;
                  const currentSelected = viewMode === 'byNode' ? selectedNodeId : selectedTenantId;
                  const isActive = currentSelected === item.id;
                  const Icon = viewMode === 'byNode' ? Network : Building2;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] max-w-[200px] flex-shrink-0 transition-colors ${
                        isActive ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                      }`}
                      onClick={(e) => {
                        handleTabSelect(item.id);
                        (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }}
                    >
                      <Icon className="size-3.5 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">({itemCount})</span>
                    </button>
                  );
                },
              )}
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
                placeholder="프로파일 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleProfileCreate}>
                추가
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 카드 슬라이더 박스 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
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
                {/* 프로파일 카드들 — viewMode에 따라 테넌트별 or 노드별 그룹화 */}
                {profilesByGroup.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">
                      {isSearching
                        ? '검색 결과가 없습니다'
                        : viewMode === 'byNode' && selectedNodeId
                          ? '이 노드에 등록된 프로파일이 없습니다'
                          : viewMode === 'byTenant' && selectedTenantId
                            ? '이 테넌트에 등록된 프로파일이 없습니다'
                            : '등록된 프로파일이 없습니다'}
                    </span>
                  </div>
                ) : (
                  profilesByGroup.map((group, groupIdx) => {
                    // 선택된 프로파일이 이 그룹에 속하는지 (byNode: tenantId / byTenant: nodeId 기준)
                    const selectedGroupKey = viewMode === 'byNode' ? selectedProfile?.tenantId : selectedProfile?.nodeId;
                    const isGroupActive = selectedGroupKey === group.groupId;
                    const GroupIcon = viewMode === 'byNode' ? Building2 : Network;
                    return (
                      <div key={group.groupId} className="flex items-stretch gap-3 flex-shrink-0">
                        {/* 그룹 라벨 (byNode: 테넌트 / byTenant: 노드) — 선택된 프로파일의 그룹이면 강조 */}
                        <div
                          className={`flex flex-col items-center justify-center w-[100px] flex-shrink-0 px-2 rounded transition-all border-l-4 ${
                            isGroupActive ? 'border-l-[#405189] bg-[#405189] text-white shadow-[0_2px_8px_rgba(64,81,137,0.25)]' : 'border-l-[#a3b1d6] bg-blue-50/50 text-[#405189]'
                          }`}
                        >
                          <GroupIcon className={`size-4 flex-shrink-0 ${isGroupActive ? 'text-white' : 'text-[#405189]'}`} />
                          <span className={`text-[11px] font-semibold mt-1 w-full text-center truncate ${isGroupActive ? 'text-white' : 'text-[#405189]'}`} title={group.groupName}>
                            {group.groupName}
                          </span>
                          <span className={`text-[10px] ${isGroupActive ? 'text-white/80' : 'text-gray-500'}`}>{group.profiles.length}건</span>
                        </div>

                        {/* 그룹 내 프로파일 카드들 */}
                        {group.profiles.map((profile) => {
                          const isCardSelected = selectedProfileId === profile.accessCodeProfileId;
                          const codeCount = profile.codeCount ?? 0;
                          return (
                            <div
                              key={profile.accessCodeProfileId}
                              id={`access-profile-card-${profile.accessCodeProfileId}`}
                              className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[160px] h-[130px] flex-shrink-0 flex flex-col ${
                                isCardSelected
                                  ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                                  : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                              }`}
                              onClick={(e) => {
                                handleCardSelect(profile);
                                (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                              }}
                              onDoubleClick={() => handleProfileEdit(profile)}
                            >
                              {/* Card header */}
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-gray-800 truncate">{profile.accessCodeProfileName}</span>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Dropdown menu={{ items: getProfileMenuItems(profile) }} trigger={['click']} placement="bottomRight">
                                    <button type="button" className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0">
                                      <MoreVertical className="size-3.5 text-gray-400" />
                                    </button>
                                  </Dropdown>
                                </div>
                              </div>

                              {/* 하단 태그 — 접근코드 건수만 */}
                              <div className="flex flex-wrap gap-1 mt-auto">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                    codeCount > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  {codeCount > 0 ? `접근코드 ${codeCount}건` : '접근코드 미등록'}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* 그룹 사이 구분선 */}
                        {groupIdx < profilesByGroup.length - 1 && <div className="border-l border-gray-200 mx-1" />}
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

        {/* ===== 하단: 접근코드 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {selectedProfile ? (
            <>
              {/* Grid header */}
              <div className="px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">
                  {selectedProfile.accessCodeProfileName} 접근코드 ({codes.length}건)
                </span>
                <Button icon={<Plus className="size-3.5" />} onClick={handleCodeCreate}>
                  코드 추가
                </Button>
              </div>

              {/* ag-Grid */}
              <div className="flex-1 min-h-0">
                <AgGridReact<AccessCode>
                  rowData={codes}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                  loading={isCodesLoading}
                  onRowDoubleClicked={(e) => {
                    if (e.data) handleCodeEdit(e.data);
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
              <Empty description={false} />
              <span className="text-sm">프로파일을 선택하세요</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Drawers & Dialogs ===== */}
      <AccessProfileDrawer
        ref={profileDrawerRef}
        tenants={tenants}
        nodes={nodes}
        nodeTenants={nodeTenants}
        onCreate={(data) => createProfile(data)}
        onUpdate={(id, data) => updateProfile({ id, data })}
        isLoading={isCreatingProfile || isUpdatingProfile}
      />

      <AccessCodeDrawer
        ref={codeDrawerRef}
        routeOptions={routeOptionsForSelectedNode}
        routesLoading={isRoutesLoading}
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

      <AccessProfileCopyDialog
        ref={copyDialogRef}
        tenants={tenants}
        nodes={nodes}
        nodeTenants={nodeTenants}
        onCopy={(profileId, data) => copyProfile({ id: profileId, data })}
        isLoading={isCopyingProfile}
      />
    </div>
  );
}
