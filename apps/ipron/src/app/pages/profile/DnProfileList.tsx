/**
 * 내선 프로파일 관리 목록 페이지 (IPR20S2220)
 *
 * 멀티테넌트 개편(상담사 관리 정합): byNode/byTenant 뷰전환 + 탭바 + 카드 슬라이더 제거
 *   → 상단에 노드 ScopeSelect + 테넌트 ScopeSelect 두 필터(각 "전체" 포함) + 요약.
 *   데이터는 전량 클라이언트 로드 → 노드/테넌트/검색 클라이언트 필터.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [노드▼] [테넌트▼]  총/내선/TRUNK   🔍[검색] [삭제][등록] │ ← 헤더
 * ├──────────────────────────────────────────────────────┤
 * │ ag-Grid (필터된 프로파일 목록)                          │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select } from 'antd';
import { Network, Plus, Search, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { dnQueryKeys } from '../../features/dn/hooks/useDnQueries';
import DnAssignDialog from '../../features/dn-profile/components/DnAssignDialog';
import DnProfileTable from '../../features/dn-profile/components/DnProfileTable';
import { dnProfileQueryKeys, useDeleteDnProfile, useDeleteDnProfileBatch, useGetDnProfileNodes, useGetDnProfiles } from '../../features/dn-profile/hooks/useDnProfileQueries';
import type { DnProfile } from '../../features/dn-profile/types';
import { useGetNodeTenants } from '../../features/node-scope/hooks/useNodeScope';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '프로파일', path: '/ipron/profile' }, { title: '내선 프로파일', path: '/ipron/profile/dn-profile' }];

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

  // 운영자 모드에서만 테넌트 필터 노출(일반 콘솔은 토큰=본인 테넌트 스코프).
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null); // null=전체 노드
  const [tenantFilter, setTenantFilter] = useState<number | null>(null); // 운영자 테넌트 필터 (null=전체)
  // 일반 모드는 활성 테넌트(ctx)로 스코프, 운영자 모드는 필터 선택값(null=전체).
  const selectedTenantId = operatorMode ? tenantFilter : ctxTenantId;
  const [searchText, setSearchText] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<DnProfile[]>([]);
  const [assignDialogProfile, setAssignDialogProfile] = useState<DnProfile | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: profiles = [], isLoading: isProfilesLoading } = useGetDnProfiles();
  const { data: nodes = [] } = useGetDnProfileNodes();
  const { data: nodeTenants = [] } = useGetNodeTenants();

  // 노드-테넌트에 할당된 노드만 (노드 셀렉트 옵션)
  const assignedNodes = useMemo(() => {
    const nodeIds = new Set(nodeTenants.map((nt) => nt.nodeId));
    return nodes.filter((n) => nodeIds.has(n.nodeId));
  }, [nodes, nodeTenants]);

  // 전체 프로파일 기준 테넌트 목록 (테넌트 셀렉트 옵션)
  const assignedTenants = useMemo(() => {
    const map = new Map<number, { tenantId: number; tenantName: string }>();
    for (const p of profiles) {
      if (!map.has(p.tenantId)) map.set(p.tenantId, { tenantId: p.tenantId, tenantName: p.tenantName ?? '-' });
    }
    return Array.from(map.values()).sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [profiles]);

  // ─── Derived — 노드/테넌트/검색 클라이언트 필터 ─────────────────────────────────
  const profilesForGrid = useMemo(() => {
    let list = profiles;
    if (selectedNodeId != null) list = list.filter((p) => p.nodeId === selectedNodeId);
    if (selectedTenantId != null) list = list.filter((p) => p.tenantId === selectedTenantId);
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      list = list.filter((p) =>
        [p.dnProfileName, p.nodeName, p.tenantName, p.emergencyCodeProfileName, p.devfuncCodeProfileName, p.accessCodeProfileName, p.sipProfileName, p.localRouteName].some((val) =>
          val?.toString().toLowerCase().includes(kw),
        ),
      );
    }
    return list;
  }, [profiles, selectedNodeId, selectedTenantId, searchText]);

  // 헤더 요약 — 현재 필터 기준 총/내선(EXT,AGT)/TRUNK.
  const summary = useMemo(() => {
    let dn = 0;
    let trunk = 0;
    for (const p of profilesForGrid) {
      if (p.dnProfileType === '0') dn += 1;
      else if (p.dnProfileType === '1') trunk += 1;
    }
    return { total: profilesForGrid.length, dn, trunk };
  }, [profilesForGrid]);

  const invalidateProfiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dnProfileQueryKeys.getList().queryKey });
  }, [queryClient]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteProfile } = useDeleteDnProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 삭제되었습니다');
        setSelectedProfiles([]);
        invalidateProfiles();
      },
    },
  });

  const { mutate: deleteProfileBatch } = useDeleteDnProfileBatch({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 삭제되었습니다');
        setSelectedProfiles([]);
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

  const handleProfileDeleteSelected = () => {
    if (selectedProfiles.length === 0) return;
    if (selectedProfiles.length === 1) {
      modal.confirm.execute({
        onOk: () => deleteProfile(selectedProfiles[0].dnProfileId),
        options: { title: '프로파일 삭제', content: `"${selectedProfiles[0].dnProfileName}" 프로파일을 삭제하시겠습니까?` },
      });
    } else {
      modal.confirm.execute({
        onOk: () => deleteProfileBatch(selectedProfiles.map((p) => p.dnProfileId)),
        options: { title: '프로파일 삭제', content: `선택한 ${selectedProfiles.length}개 프로파일을 삭제하시겠습니까?` },
      });
    }
  };

  const handleProfileAssignDns = (profile: DnProfile) => {
    setAssignDialogProfile(profile);
  };

  const handleAssignDnsSuccess = () => {
    queryClient.invalidateQueries({ queryKey: dnQueryKeys.getList._def });
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스1: 헤더 (노드/테넌트 스코프 + 요약 + 검색/액션) ===== */}
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
          {/* 테넌트 필터 — 운영자 모드에서만 노출(일반=본인 테넌트 스코프) */}
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
              value={tenantFilter == null ? null : String(tenantFilter)}
              onChange={(id) => {
                setTenantFilter(id == null ? null : Number(id));
                setSelectedProfiles([]);
              }}
            />
          )}
          {/* 요약 — 총/내선/TRUNK */}
          <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
            <span className="text-gray-500">
              총 프로파일 <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              내선 <b className="text-blue-600 font-semibold">{summary.dn.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              TRUNK <b className="text-orange-500 font-semibold">{summary.trunk.toLocaleString()}</b>
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
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleProfileDeleteSelected}
              disabled={selectedProfiles.length === 0}
              title={selectedProfiles.length === 0 ? '삭제할 프로파일을 선택하세요' : `선택한 ${selectedProfiles.length}개 프로파일 삭제`}
            >
              삭제
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleProfileCreate}>
              등록
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 박스2: ag-Grid (필터된 프로파일 목록) ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2 flex-shrink-0 border-b border-gray-100 h-[44px]">
          <span className="text-sm font-semibold text-gray-800">내선 프로파일 목록</span>
          <span className="text-xs text-gray-500">
            총 {profilesForGrid.length.toLocaleString()}건{selectedProfiles.length > 0 ? ` · 선택 ${selectedProfiles.length}건` : ''}
          </span>
        </div>

        <div className="flex-1 min-h-0">
          <DnProfileTable
            rowData={profilesForGrid}
            isLoading={isProfilesLoading}
            onRowDoubleClicked={handleProfileEdit}
            onSelectionChanged={setSelectedProfiles}
            onAssignDns={handleProfileAssignDns}
          />
        </div>
      </div>

      {/* DN 배정 다이얼로그 (IPR20S2020 연동) */}
      <DnAssignDialog open={!!assignDialogProfile} profile={assignDialogProfile} onCancel={() => setAssignDialogProfile(null)} onSuccess={handleAssignDnsSuccess} />
    </div>
  );
}
