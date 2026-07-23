/**
 * IPT 사용자관리 (AS-IS SWAT IPR20S2055).
 *
 * 좌측 조직 트리(필터, 하위 조직 재귀 포함 조회) + 우측 사용자 ag-Grid.
 * 기능: 검색(사용자ID prefix/사용자명 contains), 추가/수정/삭제(다건),
 *       DN 할당/해제, 조직 일괄변경, 직급/직책 관리, 엑셀 가져오기/내보내기.
 * 조직 CRUD 는 IPT 조직도관리 화면 소관 — 이 화면의 트리는 read-only.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Input, Tooltip } from 'antd';
import { Download, PhoneCall, Plus, Search, Settings, Upload, UsersRound } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import IptOrgTree from '../../features/ipt-org/components/IptOrgTree';
import { useGetIptOrgTenants, useGetIptOrgTree } from '../../features/ipt-org/hooks/useIptOrgQueries';
import { groupTreeByTenant } from '../../features/ipt-org/utils/groupTreeByTenant';
import { iptUserApi } from '../../features/ipt-user/api/iptUserApi';
import DnAssignDialog from '../../features/ipt-user/components/DnAssignDialog';
import GroupMoveDialog from '../../features/ipt-user/components/GroupMoveDialog';
import IptUserFormDrawer, { type IptUserFormDrawerRef } from '../../features/ipt-user/components/IptUserFormDrawer';
import IptUserImportDrawer from '../../features/ipt-user/components/IptUserImportDrawer';
import IptUserTable from '../../features/ipt-user/components/IptUserTable';
import LevelDutyDialog from '../../features/ipt-user/components/LevelDutyDialog';
import { useDeleteIptUsers, useGetIptUsers } from '../../features/ipt-user/hooks/useIptUserQueries';
import type { IptUserResponse } from '../../features/ipt-user/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: 'IPT 서비스' }, { title: 'IPT 사용자관리', path: '/ipron/ipt-user' }];

export default function IptUserList() {
  const modal = useModal();
  const [searchParams] = useSearchParams();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // 조직도관리 "사용자수" 링크 진입 — ?dnGroupId= 프리셋
  const presetDnGroupId = searchParams.get('dnGroupId');

  // ─── 스코프 (agent-master 정합) ─────────────────────────────────────────
  // 일반 콘솔 = JWT 활성 테넌트 / 운영자 모드 = 대행 테넌트(null=전체 view-all, 서버가 토큰으로 판정)
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const opTenantId = actAsTenantId ? Number(actAsTenantId) : null;
  const viewAll = operatorMode && opTenantId == null;
  // 조회 스코프: 일반=활성테넌트 / 운영자=대행테넌트(null=전체) — agent-master selectedTenantId 정합.
  // 관리자 계정은 BE 가 role 기준으로 전체를 돌려주므로, 일반 콘솔에서는 FE 가 tenantId 로 반드시 좁힌다.
  const selectedTenantId = operatorMode ? opTenantId : ctxTenantId;
  // 운영자 전체 모드에서 합성 테넌트 노드 클릭으로 좁히는 "보기 필터"(대행 상태 불변)
  const [treeTenantId, setTreeTenantId] = useState<number | null>(null);

  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(presetDnGroupId ? Number(presetDnGroupId) : null);
  // 검색 입력(타이핑) vs 적용값(검색 버튼) 분리
  const [userIdInput, setUserIdInput] = useState('');
  const [userNameInput, setUserNameInput] = useState('');
  const [applied, setApplied] = useState<{ userId?: string; userName?: string }>({});
  const [selectedRows, setSelectedRows] = useState<IptUserResponse[]>([]);

  const [dnAssignTarget, setDnAssignTarget] = useState<IptUserResponse | null>(null);
  const [groupMoveOpen, setGroupMoveOpen] = useState(false);
  const [levelDutyOpen, setLevelDutyOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const formDrawerRef = useRef<IptUserFormDrawerRef>(null);

  const { data: orgTree = [], isLoading: isTreeLoading } = useGetIptOrgTree({ params: { tenantId: selectedTenantId ?? undefined } });

  // 운영자 모드 ScopeSelect 옵션 — 전용 통계 API (활성 테넌트 전체, 조직 없는 테넌트도 노출)
  const { data: operatorTenants = [] } = useGetIptOrgTenants({ queryOptions: { enabled: operatorMode } });
  const tenantOptions = useMemo(() => operatorTenants.map((t) => ({ id: t.tenantId, name: t.tenantName ?? `테넌트 ${t.tenantId}`, count: t.userCnt })), [operatorTenants]);

  // 트리 표시 — 운영자 전체 모드는 "테넌트 → 조직" 2단 합성 (agent-master displayGroupTree 패턴)
  const visibleTree = useMemo(() => (viewAll ? groupTreeByTenant(orgTree) : orgTree), [orgTree, viewAll]);

  // 그리드 조회 스코프: 일반=활성 / 대행=대행 / 전체=트리 보기필터(null=전체 테넌트, 서버 view-all)
  const gridTenantId = operatorMode ? (opTenantId ?? treeTenantId) : ctxTenantId;

  const listParams = useMemo(
    () => ({
      tenantId: gridTenantId ?? undefined,
      dnGroupId: selectedOrgId ?? undefined,
      userId: applied.userId,
      userName: applied.userName,
    }),
    [gridTenantId, selectedOrgId, applied],
  );

  /** 등록/가져오기 대상 테넌트 — 일반=활성, 대행=대행, 전체=보기필터/선택조직 테넌트 */
  const findOrgTenant = (nodes: typeof orgTree, id: number): number | null => {
    for (const n of nodes) {
      if (n.dnGroupId === id) return n.tenantId;
      const inner = findOrgTenant(n.children ?? [], id);
      if (inner != null) return inner;
    }
    return null;
  };
  const resolveCreateTenantId = (): number | null => {
    if (!operatorMode) return ctxTenantId;
    if (opTenantId != null) return opTenantId;
    return treeTenantId ?? (selectedOrgId != null ? findOrgTenant(orgTree, selectedOrgId) : null);
  };

  const { data: users = [], isLoading: isUsersLoading } = useGetIptUsers({ params: listParams });

  const { mutate: deleteUsers } = useDeleteIptUsers({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사용자가 삭제되었습니다.');
        setSelectedRows([]);
      },
    },
  });

  const handleSearch = () => {
    setApplied({ userId: userIdInput.trim() || undefined, userName: userNameInput.trim() || undefined });
  };

  const handleDelete = (targets: IptUserResponse[]) => {
    if (targets.length === 0) return;
    modal.confirm.delete({
      onOk: () => deleteUsers(targets.map((t) => t.ieUserid)),
    });
  };

  const handleExport = async () => {
    if (!listParams) return;
    const blob = await iptUserApi.exportExcel(listParams);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ipt-users.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // DN 할당 — 단일 선택 + 활성 사용자만
  const dnAssignDisabledReason = selectedRows.length !== 1 ? '사용자를 1명만 선택하세요' : selectedRows[0].activateYn !== 1 ? '비활성 사용자는 DN을 할당할 수 없습니다' : null;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 — 요약 + 검색 + 엑셀 (agent-master 정합, 화면명은 브레드크럼이 표기) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={tenantOptions}
              value={actAsTenantId}
              onChange={(id) => {
                setActAsTenant(id);
                setTreeTenantId(null);
                setSelectedOrgId(null);
                setSelectedRows([]);
              }}
            />
          )}
          {/* 요약 정보 — 총/활성 (agent-master 요약 스타일) */}
          <div className={`flex items-center gap-4 text-[13px] ${operatorMode ? 'ml-3 pl-3 border-l border-gray-200' : ''}`}>
            <span className="text-gray-500">
              총 사용자 <b className="text-gray-800 font-semibold">{users.length.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              활성 <b className="text-green-600 font-semibold">{users.filter((u) => u.activateYn === 1).length.toLocaleString()}</b>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="사용자ID"
              style={{ width: 150 }}
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="사용자명"
              style={{ width: 150 }}
              value={userNameInput}
              onChange={(e) => setUserNameInput(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button onClick={handleSearch}>검색</Button>
            <Button icon={<Download className="size-3.5" />} onClick={handleExport}>
              엑셀
            </Button>
            <Button
              icon={<Upload className="size-3.5" />}
              onClick={() => {
                if (!resolveCreateTenantId()) {
                  toast.warning('전체 모드에서는 트리에서 테넌트를 먼저 선택하세요.');
                  return;
                }
                setImportOpen(true);
              }}
            >
              가져오기
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        {/* 좌: 조직 트리 (read-only 필터) */}
        <div className="bg-white bt-shadow flex flex-col flex-shrink-0 overflow-hidden w-[300px]">
          <div className="flex items-center px-4 h-[44px] border-b border-gray-100 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-700">조직</span>
          </div>
          <div className="flex-1 min-h-0">
            {isTreeLoading ? (
              <FallbackSpinner size={36} />
            ) : (
              <IptOrgTree
                tree={visibleTree}
                selectedOrgId={selectedOrgId}
                selectedTenantId={treeTenantId}
                onSelectOrg={(id) => {
                  setSelectedOrgId(id);
                  setSelectedRows([]);
                }}
                onSelectTenant={(tid) => {
                  setTreeTenantId((cur) => (cur === tid ? null : tid));
                  setSelectedOrgId(null);
                  setSelectedRows([]);
                }}
              />
            )}
          </div>
        </div>

        {/* 우: 사용자 그리드 */}
        <div className="bg-white bt-shadow flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {/* 컨텍스트 툴바 — agent-master 그리드 헤더 정합 */}
          <div className="border-b border-gray-100 flex items-center gap-2 h-[44px] px-4 flex-shrink-0">
            <span className="text-xs text-gray-500">
              {users.length.toLocaleString()}건<span className={selectedRows.length > 0 ? '' : 'invisible'}> 중 {selectedRows.length}건 선택</span>
              {selectedOrgId != null && <span className="text-gray-400"> · 하위 조직 포함</span>}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Tooltip title={dnAssignDisabledReason ?? undefined}>
                <Button icon={<PhoneCall className="size-3.5" />} disabled={!!dnAssignDisabledReason} onClick={() => setDnAssignTarget(selectedRows[0])}>
                  DN 할당
                </Button>
              </Tooltip>
              <Button icon={<UsersRound className="size-3.5" />} disabled={selectedRows.length === 0} onClick={() => setGroupMoveOpen(true)}>
                조직변경
              </Button>
              <Button icon={<Settings className="size-3.5" />} onClick={() => setLevelDutyOpen(true)}>
                직급/직책 관리
              </Button>
              <Button
                type="primary"
                icon={<Plus className="size-3.5" />}
                onClick={() => {
                  const tid = resolveCreateTenantId();
                  if (!tid) {
                    toast.warning('전체 모드에서는 트리에서 테넌트를 먼저 선택하세요.');
                    return;
                  }
                  formDrawerRef.current?.openCreate(tid, selectedOrgId);
                }}
              >
                등록
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <IptUserTable
              rowData={users}
              isLoading={isUsersLoading}
              showTenant={viewAll}
              onRowDoubleClicked={(user) => formDrawerRef.current?.openEdit(user)}
              onDelete={(user) => handleDelete([user])}
              onSelectionChanged={setSelectedRows}
              onBulkDelete={() => handleDelete(selectedRows)}
              selectedCount={selectedRows.length}
            />
          </div>
        </div>
      </div>

      <IptUserFormDrawer ref={formDrawerRef} />
      <DnAssignDialog open={dnAssignTarget !== null} user={dnAssignTarget} onClose={() => setDnAssignTarget(null)} />
      <GroupMoveDialog open={groupMoveOpen} tenantId={selectedRows[0]?.tenantId ?? gridTenantId} users={selectedRows} onClose={() => setGroupMoveOpen(false)} />
      <LevelDutyDialog open={levelDutyOpen} onClose={() => setLevelDutyOpen(false)} />
      <IptUserImportDrawer open={importOpen} tenantId={resolveCreateTenantId()} onClose={() => setImportOpen(false)} />
    </div>
  );
}
