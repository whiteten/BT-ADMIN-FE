/**
 * 접근코드 프로파일 관리 메인 페이지
 *
 * 멀티테넌트 개편(상담사 관리/내선프로파일 정합): byNode/byTenant 뷰전환 + 탭바 제거
 *   → 상단에 노드 Select + 테넌트 ScopeSelect 두 필터(각 "전체" 포함) + 요약.
 *   프로파일은 전량 클라이언트 로드 → 노드/테넌트/검색 클라이언트 필터한 결과를 카드 슬라이더로 노출.
 *   카드 선택 시 하단 접근코드 ag-Grid(서버 조회) 표시.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [노드▼] [테넌트▼]  총 N건       🔍[검색] [+등록]        │ ← 헤더
 * │ [P1][P2][P3] ... (필터된 프로파일 카드 슬라이더)         │ ← 카드
 * ├──────────────────────────────────────────────────────┤
 * │ {프로파일명} 접근코드 (n건)                 [+코드 추가] │
 * │ ag-Grid                                               │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input, Select } from 'antd';
import { Copy, Edit3, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
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
import ScopeSelect from '@/components/custom/ScopeSelect';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '프로파일', path: '/ipron/profile' }, { title: '접근코드 프로파일', path: '/ipron/profile/access-profile' }];

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
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null); // null=전체 노드
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null); // null=전체 테넌트
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  // 하단 접근코드 그리드 서버사이드 검색 (SWAT IPR20S2250 sAccessCode / sAccessCodeName)
  const [codeSearchCode, setCodeSearchCode] = useState('');
  const [codeSearchName, setCodeSearchName] = useState('');

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const profileDrawerRef = useRef<AccessProfileDrawerRef>(null);
  const codeDrawerRef = useRef<AccessCodeDrawerRef>(null);
  const copyDialogRef = useRef<AccessProfileCopyDialogRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: profiles = [] } = useGetProfiles();
  const { data: tenants = [] } = useGetTenants();
  const { data: nodes = [] } = useGetNodes();
  const { data: nodeTenants = [] } = useGetNodeTenants();

  // 노드-테넌트에 할당된 노드만 (노드 셀렉트 옵션)
  const assignedNodes = useMemo(() => {
    const nodeIds = new Set(nodeTenants.map((nt) => nt.nodeId));
    return nodes.filter((n) => nodeIds.has(n.nodeId));
  }, [nodes, nodeTenants]);

  // 프로파일 보유 테넌트 목록 (테넌트 셀렉트 옵션)
  const assignedTenants = useMemo(() => {
    const ids = new Set(profiles.map((p) => p.tenantId));
    return tenants.filter((t) => ids.has(t.tenantId));
  }, [profiles, tenants]);

  const codeSearchParams = useMemo(() => {
    if (!selectedProfileId) return undefined;
    const params: Record<string, unknown> = { profileId: selectedProfileId };
    if (codeSearchCode.trim()) params.accessCode = codeSearchCode.trim();
    if (codeSearchName.trim()) params.accessCodeName = codeSearchName.trim();
    return params;
  }, [selectedProfileId, codeSearchCode, codeSearchName]);

  const { data: codes = [], isLoading: isCodesLoading } = useGetCodes({
    params: codeSearchParams,
    queryOptions: { enabled: !!selectedProfileId },
  });

  // ─── Derived — 노드/테넌트/검색 클라이언트 필터 ─────────────────────────────────
  const filteredProfiles = useMemo(() => {
    let list = profiles;
    if (selectedNodeId != null) list = list.filter((p) => p.nodeId === selectedNodeId);
    if (selectedTenantId != null) list = list.filter((p) => p.tenantId === selectedTenantId);
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      list = list.filter((p) => [p.accessCodeProfileName, p.nodeName, p.tenantName].some((v) => v?.toString().toLowerCase().includes(kw)));
    }
    return list;
  }, [profiles, selectedNodeId, selectedTenantId, searchText]);

  // 헤더 요약 — 현재 필터 기준 총 프로파일 / 접근코드 보유.
  const summary = useMemo(() => {
    const withCode = filteredProfiles.filter((p) => (p.codeCount ?? 0) > 0).length;
    return { total: filteredProfiles.length, withCode };
  }, [filteredProfiles]);

  const selectedProfile = useMemo(() => profiles.find((p) => p.accessCodeProfileId === selectedProfileId) ?? null, [profiles, selectedProfileId]);

  // 선택 프로파일의 노드 기준 라우트 로딩 (코드 Drawer에서 사용)
  const { data: routesForSelectedNode = [], isLoading: isRoutesLoading } = useGetRoutesByNode(selectedProfile?.nodeId ?? null);

  const routeOptionsForSelectedNode = useMemo(() => routesForSelectedNode.map((r) => ({ label: r.routeName, value: r.routeId })), [routesForSelectedNode]);

  // ─── Auto-select ────────────────────────────────────────────────────────────
  // 필터된 목록에서 프로파일 자동 선택 (선택 항목이 필터에서 빠지면 첫 항목으로)
  useEffect(() => {
    if (selectedProfileId && filteredProfiles.some((p) => p.accessCodeProfileId === selectedProfileId)) return;
    setSelectedProfileId(filteredProfiles[0]?.accessCodeProfileId ?? null);
  }, [filteredProfiles, selectedProfileId]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleCardSelect = useCallback((profile: AccessProfile) => {
    setSelectedProfileId(profile.accessCodeProfileId);
    setCodeSearchCode('');
    setCodeSearchName('');
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
        toast.success('접근코드가 등록되었습니다');
        codeDrawerRef.current?.close();
        invalidateAll();
      },
    },
  });

  const { mutate: updateCode, isPending: isUpdatingCode } = useUpdateCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('접근코드가 수정되었습니다');
        codeDrawerRef.current?.close();
        invalidateCodes();
      },
    },
  });

  const { mutate: deleteCode } = useDeleteCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('접근코드가 삭제되었습니다');
        invalidateAll();
      },
    },
  });

  // ─── Profile actions ───────────────────────────────────────────────────────
  const handleProfileCreate = () => {
    // Drawer signature: open(profile, tenantId, nodeId) — 현재 필터를 기본값으로 전달
    profileDrawerRef.current?.open(null, selectedTenantId ?? undefined, selectedNodeId ?? undefined);
  };

  const handleProfileEdit = (profile: AccessProfile) => {
    profileDrawerRef.current?.open(profile);
  };

  const handleProfileDelete = (profile: AccessProfile) => {
    modal.confirm.execute({
      onOk: () => deleteProfile({ id: profile.accessCodeProfileId }),
      options: {
        title: '프로파일 삭제',
        content: `"${profile.accessCodeProfileName}" 프로파일을 삭제하시겠습니까?`,
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
      tooltipField: 'accessCodeName',
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
      tooltipField: 'routeName',
    },
    {
      headerName: '설명',
      field: 'accessCodeDesc',
      flex: 1,
      valueFormatter: (params) => params.value ?? '-',
      tooltipField: 'accessCodeDesc',
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 박스1: 헤더 (노드/테넌트 스코프 + 요약 + 검색/등록) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 노드 필터 */}
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select
                size="small"
                variant="borderless"
                value={selectedNodeId ?? '__all__'}
                onChange={(v) => setSelectedNodeId(v === '__all__' ? null : Number(v))}
                options={[{ value: '__all__', label: '전체 노드' }, ...assignedNodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))]}
                style={{ width: 150 }}
                popupMatchSelectWidth={false}
              />
            </div>
            {/* 테넌트 필터 */}
            <ScopeSelect
              kind="tenant"
              options={assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName ?? `테넌트 ${t.tenantId}` }))}
              value={selectedTenantId == null ? null : String(selectedTenantId)}
              onChange={(id) => {
                setSelectedTenantId(id == null ? null : Number(id));
                setSelectedProfileId(null);
              }}
            />
            {/* 요약 — 총/코드등록 */}
            <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">
                총 프로파일 <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
              </span>
              <span className="text-gray-500">
                코드등록 <b className="text-green-600 font-semibold">{summary.withCode.toLocaleString()}</b>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="프로파일 검색"
                value={searchText}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleProfileCreate}>
                등록
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 박스2: 프로파일 카드 슬라이더 (필터된 프로파일) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center h-[170px] px-4 py-3">
            <div className="flex gap-3 overflow-x-auto py-2 px-1 w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {filteredProfiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                  <Empty description={false} imageStyle={{ height: 40 }} />
                  <span className="text-sm">{searchText.trim() ? '검색 결과가 없습니다' : '조건에 해당하는 프로파일이 없습니다'}</span>
                </div>
              ) : (
                filteredProfiles.map((profile) => {
                  const isCardSelected = selectedProfileId === profile.accessCodeProfileId;
                  const codeCount = profile.codeCount ?? 0;
                  return (
                    <div
                      key={profile.accessCodeProfileId}
                      id={`access-profile-card-${profile.accessCodeProfileId}`}
                      className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[180px] h-[130px] flex-shrink-0 flex flex-col ${
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

                      {/* 메타 — 노드 · 테넌트 */}
                      <div className="text-[11px] text-gray-500 truncate" title={`${profile.nodeName} · ${profile.tenantName}`}>
                        {profile.nodeName} · {profile.tenantName}
                      </div>

                      {/* 하단 태그 — 접근코드 건수 */}
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
                })
              )}
            </div>
          </div>
        </div>

        {/* ===== 하단: 접근코드 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {selectedProfile ? (
            <>
              {/* Grid header */}
              <div className="px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-gray-100 gap-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-800 flex-shrink-0">
                  {selectedProfile.accessCodeProfileName} 접근코드 ({codes.length}건)
                </span>
                {/* 접근코드 / 코드명 서버사이드 검색 (SWAT sAccessCode / sAccessCodeName) */}
                <div className="flex items-center gap-2 ml-auto">
                  <Input
                    allowClear
                    prefix={<Search className="size-3.5 text-gray-400" />}
                    placeholder="접근코드 검색"
                    value={codeSearchCode}
                    onChange={(e) => setCodeSearchCode(e.target.value)}
                    style={{ width: 160 }}
                    size="small"
                  />
                  <Input
                    allowClear
                    prefix={<Search className="size-3.5 text-gray-400" />}
                    placeholder="코드명 검색"
                    value={codeSearchName}
                    onChange={(e) => setCodeSearchName(e.target.value)}
                    style={{ width: 160 }}
                    size="small"
                  />
                  <Button icon={<Plus className="size-3.5" />} onClick={handleCodeCreate}>
                    등록
                  </Button>
                </div>
              </div>

              {/* ag-Grid */}
              <div className="flex-1 min-h-0">
                <AgGridReact<AccessCode>
                  rowData={codes}
                  columnDefs={columnDefs}
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
