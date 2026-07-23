/**
 * 기능코드 프로파일 관리 메인 페이지
 * Pattern: 상단 헤더(스코프 선택 + 요약) + 프로파일 카드 슬라이더 + 하단 기능코드 ag-Grid
 *
 * 멀티테넌트 개편(상담사 관리 정합): 상단 테넌트 탭 바 제거.
 *   - 일반 콘솔: 테넌트 선택기 없음(토큰=활성 테넌트 스코프). 헤더에 요약(프로파일/기능코드)만.
 *   - 운영자 모드: 헤더에 대행 테넌트 ScopeSelect(공통) + 그 옆에 요약.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ (운영자: [테넌트 ScopeSelect]) 요약   🔍[검색] [+추가] │  ← 헤더
 * │ [Card1] [Card2] [Card3] ...                           │  ← 프로파일 카드 슬라이더
 * ├──────────────────────────────────────────────────────┤
 * │ {프로파일명} 기능코드 (n건)         [+코드 추가]      │
 * │ [검색바]                                               │
 * │ ag-Grid                                               │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, GridApi, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input } from 'antd';
import { Building2, ChevronLeft, ChevronRight, Copy, Edit3, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { VIEW_MODE, useAuthStore, useBreadcrumbStore, useOperatorScopeStore, useViewMode } from '@/shared-store';
import { toast } from '@/shared-util';
import DevfuncCodeDrawer, { type DevfuncCodeDrawerRef } from '../../features/devfunc-profile/components/DevfuncCodeDrawer';
import DevfuncProfileCopyDialog, { type DevfuncProfileCopyDialogRef } from '../../features/devfunc-profile/components/DevfuncProfileCopyDialog';
import DevfuncProfileDrawer, { type DevfuncProfileDrawerRef } from '../../features/devfunc-profile/components/DevfuncProfileDrawer';
import {
  devfuncProfileQueryKeys,
  useCopyProfile,
  useCreateCode,
  useCreateProfile,
  useDeleteCode,
  useDeleteProfile,
  useGetCodes,
  useGetProfiles,
  useGetTenants,
  useUpdateCode,
  useUpdateProfile,
} from '../../features/devfunc-profile/hooks/useDevfuncProfileQueries';
import type { DevfuncCode, DevfuncProfile } from '../../features/devfunc-profile/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
import ViewModeToggle from '@/components/custom/ViewModeToggle';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '프로파일', path: '/ipron/profile' }, { title: '기능코드 프로파일', path: '/ipron/profile/devfunc-profile' }];

export default function DevfuncProfileManage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();

  // ctx 테넌트 (JWT — 사용자 본인 테넌트)
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): 전체 테넌트 조회 / 대행(actAsTenantId=X): X 대행 스코프
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const opTenantId = actAsTenantId ? Number(actAsTenantId) : null;
  // 조회/등록 스코프: 일반=활성테넌트 / 운영자=대행테넌트(null=전체).
  const selectedTenantId = operatorMode ? opTenantId : ctxTenantId;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [cardCollapsed, setCardCollapsed] = useState(true);
  // 프로파일 목록 표기방식(카드형/리스트형) — localStorage 유지. 화면키는 기능코드 프로파일 전용.
  const [viewMode, setViewMode] = useViewMode('ipron-devfunc-profile');
  const [codeSearchCode, setCodeSearchCode] = useState('');
  const [codeSearchName, setCodeSearchName] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);
  // 리스트형 프로파일 그리드 api — 선택 행 강조(rowClassRules)는 데이터 변경 시에만 재평가되므로 수동 redraw 가 필요하다.
  const profileGridApiRef = useRef<GridApi<DevfuncProfile> | null>(null);

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const profileDrawerRef = useRef<DevfuncProfileDrawerRef>(null);
  const codeDrawerRef = useRef<DevfuncCodeDrawerRef>(null);
  const copyDialogRef = useRef<DevfuncProfileCopyDialogRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: profiles = [] } = useGetProfiles();
  const { data: tenants = [] } = useGetTenants();
  const { data: codes = [], isLoading: isCodesLoading } = useGetCodes({
    params: selectedProfileId
      ? {
          profileId: selectedProfileId,
          ...(codeSearchCode.trim() ? { devfuncCode: codeSearchCode.trim() } : {}),
          ...(codeSearchName.trim() ? { devfuncCodeName: codeSearchName.trim() } : {}),
        }
      : undefined,
    queryOptions: { enabled: !!selectedProfileId },
  });

  // ─── Derived data ───────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const searchFilteredProfiles = useMemo(() => {
    if (!isSearching) return profiles;
    const kw = searchText.trim().toLowerCase();
    return profiles.filter((p) => p.devfuncCodeProfileName.toLowerCase().includes(kw));
  }, [profiles, isSearching, searchText]);

  const filteredProfiles = useMemo(
    () => (isSearching || selectedTenantId === null ? searchFilteredProfiles : searchFilteredProfiles.filter((p) => p.tenantId === selectedTenantId)),
    [searchFilteredProfiles, selectedTenantId, isSearching],
  );

  const selectedProfile = useMemo(() => profiles.find((p) => p.devfuncCodeProfileId === selectedProfileId) ?? null, [profiles, selectedProfileId]);

  // 헤더 요약 — 현재 스코프(전체=합계 / 특정 테넌트=해당)의 프로파일/기능코드 수.
  const summary = useMemo(() => {
    const scoped = selectedTenantId == null ? profiles : profiles.filter((p) => p.tenantId === selectedTenantId);
    return scoped.reduce((a, p) => ({ profiles: a.profiles + 1, codes: a.codes + (p.codeCount ?? 0) }), { profiles: 0, codes: 0 });
  }, [profiles, selectedTenantId]);

  // ─── Auto-select ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedProfileId && filteredProfiles.length > 0) {
      setSelectedProfileId(filteredProfiles[0].devfuncCodeProfileId);
    }
  }, [filteredProfiles, selectedProfileId]);

  // ─── 리스트형 선택 행 강조 갱신 ─────────────────────────────────────────
  // rowClassRules 는 외부 state 변경을 감지하지 못하므로 선택이 바뀌면 직접 redraw 한다.
  useEffect(() => {
    if (viewMode === VIEW_MODE.LIST) profileGridApiRef.current?.redrawRows();
  }, [selectedProfileId, viewMode]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim()) {
      setSelectedProfileId(null);
    }
  }, []);

  const handleCardSelect = useCallback((profile: DevfuncProfile) => {
    setSelectedProfileId(profile.devfuncCodeProfileId);
    setCodeSearchCode('');
    setCodeSearchName('');
  }, []);

  // ─── Invalidate helpers ─────────────────────────────────────────────────────
  const invalidateProfiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: devfuncProfileQueryKeys.getProfiles().queryKey });
  }, [queryClient]);

  const invalidateCodes = useCallback(() => {
    // 검색 파라미터 조합이 여러 cache entry를 만들 수 있으므로 getCodes 전체를 무효화
    queryClient.invalidateQueries({
      queryKey: devfuncProfileQueryKeys.getCodes().queryKey,
    });
  }, [queryClient]);

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
        toast.success('기능코드가 등록되었습니다');
        codeDrawerRef.current?.close();
        invalidateAll();
      },
    },
  });

  const { mutate: updateCode, isPending: isUpdatingCode } = useUpdateCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('기능코드가 수정되었습니다');
        codeDrawerRef.current?.close();
        invalidateCodes();
      },
    },
  });

  const { mutate: deleteCode } = useDeleteCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('기능코드가 삭제되었습니다');
        invalidateAll();
      },
    },
  });

  // ─── Profile actions ───────────────────────────────────────────────────────
  const handleProfileCreate = () => {
    if (selectedTenantId == null) {
      toast.warning('대행할 테넌트를 먼저 선택하세요');
      return;
    }
    profileDrawerRef.current?.open(null, selectedTenantId);
  };

  const handleProfileEdit = (profile: DevfuncProfile) => {
    profileDrawerRef.current?.open(profile);
  };

  const handleProfileDelete = (profile: DevfuncProfile) => {
    modal.confirm.execute({
      onOk: () => deleteProfile({ id: profile.devfuncCodeProfileId }),
      options: {
        title: '프로파일 삭제',
        content: `"${profile.devfuncCodeProfileName}" 프로파일을 삭제하시겠습니까?`,
      },
    });
  };

  const handleProfileCopy = (profile: DevfuncProfile) => {
    copyDialogRef.current?.open(profile);
  };

  // ─── Code actions ──────────────────────────────────────────────────────────
  const handleCodeCreate = () => {
    codeDrawerRef.current?.open();
  };

  const handleCodeEdit = (code: DevfuncCode) => {
    codeDrawerRef.current?.open(code);
  };

  const handleCodeDelete = (code: DevfuncCode) => {
    modal.confirm.execute({
      onOk: () =>
        deleteCode({
          profileId: code.devfuncCodeProfileId,
          code: code.devfuncCode,
        }),
      options: {
        title: '기능코드 삭제',
        content: `"${code.devfuncCodeName}" (${code.devfuncCode}) 코드를 삭제하시겠습니까?`,
      },
    });
  };

  // ─── Search ─────────────────────────────────────────────────────────────────
  // ─── Profile dropdown menu ─────────────────────────────────────────────────
  const getProfileMenuItems = (profile: DevfuncProfile) => [
    { key: 'edit', label: '수정', icon: <Edit3 className="size-4" />, onClick: () => handleProfileEdit(profile) },
    { key: 'copy', label: '복사', icon: <Copy className="size-4" />, onClick: () => handleProfileCopy(profile) },
    { key: 'delete', label: '삭제', icon: <Trash2 className="size-4" />, danger: true, onClick: () => handleProfileDelete(profile) },
  ];

  // ─── ag-Grid: 프로파일 columns (리스트형 목록) ──────────────────────────
  // 카드가 보여주는 정보와 동일한 항목 구성. 액션 컬럼은 카드 더보기 메뉴를 그대로 재사용한다.
  const profileColumnDefs: ColDef<DevfuncProfile>[] = [
    {
      headerName: '프로파일명',
      field: 'devfuncCodeProfileName',
      flex: 2,
      minWidth: 160,
      tooltipField: 'devfuncCodeProfileName',
    },
    {
      headerName: '테넌트',
      colId: 'tenantName',
      flex: 1,
      minWidth: 120,
      valueGetter: (params) => {
        if (!params.data) return null;
        return params.data.tenantName ?? tenants.find((t) => t.tenantId === params.data!.tenantId)?.tenantName ?? `Tenant ${params.data.tenantId}`;
      },
    },
    {
      headerName: '기능코드',
      field: 'codeCount',
      flex: 0.8,
      minWidth: 100,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params) => `${params.data?.codeCount ?? 0}건`,
    },
    {
      headerName: '',
      colId: 'actions',
      width: 56,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<DevfuncProfile>) => {
        if (!params.data) return null;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Dropdown menu={{ items: getProfileMenuItems(params.data) }} trigger={['click']} placement="bottomRight">
              <button type="button" className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                <MoreVertical className="size-3.5 text-gray-400" />
              </button>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  // ─── ag-Grid columns ──────────────────────────────────────────────────────
  const defaultColDef: ColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }),
    [],
  );

  const columnDefs: ColDef<DevfuncCode>[] = [
    {
      headerName: '기능코드',
      field: 'devfuncCode',
      minWidth: 100,
      maxWidth: 130,
      tooltipField: 'devfuncCode',
      cellRenderer: (params: ICellRendererParams<DevfuncCode>) => {
        if (!params.data) return null;
        return <span className="font-semibold text-gray-800 font-mono text-sm">{params.data.devfuncCode}</span>;
      },
    },
    {
      headerName: '코드명',
      field: 'devfuncCodeName',
      flex: 1,
      tooltipField: 'devfuncCodeName',
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
      headerName: '설명',
      field: 'devfuncCodeDesc',
      flex: 1,
      tooltipField: 'devfuncCodeDesc',
      valueFormatter: (params) => params.value ?? '-',
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 헤더(스코프 선택 + 요약) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 운영자 모드: 대행 테넌트 선택(공통 ScopeSelect). 일반 콘솔은 브레드크럼이 화면명 표기. */}
            {operatorMode && (
              <ScopeSelect
                kind="tenant"
                options={tenants.map((t) => ({
                  id: t.tenantId,
                  name: t.tenantName ?? `테넌트 ${t.tenantId}`,
                  count: profiles.filter((p) => p.tenantId === t.tenantId).length,
                }))}
                value={actAsTenantId}
                onChange={(id) => {
                  setActAsTenant(id);
                  setSelectedProfileId(null);
                  setSearchText('');
                  setCodeSearchCode('');
                  setCodeSearchName('');
                }}
              />
            )}
            {/* 요약 — 프로파일/기능코드 (운영자는 선택 뒤, 일반은 좌측). */}
            <div className={`flex items-center gap-4 text-[13px] ${operatorMode ? 'ml-3 pl-3 border-l border-gray-200' : ''}`}>
              <span className="text-gray-500">
                총 프로파일 <b className="text-gray-800 font-semibold">{summary.profiles.toLocaleString()}</b>
              </span>
              <span className="text-gray-500">
                기능코드 <b className="text-[#405189] font-semibold">{summary.codes.toLocaleString()}</b>
              </span>
            </div>

            {/* 우측: 검색 + 추가 버튼 */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
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

        {/* ===== 카드 슬라이더 박스 (카드형 / 리스트형 — 선택은 localStorage 유지) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* 접기/펼치기 + 표기방식 토글 헤더 */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
            <button type="button" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors" onClick={() => setCardCollapsed((c) => !c)}>
              <span>프로파일 카드</span>
              <span className="text-gray-400">{cardCollapsed ? '펼치기' : '접기'}</span>
            </button>
            <span className="text-xs text-gray-400">{filteredProfiles.length}</span>
            <div className="ml-auto">
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
          {/* 목록 본문 — 카드형은 가로 슬라이더, 리스트형은 ag-Grid */}
          {!cardCollapsed && (
            <div className={`flex items-center px-4 py-3 ${viewMode === VIEW_MODE.CARD ? 'h-[170px]' : 'h-[240px]'}`}>
              {filteredProfiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
                  <Empty description={false} imageStyle={{ height: 40 }} />
                  <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : '등록된 프로파일이 없습니다'}</span>
                </div>
              ) : viewMode === VIEW_MODE.LIST ? (
                // 리스트형 — ag-Grid. 선택 행은 rowClassRules 로 강조하고, 더블클릭 시 수정 Drawer 를 연다.
                <div className="w-full h-full">
                  <AgGridReact<DevfuncProfile>
                    rowData={filteredProfiles}
                    columnDefs={profileColumnDefs}
                    gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                    getRowId={(params) => String(params.data.devfuncCodeProfileId)}
                    defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
                    rowClassRules={{ 'bg-[#405189]/5': (params) => params.data?.devfuncCodeProfileId === selectedProfileId }}
                    onGridReady={(e) => {
                      profileGridApiRef.current = e.api;
                    }}
                    onRowClicked={(e) => {
                      if (e.data) handleCardSelect(e.data);
                    }}
                    onRowDoubleClicked={(e) => {
                      if (e.data) handleProfileEdit(e.data);
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
                    {filteredProfiles.map((profile) => {
                      const isCardSelected = selectedProfileId === profile.devfuncCodeProfileId;
                      const tenantName = profile.tenantName ?? tenants.find((t) => t.tenantId === profile.tenantId)?.tenantName ?? `Tenant ${profile.tenantId}`;
                      return (
                        <div
                          key={profile.devfuncCodeProfileId}
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
                          {/* Card header: 프로파일명 + 더보기 */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-gray-800 truncate">{profile.devfuncCodeProfileName}</span>
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
                              <Building2 className="size-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{tenantName}</span>
                            </div>
                            <div>기능코드: {profile.codeCount ?? 0}건</div>
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

        {/* ===== 하단: 기능코드 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {selectedProfile ? (
            <>
              {/* Grid header */}
              <div className="px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">
                  {selectedProfile.devfuncCodeProfileName} 기능코드 ({codes.length}건)
                </span>
                <Button icon={<Plus className="size-3.5" />} onClick={handleCodeCreate}>
                  등록
                </Button>
              </div>

              {/* 코드 검색 바 (SWAT IPR20S2240.jsp 기능코드/코드명 LIKE 검색) */}
              <div className="px-5 py-2 flex items-center gap-2 flex-shrink-0 border-b border-gray-100">
                <Input
                  allowClear
                  prefix={<Search className="size-3.5 text-gray-400" />}
                  placeholder="기능코드 검색"
                  value={codeSearchCode}
                  onChange={(e) => setCodeSearchCode(e.target.value)}
                  style={{ width: 180 }}
                  size="small"
                />
                <Input
                  allowClear
                  prefix={<Search className="size-3.5 text-gray-400" />}
                  placeholder="코드명 검색"
                  value={codeSearchName}
                  onChange={(e) => setCodeSearchName(e.target.value)}
                  style={{ width: 200 }}
                  size="small"
                />
              </div>

              {/* ag-Grid */}
              <div className="flex-1">
                <AgGridReact<DevfuncCode>
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
      <DevfuncProfileDrawer
        ref={profileDrawerRef}
        tenants={tenants}
        onCreate={(data) => createProfile(data)}
        onUpdate={(id, data) => updateProfile({ id, data })}
        isLoading={isCreatingProfile || isUpdatingProfile}
      />

      <DevfuncCodeDrawer
        ref={codeDrawerRef}
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

      <DevfuncProfileCopyDialog ref={copyDialogRef} tenants={tenants} onCopy={(profileId, data) => copyProfile({ id: profileId, data })} isLoading={isCopyingProfile} />
    </div>
  );
}
