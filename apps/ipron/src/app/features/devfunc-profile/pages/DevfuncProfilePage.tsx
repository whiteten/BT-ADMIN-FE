/**
 * 전화기능코드 프로파일 관리 메인 페이지
 * Pattern: 좌측 테넌트 트리 (280px) + 우측 상단 카드 슬라이더 (프로파일) + 우측 하단 ag-Grid (전화기능코드)
 *
 * Layout:
 * ┌────────────┬─────────────────────────────────────────┐
 * │ 테넌트 트리  │ 카드 슬라이더 (프로파일)                   │
 * │ (280px)    │ ┌────┐ ┌────┐ ┌────┐                    │
 * │            │ │prof│ │prof│ │prof│                    │
 * │ ▼ 테넌트1   │ └────┘ └────┘ └────┘                    │
 * │ ▼ 테넌트2   │ [+ 프로파일 추가]                         │
 * │            ├─────────────────────────────────────────┤
 * │            │ 전화기능코드 ag-Grid (선택 프로파일의 코드)   │
 * │            │ [+ 코드 추가]                             │
 * └────────────┴─────────────────────────────────────────┘
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input } from 'antd';
import { Building2, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon, Copy, Edit3, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import DevfuncCodeDrawer, { type DevfuncCodeDrawerRef } from '../components/DevfuncCodeDrawer';
import DevfuncProfileCopyDialog, { type DevfuncProfileCopyDialogRef } from '../components/DevfuncProfileCopyDialog';
import DevfuncProfileDrawer, { type DevfuncProfileDrawerRef } from '../components/DevfuncProfileDrawer';
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
} from '../hooks/useDevfuncProfileQueries';
import type { DevfuncCode, DevfuncProfile, TenantProfileGroup } from '../types/devfuncProfile.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '프로파일 관리', path: '/ipron/profile/devfunc-profile' },
  { title: '전화기능코드 프로파일', path: '/ipron/profile/devfunc-profile' },
];

export default function DevfuncProfilePage() {
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [collapsedTenants, setCollapsedTenants] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);

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
          ...(searchCode ? { devfuncCode: searchCode } : {}),
          ...(searchName ? { devfuncCodeName: searchName } : {}),
        }
      : undefined,
    queryOptions: {
      enabled: !!selectedProfileId,
    },
  });

  // ─── Derived data ───────────────────────────────────────────────────────────
  const tenantProfileGroups: TenantProfileGroup[] = useMemo(() => {
    const tenantMap = new Map<number, TenantProfileGroup>();

    // 테넌트 목록 초기화
    for (const tenant of tenants) {
      tenantMap.set(tenant.tenantId, {
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        profiles: [],
      });
    }

    // 프로파일을 테넌트별로 그룹핑
    for (const profile of profiles) {
      let group = tenantMap.get(profile.tenantId);
      if (!group) {
        group = { tenantId: profile.tenantId, tenantName: profile.tenantName || `Tenant ${profile.tenantId}`, profiles: [] };
        tenantMap.set(profile.tenantId, group);
      }
      group.profiles.push(profile);
    }

    // 프로파일이 있는 테넌트만 표시
    return Array.from(tenantMap.values())
      .filter((g) => g.profiles.length > 0)
      .sort((a, b) => a.tenantId - b.tenantId);
  }, [tenants, profiles]);

  const selectedProfile = useMemo(() => {
    for (const group of tenantProfileGroups) {
      const found = group.profiles.find((p) => p.devfuncCodeProfileId === selectedProfileId);
      if (found) return found;
    }
    return null;
  }, [tenantProfileGroups, selectedProfileId]);

  /** Tenants with profile count (for the left tree), filtered by search */
  const tenantList = useMemo(() => {
    if (!searchText) return tenantProfileGroups;
    const lower = searchText.toLowerCase();
    return tenantProfileGroups
      .map((group) => ({
        ...group,
        profiles: group.profiles.filter((p) => p.devfuncCodeProfileName.toLowerCase().includes(lower)),
      }))
      .filter((group) => group.tenantName.toLowerCase().includes(lower) || group.profiles.length > 0);
  }, [tenantProfileGroups, searchText]);

  /** Profiles filtered by selected tenant */
  const filteredProfiles = useMemo(() => {
    if (!selectedTenantId) return [];
    const group = tenantProfileGroups.find((g) => g.tenantId === selectedTenantId);
    return group?.profiles ?? [];
  }, [tenantProfileGroups, selectedTenantId]);

  /** Selected tenant name */
  const selectedTenantName = useMemo(() => {
    const group = tenantProfileGroups.find((g) => g.tenantId === selectedTenantId);
    return group?.tenantName ?? '';
  }, [tenantProfileGroups, selectedTenantId]);

  // ─── Auto-select first tenant on load ────────────────────────────────────────
  useEffect(() => {
    if (tenantProfileGroups.length > 0 && selectedTenantId === null) {
      setSelectedTenantId(tenantProfileGroups[0].tenantId);
    }
  }, [tenantProfileGroups, selectedTenantId]);

  // ─── Auto-select first profile when tenant changes ───────────────────────────
  useEffect(() => {
    if (selectedTenantId) {
      const group = tenantProfileGroups.find((g) => g.tenantId === selectedTenantId);
      const profs = group?.profiles ?? [];
      if (profs.length > 0) {
        setSelectedProfileId(profs[0].devfuncCodeProfileId);
      } else {
        setSelectedProfileId(null);
      }
    }
  }, [selectedTenantId, tenantProfileGroups]);

  // ─── Invalidate helpers ─────────────────────────────────────────────────────
  const invalidateProfiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: devfuncProfileQueryKeys.getProfiles().queryKey });
  }, [queryClient]);

  const invalidateCodes = useCallback(() => {
    if (selectedProfileId) {
      queryClient.invalidateQueries({
        queryKey: devfuncProfileQueryKeys.getCodes({ profileId: selectedProfileId }).queryKey,
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
        toast.success('전화기능코드가 등록되었습니다.');
        codeDrawerRef.current?.close();
        invalidateAll();
      },
    },
  });

  const { mutate: updateCode, isPending: isUpdatingCode } = useUpdateCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('전화기능코드가 수정되었습니다.');
        codeDrawerRef.current?.close();
        invalidateCodes();
      },
    },
  });

  const { mutate: deleteCode } = useDeleteCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('전화기능코드가 삭제되었습니다.');
        invalidateAll();
      },
    },
  });

  // ─── Tenant selection ───────────────────────────────────────────────────────
  const toggleTenantGroup = (tenantId: number) => {
    setCollapsedTenants((prev) => {
      const next = new Set(prev);
      if (next.has(tenantId)) {
        next.delete(tenantId);
      } else {
        next.add(tenantId);
      }
      return next;
    });
  };

  const handleTenantSelect = (tenantId: number) => {
    setSelectedTenantId(tenantId);
  };

  // ─── Profile actions ───────────────────────────────────────────────────────
  const handleProfileCreate = () => {
    profileDrawerRef.current?.open(null, selectedTenantId ?? undefined);
  };

  const handleProfileEdit = (profile: DevfuncProfile) => {
    profileDrawerRef.current?.open(profile);
  };

  const handleProfileDelete = (profile: DevfuncProfile) => {
    modal.confirm.execute({
      onOk: () => deleteProfile({ id: profile.devfuncCodeProfileId }),
      options: {
        title: '프로파일 삭제',
        content: `"${profile.devfuncCodeProfileName}" 프로파일을 삭제하시겠습니까?\n하위 전화기능코드도 함께 삭제됩니다.`,
      },
    });
  };

  const handleProfileCopy = (profile: DevfuncProfile) => {
    copyDialogRef.current?.open(profile);
  };

  const handleProfileSelect = (profileId: number) => {
    setSelectedProfileId(profileId);
    setSearchCode('');
    setSearchName('');
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
        title: '전화기능코드 삭제',
        content: `"${code.devfuncCodeName}" (${code.devfuncCode}) 코드를 삭제하시겠습니까?`,
      },
    });
  };

  // ─── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = () => {
    invalidateCodes();
  };

  const handleSearchReset = () => {
    setSearchCode('');
    setSearchName('');
    setTimeout(() => invalidateCodes(), 0);
  };

  // ─── Profile dropdown menu ─────────────────────────────────────────────────
  const getProfileMenuItems = (profile: DevfuncProfile) => [
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

  const columnDefs: ColDef<DevfuncCode>[] = [
    {
      headerName: '기능코드',
      field: 'devfuncCode',
      minWidth: 100,
      maxWidth: 130,
      cellRenderer: (params: ICellRendererParams<DevfuncCode>) => {
        if (!params.data) return null;
        return <span className="font-semibold text-gray-800 font-mono text-sm">{params.data.devfuncCode}</span>;
      },
    },
    {
      headerName: '코드명',
      field: 'devfuncCodeName',
      flex: 1,
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
      valueFormatter: (params) => params.value ?? '-',
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<DevfuncCode>) => {
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
        {/* ===== Left Panel: Tenant Tree (280px) ===== */}
        <div className="w-[280px] min-w-[280px] bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <Input placeholder="프로파일명 검색" size="small" allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {tenantList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-4">
                <span className="text-sm">{searchText ? '검색 결과가 없습니다' : '등록된 테넌트가 없습니다'}</span>
              </div>
            ) : (
              tenantList.map((group) => {
                const isCollapsed = collapsedTenants.has(group.tenantId);
                const isTenantSelected = selectedTenantId === group.tenantId;
                return (
                  <div key={group.tenantId} className="mb-0.5">
                    {/* Tenant group header */}
                    <button
                      type="button"
                      className={`w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none text-[13px] font-semibold transition-colors border-l-[3px] ${
                        isTenantSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189]' : 'border-l-transparent text-gray-800 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        handleTenantSelect(group.tenantId);
                        if (isCollapsed) toggleTenantGroup(group.tenantId);
                      }}
                    >
                      <span
                        role="button"
                        className="p-0 bg-transparent border-none cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTenantGroup(group.tenantId);
                        }}
                      >
                        {isCollapsed ? (
                          <ChevronRightIcon className="size-3.5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="size-3.5 text-gray-400 flex-shrink-0" />
                        )}
                      </span>
                      <Building2 className="size-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate flex-1 text-left">{group.tenantName}</span>
                      <span className="ml-auto text-[11px] text-gray-400 font-normal">{group.profiles.length}</span>
                    </button>

                    {/* Profile items under tenant */}
                    {!isCollapsed && (
                      <div>
                        {group.profiles.map((profile) => {
                          const isItemSelected = selectedProfileId === profile.devfuncCodeProfileId;
                          const dotColor = isItemSelected ? 'bg-[#405189]' : profile.codeCount > 0 ? 'bg-green-500' : 'bg-gray-300';
                          return (
                            <div
                              key={profile.devfuncCodeProfileId}
                              className={`group flex items-center gap-2 pl-[42px] pr-2 py-1.5 cursor-pointer text-[12px] transition-colors border-l-[3px] ${
                                isItemSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189] font-medium' : 'border-l-transparent text-gray-500 hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                setSelectedTenantId(profile.tenantId);
                                handleProfileSelect(profile.devfuncCodeProfileId);
                              }}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                              <span className="truncate flex-1">{profile.devfuncCodeProfileName}</span>
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
          {selectedTenantId ? (
            <>
              {/* ── Top: Card Slider Area ── */}
              <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
                {/* Card slider header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">
                      {selectedTenantName} 프로파일 ({filteredProfiles.length}건)
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
                      <span className="text-sm">이 테넌트에 등록된 프로파일이 없습니다</span>
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
                          return (
                            <div
                              key={profile.devfuncCodeProfileId}
                              className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all min-w-[220px] max-w-[260px] flex-shrink-0 ${
                                isCardSelected
                                  ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                                  : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                              }`}
                              onClick={() => handleProfileSelect(profile.devfuncCodeProfileId)}
                              onDoubleClick={() => handleProfileEdit(profile)}
                            >
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
                              <div className="text-xs text-gray-500">
                                <div>테넌트: {profile.tenantName}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        type="text"
                        icon={<ChevronRightIcon className="size-5" />}
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
                        {selectedProfile.devfuncCodeProfileName} 전화기능코드 ({codes.length}건)
                      </span>
                      <Button size="small" icon={<Plus className="size-3.5" />} onClick={handleCodeCreate}>
                        코드 추가
                      </Button>
                    </div>

                    {/* Search bar */}
                    <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
                      <Input placeholder="기능코드" value={searchCode} onChange={(e) => setSearchCode(e.target.value)} onPressEnter={handleSearch} className="w-[120px]" size="small" />
                      <Input placeholder="코드명" value={searchName} onChange={(e) => setSearchName(e.target.value)} onPressEnter={handleSearch} className="w-[140px]" size="small" />
                      <Button size="small" icon={<Search className="size-3.5" />} onClick={handleSearch}>
                        검색
                      </Button>
                      <Button size="small" onClick={handleSearchReset}>
                        초기화
                      </Button>
                    </div>

                    {/* ag-Grid (no pagination) */}
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
            </>
          ) : (
            <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
              <Empty description={false} />
              <span className="text-sm">좌측에서 테넌트를 선택하세요</span>
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
