/**
 * 내선 프로파일 관리 목록 페이지 (IPR20S2220)
 * Pattern: 상단 노드 탭 + 테넌트 카드 슬라이더 + 하단 ag-Grid (프로파일 목록)
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [←] [Node1(n)] [Node2(n)] [→]  🔍[검색] [+등록]      │ ← 노드 탭 바
 * │ [테넌트A 카드] [테넌트B 카드] [테넌트C 카드] ...       │ ← 테넌트 카드 슬라이더 (L 220×130)
 * ├──────────────────────────────────────────────────────┤
 * │ {테넌트명} 내선 프로파일 (n건)                         │
 * │ ag-Grid (선택 테넌트의 프로파일 목록)                   │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Empty, Input } from 'antd';
import { ArrowUpDown, Building2, ChevronLeft, ChevronRight, Network, Plus, Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { dnQueryKeys } from '../../features/dn/hooks/useDnQueries';
import DnAssignDialog from '../../features/dn-profile/components/DnAssignDialog';
import DnProfileTable from '../../features/dn-profile/components/DnProfileTable';
import { dnProfileQueryKeys, useDeleteDnProfile, useGetDnProfileNodeTenants, useGetDnProfileNodes, useGetDnProfiles } from '../../features/dn-profile/hooks/useDnProfileQueries';
import type { DnProfile } from '../../features/dn-profile/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '프로파일 관리', path: '/ipron/profile/dn-profile' },
  { title: '내선 프로파일', path: '/ipron/profile/dn-profile' },
];

export default function DnProfileList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'byNode' | 'byTenant'>('byNode'); // byNode: 탭=노드, 카드=테넌트 / byTenant: 반대
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  // DN 배정 다이얼로그
  const [assignDialogProfile, setAssignDialogProfile] = useState<DnProfile | null>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedNodeRef = useRef(false);
  const hasInitializedTenantRef = useRef(false);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: profiles = [], isLoading: isProfilesLoading } = useGetDnProfiles();
  const { data: nodes = [] } = useGetDnProfileNodes();
  const { data: nodeTenants = [] } = useGetDnProfileNodeTenants();

  // 노드-테넌트에 할당된 노드만 (탭용)
  const assignedNodes = useMemo(() => {
    const nodeIds = new Set(nodeTenants.map((nt) => nt.nodeId));
    return nodes.filter((n) => nodeIds.has(n.nodeId));
  }, [nodes, nodeTenants]);

  // 전체 프로파일 기준 테넌트 목록 (byTenant 모드 탭용)
  const assignedTenants = useMemo(() => {
    const map = new Map<number, { tenantId: number; tenantName: string }>();
    for (const p of profiles) {
      if (!map.has(p.tenantId)) {
        map.set(p.tenantId, { tenantId: p.tenantId, tenantName: p.tenantName ?? '-' });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [profiles]);

  // ─── Derived data ───────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const searchFilteredProfiles = useMemo(() => {
    if (!isSearching) return profiles;
    const kw = searchText.trim().toLowerCase();
    return profiles.filter((p) =>
      [p.dnProfileName, p.nodeName, p.tenantName, p.emergencyCodeProfileName, p.devfuncCodeProfileName, p.accessCodeProfileName, p.sipProfileName, p.localRouteName].some((val) =>
        val?.toString().toLowerCase().includes(kw),
      ),
    );
  }, [profiles, isSearching, searchText]);

  // 탭(1차 필터) 적용된 프로파일 목록 — viewMode에 따라 탭 필터 기준이 다름
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

  // 카드 그룹 — byNode 모드: 테넌트별 / byTenant 모드: 노드별
  const cardGroups = useMemo(() => {
    const map = new Map<
      number,
      {
        groupId: number;
        groupName: string;
        count: number;
        dnCount: number;
        trunkCount: number;
      }
    >();
    for (const p of filteredProfiles) {
      const key = viewMode === 'byNode' ? p.tenantId : p.nodeId;
      const name = (viewMode === 'byNode' ? p.tenantName : p.nodeName) ?? '-';
      if (!map.has(key)) {
        map.set(key, { groupId: key, groupName: name, count: 0, dnCount: 0, trunkCount: 0 });
      }
      const g = map.get(key)!;
      g.count += 1;
      if (p.dnProfileType === '0') g.dnCount += 1;
      else if (p.dnProfileType === '1') g.trunkCount += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [filteredProfiles, viewMode]);

  // 카드 선택 ID (byNode: 선택 테넌트 / byTenant: 선택 노드)
  const selectedCardId = viewMode === 'byNode' ? selectedTenantId : selectedNodeId;
  const setSelectedCardId = useCallback(
    (id: number) => {
      if (viewMode === 'byNode') setSelectedTenantId(id);
      else setSelectedNodeId(id);
    },
    [viewMode],
  );

  // 그리드 표시용 — 탭+카드 조합으로 2단 필터된 프로파일
  const profilesForGrid = useMemo(() => {
    if (isSearching) return filteredProfiles;
    if (selectedCardId === null) return filteredProfiles;
    return filteredProfiles.filter((p) => (viewMode === 'byNode' ? p.tenantId === selectedCardId : p.nodeId === selectedCardId));
  }, [filteredProfiles, selectedCardId, isSearching, viewMode]);

  const gridHeaderText = useMemo(() => {
    if (isSearching) return `검색 결과 (${filteredProfiles.length}건)`;
    const tabName =
      viewMode === 'byNode'
        ? selectedNodeId
          ? (nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? '선택 노드')
          : '전체'
        : selectedTenantId
          ? (assignedTenants.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? '선택 테넌트')
          : '전체';
    const cardGroup = cardGroups.find((g) => g.groupId === selectedCardId);
    if (cardGroup) {
      return `${tabName} / ${cardGroup.groupName} 내선 프로파일 (${profilesForGrid.length}건)`;
    }
    return `${tabName} 내선 프로파일 (${profilesForGrid.length}건)`;
  }, [isSearching, viewMode, selectedNodeId, selectedTenantId, nodes, assignedTenants, cardGroups, selectedCardId, profilesForGrid.length, filteredProfiles.length]);

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

  // 카드 자동 선택 (탭 변경 시 첫 카드로)
  useEffect(() => {
    if (cardGroups.length === 0) {
      if (viewMode === 'byNode') setSelectedTenantId(null);
      else setSelectedNodeId(null);
      return;
    }
    const current = viewMode === 'byNode' ? selectedTenantId : selectedNodeId;
    if (current === null || !cardGroups.some((g) => g.groupId === current)) {
      if (viewMode === 'byNode') setSelectedTenantId(cardGroups[0].groupId);
      else setSelectedNodeId(cardGroups[0].groupId);
    }
  }, [cardGroups, viewMode, selectedTenantId, selectedNodeId]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleTabSelect = useCallback(
    (id: number | null) => {
      if (viewMode === 'byNode') {
        setSelectedNodeId(id);
        setSelectedTenantId(null);
      } else {
        setSelectedTenantId(id);
        setSelectedNodeId(null);
      }
      hasInitializedNodeRef.current = viewMode === 'byNode' ? true : hasInitializedNodeRef.current;
      hasInitializedTenantRef.current = viewMode === 'byTenant' ? true : hasInitializedTenantRef.current;
      setSearchText('');
    },
    [viewMode],
  );

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim()) {
      setSelectedNodeId(null);
      setSelectedTenantId(null);
    }
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'byNode' ? 'byTenant' : 'byNode'));
    setSelectedNodeId(null);
    setSelectedTenantId(null);
    hasInitializedNodeRef.current = false;
    hasInitializedTenantRef.current = false;
    setSearchText('');
  }, []);

  const invalidateProfiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dnProfileQueryKeys.getList().queryKey });
  }, [queryClient]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteProfile } = useDeleteDnProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 삭제되었습니다.');
        invalidateProfiles();
      },
    },
  });

  // ─── Profile actions ───────────────────────────────────────────────────────
  const handleProfileCreate = () => {
    navigate('/ipron/profile/dn-profile/create');
  };

  const handleProfileEdit = (profile: DnProfile) => {
    navigate(`/ipron/profile/dn-profile/${profile.dnProfileId}/edit`);
  };

  const handleProfileDelete = (profile: DnProfile) => {
    modal.confirm.execute({
      onOk: () => deleteProfile(profile.dnProfileId),
      options: {
        title: '프로파일 삭제',
        content: `"${profile.dnProfileName}" 프로파일을 삭제하시겠습니까?\n(DN / SIP Trunk / DR 에서 참조 중인 경우 삭제가 거부됩니다)`,
      },
    });
  };

  const handleProfileAssignDns = (profile: DnProfile) => {
    setAssignDialogProfile(profile);
  };

  const handleAssignDnsSuccess = () => {
    // DN 목록 invalidate (배정된 DN의 프로파일이 바뀌므로)
    queryClient.invalidateQueries({ queryKey: dnQueryKeys.getList._def });
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단 박스: 탭 바 + 카드 슬라이더 (viewMode에 따라 내용 swap) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* Header: [뷰 전환 버튼] [탭 바] [검색+등록] */}
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            {/* 뷰 모드 전환 버튼 (위=탭 기준, 아래=카드 기준) — 아이콘만 */}
            <button
              type="button"
              onClick={toggleViewMode}
              title={`현재: 탭=${viewMode === 'byNode' ? '노드' : '테넌트'} / 카드=${viewMode === 'byNode' ? '테넌트' : '노드'}. 클릭 시 전환`}
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
                        (e.currentTarget as HTMLElement).scrollIntoView({
                          behavior: 'smooth',
                          inline: 'center',
                          block: 'nearest',
                        });
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

            {/* 우측: 검색 + 등록 버튼 */}
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
          {/* Card slider body — L 카드 (220×130) → h=170 */}
          <div className="flex items-center h-[170px] px-4 py-3">
            <div className="relative flex items-center gap-2 w-full">
              <Button
                type="text"
                icon={<ChevronLeft className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {cardGroups.length === 0 ? (
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
                  cardGroups.map((group) => {
                    const isActive = selectedCardId === group.groupId;
                    const CardIcon = viewMode === 'byNode' ? Building2 : Network;
                    return (
                      <button
                        key={group.groupId}
                        type="button"
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[130px] flex-shrink-0 flex flex-col text-left ${
                          isActive ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          setSelectedCardId(group.groupId);
                          (e.currentTarget as HTMLElement).scrollIntoView({
                            behavior: 'smooth',
                            inline: 'center',
                            block: 'nearest',
                          });
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <CardIcon className={`size-4 flex-shrink-0 ${isActive ? 'text-[#405189]' : 'text-gray-500'}`} />
                          <span className={`text-[13px] font-semibold truncate ${isActive ? 'text-[#405189]' : 'text-gray-900'}`}>{group.groupName}</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-1 text-xs text-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">전체 프로파일</span>
                            <span className="font-semibold text-gray-800">{group.count}건</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">내선 (EXT, AGT)</span>
                            <span className="font-medium text-blue-600">{group.dnCount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">TRUNK</span>
                            <span className="font-medium text-orange-500">{group.trunkCount}</span>
                          </div>
                        </div>
                      </button>
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

        {/* ===== 하단 박스: ag-Grid (선택 테넌트의 프로파일 목록) ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-gray-100 h-[44px]">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
          </div>

          <div className="flex-1 min-h-0">
            <DnProfileTable
              rowData={profilesForGrid}
              isLoading={isProfilesLoading}
              onRowDoubleClicked={handleProfileEdit}
              onDelete={handleProfileDelete}
              onAssignDns={handleProfileAssignDns}
            />
          </div>
        </div>
      </div>

      {/* DN 배정 다이얼로그 (IPR20S2020 연동) */}
      <DnAssignDialog open={!!assignDialogProfile} profile={assignDialogProfile} onCancel={() => setAssignDialogProfile(null)} onSuccess={handleAssignDnsSuccess} />
    </div>
  );
}
