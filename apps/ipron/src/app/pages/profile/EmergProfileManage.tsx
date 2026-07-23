/**
 * 긴급코드 프로파일 관리 메인 페이지
 * Pattern: 상단 노드 탭 + 프로파일 카드 슬라이더 + 하단 긴급코드 ag-Grid
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [←] [전체(n)] [C1N1(2)] [C1N2(3)] [→]  🔍[검색] [+추가] │  ← 노드 탭 바
 * │ [Card1] [Card2] [Card3] ...                           │  ← 프로파일 카드 슬라이더
 * ├──────────────────────────────────────────────────────┤
 * │ {프로파일명} 긴급코드 (n건)              [+긴급코드 추가]  │
 * │ ag-Grid                                               │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input } from 'antd';
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Copy, Edit3, Layers, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import EmergCodeDrawer, { type EmergCodeDrawerRef } from '../../features/emerg-profile/components/EmergCodeDrawer';
import EmergProfileCopyDialog, { type EmergProfileCopyDialogRef } from '../../features/emerg-profile/components/EmergProfileCopyDialog';
import EmergProfileDrawer, { type EmergProfileDrawerRef } from '../../features/emerg-profile/components/EmergProfileDrawer';
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
} from '../../features/emerg-profile/hooks/useEmergProfileQueries';
import type { EmergCode, EmergProfile } from '../../features/emerg-profile/types';
import { useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '프로파일', path: '/ipron/profile' }, { title: '긴급코드 프로파일', path: '/ipron/profile/emerg-profile' }];

export default function EmergProfileManage() {
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
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [cardCollapsed, setCardCollapsed] = useState(true);
  // 긴급코드 그리드 서버사이드 LIKE 검색 (SWAT: sEmergencyCode / sEmergencyCodeName)
  const [codeSearchCode, setCodeSearchCode] = useState('');
  const [codeSearchName, setCodeSearchName] = useState('');
  const [codeSearchParams, setCodeSearchParams] = useState<{ emergencyCode?: string; emergencyCodeName?: string }>({});
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const profileDrawerRef = useRef<EmergProfileDrawerRef>(null);
  const codeDrawerRef = useRef<EmergCodeDrawerRef>(null);
  const copyDialogRef = useRef<EmergProfileCopyDialogRef>(null);
  // 초기 마운트 시 1회만 첫 노드 자동 선택 — 이후 사용자가 "전체"(null) 선택하면 유지.
  const hasInitializedNodeRef = useRef(false);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: profiles = [] } = useGetProfiles();
  const { data: allNodes = [] } = useGetNodes();
  const nodes = useScopedNodes(allNodes);
  const { data: codes = [], isLoading: isCodesLoading } = useGetCodes({
    params: selectedProfileId ? { profileId: selectedProfileId, ...codeSearchParams } : undefined,
    queryOptions: { enabled: !!selectedProfileId },
  });
  const { data: routes = [] } = useGetRoutesByNode(selectedNodeId);

  // ─── Derived data ───────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const searchFilteredProfiles = useMemo(() => {
    if (!isSearching) return profiles;
    const kw = searchText.trim().toLowerCase();
    return profiles.filter((p) => p.emergencyCodeProfileName.toLowerCase().includes(kw));
  }, [profiles, isSearching, searchText]);

  const filteredProfiles = useMemo(
    () => (isSearching || selectedNodeId === null ? searchFilteredProfiles : searchFilteredProfiles.filter((p) => p.nodeId === selectedNodeId)),
    [searchFilteredProfiles, selectedNodeId, isSearching],
  );

  const selectedProfile = useMemo(() => profiles.find((p) => p.emergencyCodeProfileId === selectedProfileId) ?? null, [profiles, selectedProfileId]);

  const routeOptions = useMemo(() => routes.map((r) => ({ label: r.routeName, value: r.routeId })), [routes]);

  // ─── Auto-select ────────────────────────────────────────────────────────────
  // 최초 1회만 첫 노드로 기본 선택. "전체"(null) 로 전환한 이후엔 덮어쓰지 않음.
  useEffect(() => {
    if (hasInitializedNodeRef.current) return;
    if (nodes.length > 0) {
      setSelectedNodeId(nodes[0].nodeId);
      hasInitializedNodeRef.current = true;
    }
  }, [nodes]);

  useEffect(() => {
    if (!selectedProfileId && filteredProfiles.length > 0) {
      setSelectedProfileId(filteredProfiles[0].emergencyCodeProfileId);
    }
  }, [filteredProfiles, selectedProfileId]);

  // 노드 스코프가 바뀌어 선택 노드가 스코프 밖이면 전체(null)로 해제
  useEffect(() => {
    if (selectedNodeId != null && nodes.length > 0 && !nodes.some((n) => n.nodeId === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleNodeSelect = useCallback((nodeId: number | null) => {
    setSelectedNodeId(nodeId);
    setSelectedProfileId(null);
    setSearchText('');
  }, []);

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim()) {
      setSelectedNodeId(null);
      setSelectedProfileId(null);
    }
  }, []);

  const handleCardSelect = useCallback(
    (profile: EmergProfile) => {
      setSelectedProfileId(profile.emergencyCodeProfileId);
      if (!selectedNodeId || selectedNodeId !== profile.nodeId) {
        setSelectedNodeId(profile.nodeId);
      }
      // 프로파일 전환 시 코드 검색 초기화
      setCodeSearchCode('');
      setCodeSearchName('');
      setCodeSearchParams({});
    },
    [selectedNodeId],
  );

  // 긴급코드 그리드 검색 실행 (SWAT sEmergencyCode/sEmergencyCodeName 서버사이드 LIKE)
  const handleCodeSearch = useCallback(() => {
    setCodeSearchParams({
      emergencyCode: codeSearchCode.trim() || undefined,
      emergencyCodeName: codeSearchName.trim() || undefined,
    });
  }, [codeSearchCode, codeSearchName]);

  // 긴급코드 그리드 검색 초기화
  const handleCodeSearchReset = useCallback(() => {
    setCodeSearchCode('');
    setCodeSearchName('');
    setCodeSearchParams({});
  }, []);

  // ─── Invalidate helpers ─────────────────────────────────────────────────────
  const invalidateProfiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: emergProfileQueryKeys.getProfiles().queryKey });
  }, [queryClient]);

  const invalidateCodes = useCallback(() => {
    if (selectedProfileId) {
      // 현재 codeSearchParams 포함한 정확한 queryKey로 invalidate
      queryClient.invalidateQueries({
        queryKey: emergProfileQueryKeys.getCodes({ profileId: selectedProfileId, ...codeSearchParams }).queryKey,
      });
    }
  }, [queryClient, selectedProfileId, codeSearchParams]);

  const invalidateAll = useCallback(() => {
    invalidateProfiles();
    invalidateCodes();
  }, [invalidateProfiles, invalidateCodes]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createProfile, isPending: isCreatingProfile } = useCreateProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 등록되었습니다');
        profileDrawerRef.current?.close();
        invalidateProfiles();
      },
    },
  });

  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 수정되었습니다');
        profileDrawerRef.current?.close();
        invalidateProfiles();
      },
    },
  });

  const { mutate: deleteProfile } = useDeleteProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 삭제되었습니다');
        setSelectedProfileId(null);
        invalidateProfiles();
      },
    },
  });

  const { mutate: copyProfile, isPending: isCopyingProfile } = useCopyProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 복사되었습니다');
        copyDialogRef.current?.close();
        invalidateProfiles();
      },
    },
  });

  const { mutate: createCode, isPending: isCreatingCode } = useCreateCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('긴급코드가 등록되었습니다');
        codeDrawerRef.current?.close();
        invalidateAll();
      },
    },
  });

  const { mutate: updateCode, isPending: isUpdatingCode } = useUpdateCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('긴급코드가 수정되었습니다');
        codeDrawerRef.current?.close();
        invalidateCodes();
      },
    },
  });

  const { mutate: deleteCode } = useDeleteCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('긴급코드가 삭제되었습니다');
        invalidateAll();
      },
    },
  });

  // ─── Profile actions ───────────────────────────────────────────────────────
  const handleProfileCreate = () => profileDrawerRef.current?.open();
  const handleProfileEdit = (profile: EmergProfile) => profileDrawerRef.current?.open(profile);
  const handleProfileCopy = (profile: EmergProfile) => copyDialogRef.current?.open(profile);

  const handleProfileDelete = (profile: EmergProfile) => {
    modal.confirm.execute({
      onOk: () => deleteProfile({ profileId: profile.emergencyCodeProfileId }),
      options: {
        title: '프로파일 삭제',
        content: `"${profile.emergencyCodeProfileName}" 프로파일을 삭제하시겠습니까?`,
      },
    });
  };

  // ─── Code actions ──────────────────────────────────────────────────────────
  const handleCodeCreate = () => codeDrawerRef.current?.open();
  const handleCodeEdit = (code: EmergCode) => codeDrawerRef.current?.open(code);

  // SWAT: validateCode 배열로 기초데이터 여부 사전 체크 후 alert — 서버 요청 자체를 막음
  // emergencyCodeProfileId === 2000000001 && emergencyCode in [110,112,113,117,119]
  const BASE_PROFILE_ID = 2000000001;
  const BASE_EMERGENCY_CODES = ['110', '112', '113', '117', '119'];

  const handleCodeDelete = (code: EmergCode) => {
    if (code.emergencyCodeProfileId === BASE_PROFILE_ID && BASE_EMERGENCY_CODES.includes(code.emergencyCode)) {
      modal.show.info('기초 데이터는 삭제할 수 없습니다.', '삭제 불가');
      return;
    }
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
    { key: 'edit', label: '수정', icon: <Edit3 className="size-4" />, onClick: () => handleProfileEdit(profile) },
    { key: 'copy', label: '복사', icon: <Copy className="size-4" />, onClick: () => handleProfileCopy(profile) },
    { key: 'delete', label: '삭제', icon: <Trash2 className="size-4" />, danger: true, onClick: () => handleProfileDelete(profile) },
  ];

  // ─── ag-Grid columns ──────────────────────────────────────────────────────
  const defaultColDef: ColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }),
    [],
  );

  const columnDefs: ColDef<EmergCode>[] = [
    { headerName: '긴급코드', field: 'emergencyCode', minWidth: 120, maxWidth: 150 },
    { headerName: '코드명', field: 'emergencyCodeName', flex: 1, tooltipField: 'emergencyCodeName' },
    {
      headerName: '라우트',
      field: 'routeName',
      maxWidth: 140,
      cellRenderer: (params: ICellRendererParams) => {
        if (params.value) return params.value;
        return (
          <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
            <AlertTriangle className="size-3.5" />
            미지정
          </span>
        );
      },
    },
    { headerName: '설명', field: 'emergencyCodeDesc', flex: 1, tooltipField: 'emergencyCodeDesc', valueFormatter: (params) => params.value ?? '-' },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 탭 바 + 프로파일 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* Header: 노드 탭 바 + 검색 + 추가 버튼 */}
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            {/* 좌측 스크롤 버튼 */}
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
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
                <span className="text-[11px] text-gray-400">({searchFilteredProfiles.length})</span>
              </button>

              {/* 노드 탭들 */}
              {nodes.map((node) => {
                const nodeProfiles = searchFilteredProfiles.filter((p) => p.nodeId === node.nodeId);
                const hasUnassigned = nodeProfiles.some((p) => p.hasUnassignedRoute);
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
                    {hasUnassigned && <AlertTriangle className="size-3.5 text-amber-500 flex-shrink-0" />}
                    <Network className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{node.nodeName}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">({nodeProfiles.length})</span>
                  </button>
                );
              })}
            </div>

            {/* 우측 스크롤 버튼 */}
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
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
                등록
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 카드 슬라이더 박스 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* 접기/펼치기 헤더 */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-100 transition-colors"
            onClick={() => setCardCollapsed((c) => !c)}
          >
            <span>프로파일 카드</span>
            <span>{cardCollapsed ? '펼치기' : '접기'}</span>
          </button>
          {/* Card slider body */}
          {!cardCollapsed && (
            <div className="flex items-center px-4 py-3 h-[170px]">
              {filteredProfiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
                  <Empty description={false} styles={{ image: { height: 40 } }} />
                  <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : '등록된 프로파일이 없습니다'}</span>
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
                          className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[130px] flex-shrink-0 flex flex-col ${
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
                          {/* Card header: 상태배지 + 프로파일명 + 더보기 */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {cardHasUnassigned && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 text-red-500 bg-red-50 border-red-200">
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
                            <div className="flex items-center gap-1">
                              <Network className="size-3 text-gray-400" />
                              <span className="truncate">{nodes.find((n) => n.nodeId === profile.nodeId)?.nodeName ?? `Node ${profile.nodeId}`}</span>
                            </div>
                            <div>긴급코드: {profile.codeCount ?? 0}건</div>
                          </div>

                          {/* 하단 태그 */}
                          <div className="flex flex-wrap gap-1 mt-auto pt-2">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                (profile.codeCount ?? 0) > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
                              }`}
                            >
                              {(profile.codeCount ?? 0) > 0 ? `${profile.codeCount}건 등록` : '미등록'}
                            </span>
                            {cardHasUnassigned && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border text-amber-700 bg-amber-50 border-amber-200">
                                라우트 미지정
                              </span>
                            )}
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
          )}
        </div>

        {/* ===== 하단: 긴급코드 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {selectedProfile ? (
            <>
              {/* Grid header */}
              <div className="px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-gray-100 gap-3">
                <span className="text-sm font-semibold text-gray-800 flex-shrink-0">
                  {selectedProfile.emergencyCodeProfileName} 긴급코드 ({codes.length}건)
                </span>
                {/* 긴급코드/코드명 서버사이드 LIKE 검색 (SWAT: sEmergencyCode / sEmergencyCodeName) */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <Input
                    size="small"
                    placeholder="긴급코드"
                    value={codeSearchCode}
                    onChange={(e) => setCodeSearchCode(e.target.value)}
                    onPressEnter={handleCodeSearch}
                    style={{ width: 110 }}
                    allowClear
                    onClear={handleCodeSearchReset}
                  />
                  <Input
                    size="small"
                    placeholder="긴급코드명"
                    value={codeSearchName}
                    onChange={(e) => setCodeSearchName(e.target.value)}
                    onPressEnter={handleCodeSearch}
                    style={{ width: 130 }}
                    allowClear
                    onClear={handleCodeSearchReset}
                  />
                  <Button size="small" icon={<Search className="size-3" />} onClick={handleCodeSearch}>
                    검색
                  </Button>
                </div>
                <Button icon={<Plus className="size-3.5" />} onClick={handleCodeCreate}>
                  등록
                </Button>
              </div>

              {/* ag-Grid */}
              <div className="flex-1">
                <AgGridReact<EmergCode>
                  rowData={codes}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  gridOptions={{
                    ...gridOptions,
                    statusBar: undefined,
                    pagination: false,
                    sideBar: false,
                  }}
                  loading={isCodesLoading}
                  getRowId={(params) => params.data.emergencyCode}
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
