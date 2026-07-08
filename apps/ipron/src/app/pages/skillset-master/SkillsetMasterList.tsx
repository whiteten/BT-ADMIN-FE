/**
 * 스킬셋 관리 페이지 (AS-IS SWAT IPR20S5010)
 *
 * 레이아웃 (ADN 패턴 통일):
 *  - 상단 박스: [헤더(타이틀+검색, h-44px, border-b) + 테넌트 카드 슬라이더] 단일 박스
 *  - 하단: 좌 사이드 트리 (업무그룹) + 우 ag-Grid (스킬셋 마스터)
 *  - 트리에서 그룹 CRUD (호버 액션 +/✎/🗑) → 사이드 Drawer
 *  - ag-Grid 행 → 트리 노드 드래그앤드롭 → 업무그룹 reassign
 *  - 별도 뷰 토글 X
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input } from 'antd';
import { Layers, Plus, Search, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import SkillGroupManageModal from '../../features/skill-assign/components/SkillGroupManageModal';
import SkillsetFormDrawer from '../../features/skillset-master/components/SkillsetFormDrawer';
import SkillsetGroupDrawer from '../../features/skillset-master/components/SkillsetGroupDrawer';
import SkillsetGroupTree from '../../features/skillset-master/components/SkillsetGroupTree';
import SkillsetScheduleDrawer from '../../features/skillset-master/components/SkillsetScheduleDrawer';
import SkillsetTable from '../../features/skillset-master/components/SkillsetTable';
import {
  useCreateSkillset,
  useCreateSkillsetGroup,
  useDeleteSkillsetGroup,
  useDeleteSkillsets,
  useGetSkillsetGroups,
  useGetSkillsetTenants,
  useGetSkillsets,
  useReassignSkillsetMembers,
  useReorderSkillsetGroup,
  useUnassignSkillsetMembers,
  useUpdateSkillset,
  useUpdateSkillsetGroup,
} from '../../features/skillset-master/hooks/useSkillsetQueries';
import type {
  SkillsetCreateRequest,
  SkillsetGroupCreateRequest,
  SkillsetGroupReorderPosition,
  SkillsetGroupResponse,
  SkillsetGroupUpdateRequest,
  SkillsetResponse,
  SkillsetUpdateRequest,
} from '../../features/skillset-master/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '라우팅 설정' }, { title: '스킬셋 관리', path: '/ipron/skillset-master' }];

/** 트리 평탄화 (Drawer 의 group Select 옵션용) */
function flattenGroups(nodes: SkillsetGroupResponse[], depth = 0, out: SkillsetGroupResponse[] = []): SkillsetGroupResponse[] {
  for (const n of nodes) {
    out.push({ ...n, treeName: `${'　'.repeat(depth)}${n.treeName}` });
    if (n.children?.length) flattenGroups(n.children, depth + 1, out);
  }
  return out;
}

export default function SkillsetMasterList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  // modal 인스턴스를 ref 에 보관 — 매 렌더마다 새 객체를 반환하는 useModal() 이
  // useCallback deps 에 들어가면 handleBulkDelete 등이 매 렌더마다 새 참조가 되어
  // columnDefs useMemo → ag-Grid 컬럼 재생성 → onSelectionChanged → setState → 무한 루프가 발생한다.
  // ref 를 통해 항상 최신 인스턴스에 접근하되 deps 는 안정적으로 유지한다.
  const modalRef = useRef(modal);
  modalRef.current = modal;

  // ctx 테넌트 (JWT — 사용자 본인 테넌트)
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): tenantId 미전달 → 전체 테넌트 조회
  //  - 대행(actAsTenantId=X): tenantId=X 로 조회 스코프 + X 대행 CUD
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const opTenantId = actAsTenantId ? Number(actAsTenantId) : null;
  // 조회/등록 스코프: 일반=활성테넌트 / 운영자=대행테넌트(null=전체).
  const selectedTenantId = operatorMode ? opTenantId : ctxTenantId;

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null); // null=전체, 0=미배정, n=실제 트리
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<SkillsetResponse[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [drawerSkillset, setDrawerSkillset] = useState<SkillsetResponse | null>(null);

  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [groupDrawerMode, setGroupDrawerMode] = useState<'create' | 'edit'>('create');
  const [groupDrawerParent, setGroupDrawerParent] = useState<SkillsetGroupResponse | null>(null);
  const [groupDrawerTarget, setGroupDrawerTarget] = useState<SkillsetGroupResponse | null>(null);
  const [groupDrawerTenantHint, setGroupDrawerTenantHint] = useState<number | null>(null);

  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);
  const [scheduleSkillset, setScheduleSkillset] = useState<SkillsetResponse | null>(null);

  const [groupManageOpen, setGroupManageOpen] = useState(false);

  // ─── Queries ────────────────────────────────────────────────────────────
  const skillsetListParams = useMemo(() => {
    const base: { tenantId?: number; treeId?: number } = {};
    if (selectedTenantId !== null) base.tenantId = selectedTenantId;
    if (selectedTreeId === 0) base.treeId = 0;
    else if (selectedTreeId !== null) base.treeId = selectedTreeId;
    return base;
  }, [selectedTenantId, selectedTreeId]);

  const { data: skillsets = [], isLoading } = useGetSkillsets({
    params: skillsetListParams,
  });
  const { data: tenantStats = [] } = useGetSkillsetTenants();
  const { data: groupTree = [] } = useGetSkillsetGroups({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: createSkillset, isPending: isCreating } = useCreateSkillset({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스킬셋이 등록되었습니다');
        setDrawerOpen(false);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '등록 실패')),
    },
  });
  const { mutate: updateSkillset, isPending: isUpdating } = useUpdateSkillset({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스킬셋이 수정되었습니다');
        setDrawerOpen(false);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '수정 실패')),
    },
  });
  const { mutate: deleteSkillsets, isPending: isDeleting } = useDeleteSkillsets({
    mutationOptions: {
      onSuccess: (deleted) => {
        toast.success(`${deleted}건이 삭제되었습니다`);
        setSelectedRows([]);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '삭제 실패')),
    },
  });
  const { mutate: createGroup, isPending: isCreatingGroup } = useCreateSkillsetGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('업무그룹이 추가되었습니다');
        setGroupDrawerOpen(false);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '추가 실패')),
    },
  });
  const { mutate: updateGroup, isPending: isUpdatingGroup } = useUpdateSkillsetGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('업무그룹이 수정되었습니다');
        setGroupDrawerOpen(false);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '수정 실패')),
    },
  });
  const { mutate: deleteGroup } = useDeleteSkillsetGroup({
    mutationOptions: {
      onSuccess: () => toast.success('업무그룹이 삭제되었습니다'),
      onError: (err: unknown) => toast.error(extractMsg(err, '삭제 실패')),
    },
  });
  const { mutate: reassign } = useReassignSkillsetMembers({
    mutationOptions: {
      onSuccess: (count) => toast.success(`${count}건의 스킬셋이 업무그룹에 배정되었습니다`),
      onError: (err: unknown) => toast.error(extractMsg(err, '배정 실패')),
    },
  });
  const { mutate: unassign } = useUnassignSkillsetMembers({
    mutationOptions: {
      onSuccess: (count) => toast.success(`${count}건의 스킬셋 배정이 해제되었습니다`),
      onError: (err: unknown) => toast.error(extractMsg(err, '해제 실패')),
    },
  });
  const { mutate: reorderGroup } = useReorderSkillsetGroup({
    mutationOptions: {
      onError: (err: unknown) => toast.error(extractMsg(err, '순서 변경 실패')),
    },
  });

  // ─── Derived ────────────────────────────────────────────────────────────
  const filteredSkillsets = useMemo(() => {
    let rows = skillsets;
    // treeId=0(미배정) / treeId=n(실제 트리): BE가 하위 포함 재귀 결과를 반환 — 클라이언트 재필터 불필요
    // selectedTreeId 는 deps 불필요 (BE params 에만 사용, 클라이언트 필터 없음)
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      rows = rows.filter((r) => {
        const fs: (string | number | null | undefined)[] = [r.skillsetName, r.skillsetDesc, r.tenantName, r.treeName];
        return fs.some((f) => f != null && String(f).toLowerCase().includes(kw));
      });
    }
    return rows;
  }, [skillsets, searchText]);

  const totalStats = useMemo(() => {
    let skillsetCount = 0;
    let groupCount = 0;
    let unassignedCount = 0;
    for (const t of tenantStats) {
      skillsetCount += t.skillsetCount;
      groupCount += t.groupCount;
      unassignedCount += t.unassignedCount;
    }
    return { skillsetCount, groupCount, unassignedCount };
  }, [tenantStats]);

  // 헤더 요약 — 현재 스코프(전체=합계 / 특정 테넌트=해당)의 총 스킬셋/업무그룹/미배정.
  const summary = useMemo(() => {
    const rows = selectedTenantId == null ? tenantStats : tenantStats.filter((t) => t.tenantId === selectedTenantId);
    return rows.reduce((a, t) => ({ skillset: a.skillset + (t.skillsetCount ?? 0), group: a.group + (t.groupCount ?? 0), unassigned: a.unassigned + (t.unassignedCount ?? 0) }), {
      skillset: 0,
      group: 0,
      unassigned: 0,
    });
  }, [tenantStats, selectedTenantId]);

  const tenantOptions = useMemo(() => tenantStats.map((t) => ({ tenantId: t.tenantId, tenantName: t.tenantName })), [tenantStats]);
  const flatGroups = useMemo(() => flattenGroups(groupTree), [groupTree]);

  // 트리에 표시할 카운트는 선택된 테넌트 기준. "전체" 선택 시 전체 합계.
  const treeDisplayCount = useMemo(() => {
    if (selectedTenantId === null) return { skillsetCount: totalStats.skillsetCount, unassignedCount: totalStats.unassignedCount };
    const t = tenantStats.find((x) => x.tenantId === selectedTenantId);
    return { skillsetCount: t?.skillsetCount ?? 0, unassignedCount: t?.unassignedCount ?? 0 };
  }, [selectedTenantId, tenantStats, totalStats]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleCreateOpen = useCallback(() => {
    if (selectedTenantId == null) {
      toast.warning('대행할 테넌트를 먼저 선택하세요');
      return;
    }
    setDrawerMode('create');
    setDrawerSkillset(null);
    setDrawerOpen(true);
  }, [selectedTenantId]);

  const handleEdit = useCallback((row: SkillsetResponse) => {
    setDrawerMode('edit');
    setDrawerSkillset(row);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(
    (row: SkillsetResponse) => {
      modalRef.current.confirm.execute({
        onOk: () => deleteSkillsets([row.skillsetId]),
        options: { title: '스킬셋 삭제', content: `"${row.skillsetName}" 스킬셋을 삭제하시겠습니까?` },
      });
    },
    [deleteSkillsets],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedRows.length === 0) return;
    modalRef.current.confirm.execute({
      onOk: () => deleteSkillsets(selectedRows.map((r) => r.skillsetId)),
      options: { title: '스킬셋 일괄 삭제', content: `선택한 ${selectedRows.length}건의 스킬셋을 삭제하시겠습니까?` },
    });
  }, [selectedRows, deleteSkillsets]);

  const handleDrawerSubmit = useCallback(
    (req: SkillsetCreateRequest | SkillsetUpdateRequest) => {
      if (drawerMode === 'create') {
        createSkillset(req as SkillsetCreateRequest);
      } else if (drawerSkillset) {
        updateSkillset({ id: drawerSkillset.skillsetId, body: req as SkillsetUpdateRequest });
      }
    },
    [drawerMode, drawerSkillset, createSkillset, updateSkillset],
  );

  // ─── 트리 핸들러 ──────────────────────────────────────────
  const handleCreateGroup = useCallback(
    (parent: SkillsetGroupResponse | null, tenantHint?: number | null) => {
      const targetTenant = parent?.tenantId ?? tenantHint ?? selectedTenantId;
      if (targetTenant == null) {
        toast.warning('루트 그룹을 추가할 테넌트 카드를 먼저 선택하세요');
        return;
      }
      setGroupDrawerMode('create');
      setGroupDrawerParent(parent);
      setGroupDrawerTarget(null);
      setGroupDrawerTenantHint(targetTenant);
      setGroupDrawerOpen(true);
    },
    [selectedTenantId],
  );

  const handleEditGroup = useCallback((group: SkillsetGroupResponse) => {
    setGroupDrawerMode('edit');
    setGroupDrawerParent(null);
    setGroupDrawerTarget(group);
    setGroupDrawerTenantHint(group.tenantId);
    setGroupDrawerOpen(true);
  }, []);

  const handleDeleteGroup = useCallback(
    (group: SkillsetGroupResponse) => {
      modalRef.current.confirm.execute({
        onOk: () => deleteGroup(group.treeId),
        options: { title: '업무그룹 삭제', content: `"${group.treeName}" 그룹을 삭제하시겠습니까?` },
      });
    },
    [deleteGroup],
  );

  const handleGroupReorder = useCallback(
    (movedTreeId: number, position: SkillsetGroupReorderPosition, referenceTreeId: number) => {
      reorderGroup({ treeId: movedTreeId, body: { position, referenceTreeId } });
    },
    [reorderGroup],
  );

  const handleManageSchedule = useCallback((row: SkillsetResponse) => {
    setScheduleSkillset(row);
    setScheduleDrawerOpen(true);
  }, []);

  const handleGroupDrawerSubmit = useCallback(
    (req: SkillsetGroupCreateRequest | SkillsetGroupUpdateRequest) => {
      if (groupDrawerMode === 'create') createGroup(req as SkillsetGroupCreateRequest);
      else if (groupDrawerTarget) updateGroup({ id: groupDrawerTarget.treeId, body: req as SkillsetGroupUpdateRequest });
    },
    [groupDrawerMode, groupDrawerTarget, createGroup, updateGroup],
  );

  // ─── D&D ────────────────────────────────────────────────
  const handleSkillsetDrop = useCallback(
    (target: { treeId: number; tenantId: number | null }, skillsetIds: number[]) => {
      // 미배정 (treeId=0) 은 테넌트 검증 불필요
      if (target.treeId === 0) {
        unassign(skillsetIds);
        return;
      }
      // 동일 테넌트 검증 — skillsets 안에서 드래그된 항목들의 테넌트 확인
      const draggedSkillsets = skillsets.filter((s) => skillsetIds.includes(s.skillsetId));
      const mismatches = draggedSkillsets.filter((s) => s.tenantId !== target.tenantId);
      if (mismatches.length > 0) {
        const names = mismatches
          .map((s) => s.skillsetName)
          .slice(0, 3)
          .join(', ');
        const extra = mismatches.length > 3 ? ` 외 ${mismatches.length - 3}건` : '';
        toast.error(`다른 테넌트의 스킬셋은 이동할 수 없습니다: ${names}${extra}`);
        return;
      }
      reassign({ skillsetIds, targetTreeId: target.treeId });
    },
    [skillsets, reassign, unassign],
  );

  const getDragSkillsetIds = useCallback(
    (dragRow: SkillsetResponse): number[] => {
      const selectedIds = selectedRows.map((r) => r.skillsetId);
      if (selectedIds.length > 0 && selectedIds.includes(dragRow.skillsetId)) return selectedIds;
      return [dragRow.skillsetId];
    },
    [selectedRows],
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 (스코프 선택 + 요약 + 검색) — 별도 박스 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          {/* 운영자 모드: 대행 테넌트 선택(공통 ScopeSelect). 일반 콘솔은 브레드크럼이 화면명 표기. */}
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={tenantStats.map((t) => ({ id: t.tenantId, name: t.tenantName ?? `테넌트 ${t.tenantId}`, count: t.skillsetCount }))}
              value={actAsTenantId}
              onChange={(id) => {
                setActAsTenant(id);
                setSelectedTreeId(null);
                setSelectedRows([]);
              }}
            />
          )}
          {/* 요약 — 총 스킬셋/업무그룹/미배정 (운영자는 선택 뒤, 일반은 좌측). */}
          <div className={`flex items-center gap-4 text-[13px] ${operatorMode ? 'ml-3 pl-3 border-l border-gray-200' : ''}`}>
            <span className="text-gray-500">
              총 스킬셋 <b className="text-gray-800 font-semibold">{summary.skillset.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              업무그룹 <b className="text-[#405189] font-semibold">{summary.group.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              미배정 <b className="text-amber-600 font-semibold">{summary.unassigned.toLocaleString()}</b>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="스킬셋명/설명/그룹 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 220 }}
            />
          </div>
        </div>
      </div>

      {/* ===== 좌(트리) + 우(ag-Grid) 박스 ===== */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측 트리 */}
        <div className="bg-white bt-shadow flex flex-col w-[280px] flex-shrink-0 overflow-hidden">
          <div className="flex items-center px-4 h-[44px] border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">업무그룹</span>
            <button
              type="button"
              onClick={() => handleCreateGroup(null, selectedTenantId)}
              disabled={selectedTenantId === null}
              className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#405189] text-[#405189] text-xs hover:bg-[#405189]/5 disabled:opacity-40 disabled:cursor-not-allowed"
              title={selectedTenantId === null ? '테넌트를 먼저 선택하세요' : '루트 그룹 추가'}
            >
              <Plus className="size-3" /> 루트
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <SkillsetGroupTree
              groups={groupTree}
              totalSkillsetCount={treeDisplayCount.skillsetCount}
              totalUnassignedCount={treeDisplayCount.unassignedCount}
              selectedTreeId={selectedTreeId}
              selectedTenantId={selectedTenantId}
              onSelect={setSelectedTreeId}
              onCreateChild={(parent) => handleCreateGroup(parent, selectedTenantId)}
              onEdit={handleEditGroup}
              onDelete={handleDeleteGroup}
              onSkillsetDrop={handleSkillsetDrop}
              onGroupReorder={handleGroupReorder}
            />
          </div>
        </div>

        {/* 우측 ag-Grid */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">스킬셋 목록 ({filteredSkillsets.length.toLocaleString()}건)</span>
            <span className={`text-xs text-gray-500 ${selectedRows.length > 0 ? '' : 'invisible'}`}>
              {filteredSkillsets.length.toLocaleString()}건 중 {selectedRows.length}건 선택
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button icon={<Layers className="size-3.5" />} onClick={() => setGroupManageOpen(true)}>
                스킬모음 관리
              </Button>
              <Button
                danger
                icon={<Trash2 className="size-3.5" />}
                onClick={handleBulkDelete}
                loading={isDeleting}
                disabled={selectedRows.length === 0}
                title={selectedRows.length === 0 ? '삭제할 스킬셋을 선택하세요' : '선택한 스킬셋 삭제'}
              >
                삭제
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreateOpen}>
                등록
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <SkillsetTable
              rowData={filteredSkillsets}
              isLoading={isLoading}
              onRowDoubleClicked={handleEdit}
              onDelete={handleDelete}
              onManageSchedule={handleManageSchedule}
              onSelectionChanged={setSelectedRows}
              onBulkDelete={handleBulkDelete}
              selectedCount={selectedRows.length}
              getDragSkillsetIds={getDragSkillsetIds}
              showTenantColumn={selectedTenantId === null}
            />
          </div>
        </div>
      </div>

      {/* 스킬셋 등록/수정 Drawer */}
      <SkillsetFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        skillset={drawerSkillset}
        defaultTenantId={selectedTenantId}
        defaultTreeId={selectedTreeId && selectedTreeId > 0 ? selectedTreeId : null}
        tenants={tenantOptions}
        groups={flatGroups}
        onCancel={() => setDrawerOpen(false)}
        onSubmit={handleDrawerSubmit}
        loading={isCreating || isUpdating}
      />

      {/* 업무그룹 추가/수정 Drawer */}
      <SkillsetGroupDrawer
        open={groupDrawerOpen}
        mode={groupDrawerMode}
        tenantId={groupDrawerTenantHint}
        parent={groupDrawerParent}
        group={groupDrawerTarget}
        onCancel={() => setGroupDrawerOpen(false)}
        onSubmit={handleGroupDrawerSubmit}
        loading={isCreatingGroup || isUpdatingGroup}
      />

      {/* 스킬셋별 스케줄 관리 Drawer */}
      <SkillsetScheduleDrawer open={scheduleDrawerOpen} skillset={scheduleSkillset} onClose={() => setScheduleDrawerOpen(false)} />

      {/* 스킬모음 관리 와이드 모달 */}
      <SkillGroupManageModal open={groupManageOpen} tenantId={selectedTenantId} onClose={() => setGroupManageOpen(false)} />
    </div>
  );
}

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}
