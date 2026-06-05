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
import { Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Plus, Search, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import SkillsetFormDrawer from '../../features/skillset-master/components/SkillsetFormDrawer';
import SkillsetGroupDrawer from '../../features/skillset-master/components/SkillsetGroupDrawer';
import SkillsetGroupTree from '../../features/skillset-master/components/SkillsetGroupTree';
import SkillsetScheduleDrawer from '../../features/skillset-master/components/SkillsetScheduleDrawer';
import SkillsetTable from '../../features/skillset-master/components/SkillsetTable';
import SkillsetTenantCard from '../../features/skillset-master/components/SkillsetTenantCard';
import {
  useCreateSkillset,
  useCreateSkillsetGroup,
  useDeleteSkillsetGroup,
  useDeleteSkillsets,
  useGetSkillsetGroups,
  useGetSkillsetTenants,
  useGetSkillsets,
  useMoveSkillsetGroup,
  useReassignSkillsetMembers,
  useUnassignSkillsetMembers,
  useUpdateSkillset,
  useUpdateSkillsetGroup,
} from '../../features/skillset-master/hooks/useSkillsetQueries';
import type {
  SkillsetCreateRequest,
  SkillsetGroupCreateRequest,
  SkillsetGroupResponse,
  SkillsetGroupUpdateRequest,
  SkillsetResponse,
  SkillsetUpdateRequest,
} from '../../features/skillset-master/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '상담사 관리', path: '/ipron/skillset-master' },
  { title: '스킬 관리', path: '/ipron/skillset-master' },
  { title: '스킬셋 관리', path: '/ipron/skillset-master' },
];

interface CompactPillProps {
  name: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}

function CompactPill({ name, count, selected, onClick }: CompactPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${name} · ${count.toLocaleString()}건`}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
        selected
          ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
      }`}
    >
      <span className="font-medium truncate max-w-[120px]">{name}</span>
      <span className={`text-[11px] ${selected ? 'text-white/80' : 'text-gray-400'}`}>{count.toLocaleString()}</span>
    </button>
  );
}

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
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ctx 테넌트 (JWT — 사용자 본인 테넌트) — 페이지 진입 시 자동 선택
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(ctxTenantId);
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null); // null=전체, 0=미배정, n=실제 트리
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<SkillsetResponse[]>([]);
  // 카드 박스는 항상 DOM 에 있고 default 접힘(compact pill). 권한 wrapping 일관성을 위해 hidden 토글 X.
  const [cardExpanded, setCardExpanded] = useState(false);

  // ctx tenantId 가 늦게 로드되는 경우 (auth fetch 비동기) 동기화
  useEffect(() => {
    if (ctxTenantId != null && selectedTenantId === null) {
      setSelectedTenantId(ctxTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTenantId]);

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

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: skillsets = [], isLoading } = useGetSkillsets({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
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
  const { mutate: moveGroup } = useMoveSkillsetGroup({
    mutationOptions: {
      onError: (err: unknown) => toast.error(extractMsg(err, '순서 변경 실패')),
    },
  });

  // ─── Derived ────────────────────────────────────────────────────────────
  const filteredSkillsets = useMemo(() => {
    let rows = skillsets;
    if (selectedTreeId === 0) rows = rows.filter((r) => r.treeId == null);
    else if (selectedTreeId != null) rows = rows.filter((r) => r.treeId === selectedTreeId);
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      rows = rows.filter((r) => {
        const fs: (string | number | null | undefined)[] = [r.skillsetName, r.skillsetDesc, r.tenantName, r.treeName];
        return fs.some((f) => f != null && String(f).toLowerCase().includes(kw));
      });
    }
    return rows;
  }, [skillsets, selectedTreeId, searchText]);

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
    setDrawerMode('create');
    setDrawerSkillset(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((row: SkillsetResponse) => {
    setDrawerMode('edit');
    setDrawerSkillset(row);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(
    (row: SkillsetResponse) => {
      modal.confirm.execute({
        onOk: () => deleteSkillsets([row.skillsetId]),
        options: { title: '스킬셋 삭제', content: `"${row.skillsetName}" 스킬셋을 삭제하시겠습니까?` },
      });
    },
    [modal, deleteSkillsets],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => deleteSkillsets(selectedRows.map((r) => r.skillsetId)),
      options: { title: '스킬셋 일괄 삭제', content: `선택한 ${selectedRows.length}건의 스킬셋을 삭제하시겠습니까?` },
    });
  }, [selectedRows, modal, deleteSkillsets]);

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
      modal.confirm.execute({
        onOk: () => deleteGroup(group.treeId),
        options: { title: '업무그룹 삭제', content: `"${group.treeName}" 그룹과 하위 그룹/매핑이 모두 삭제됩니다. 진행하시겠습니까?` },
      });
    },
    [modal, deleteGroup],
  );

  const handleMoveGroup = useCallback(
    (group: SkillsetGroupResponse, up: boolean) => {
      moveGroup({ treeId: group.treeId, up });
    },
    [moveGroup],
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
      {/* ===== 박스 1: 헤더 (타이틀 + 검색) — 별도 박스 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          <span className="text-sm font-semibold text-gray-700">스킬셋 현황</span>
          {selectedTenantId !== null && (
            <span className="ml-3 text-xs text-gray-500">
              테넌트: <span className="font-medium text-gray-700">{tenantStats.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? `#${selectedTenantId}`}</span>
            </span>
          )}
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

      {/* ===== 박스 2: 테넌트 카드 슬라이더 — 별도 박스 (default 접힘, 펼침 토글 가능) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        {cardExpanded ? (
          <div className="flex items-center h-[140px] px-4 py-3">
            <div className="relative flex items-center gap-2 w-full">
              <Button
                type="text"
                icon={<ChevronLeft className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <SkillsetTenantCard
                  tenantId={null}
                  tenantName="전체"
                  stats={totalStats}
                  selected={selectedTenantId === null}
                  onClick={() => {
                    setSelectedTenantId(null);
                    setSelectedTreeId(null);
                  }}
                />
                {tenantStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">등록된 스킬셋이 없습니다</span>
                  </div>
                ) : (
                  tenantStats.map((t) => (
                    <SkillsetTenantCard
                      key={t.tenantId}
                      tenantId={t.tenantId}
                      tenantName={t.tenantName ?? '-'}
                      stats={{ skillsetCount: t.skillsetCount, groupCount: t.groupCount, unassignedCount: t.unassignedCount }}
                      selected={selectedTenantId === t.tenantId}
                      onClick={(e) => {
                        setSelectedTenantId(t.tenantId);
                        setSelectedTreeId(null);
                        (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }}
                    />
                  ))
                )}
              </div>
              <Button
                type="text"
                icon={<ChevronRight className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <Button
                type="text"
                icon={<ChevronsUp className="size-4" />}
                onClick={() => setCardExpanded(false)}
                title="카드 접기"
                className="!flex-shrink-0 !w-8 !h-8 !p-0 !text-gray-400 hover:!text-[#405189]"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center h-[44px] px-4">
            <div className="relative flex items-center gap-2 w-full">
              <div className="flex gap-2 overflow-x-auto flex-1 items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <CompactPill
                  name="전체"
                  count={totalStats.skillsetCount}
                  selected={selectedTenantId === null}
                  onClick={() => {
                    setSelectedTenantId(null);
                    setSelectedTreeId(null);
                  }}
                />
                {tenantStats.map((t) => (
                  <CompactPill
                    key={t.tenantId}
                    name={t.tenantName ?? '-'}
                    count={t.skillsetCount}
                    selected={selectedTenantId === t.tenantId}
                    onClick={() => {
                      setSelectedTenantId(t.tenantId);
                      setSelectedTreeId(null);
                    }}
                  />
                ))}
              </div>
              <Button
                type="text"
                icon={<ChevronsDown className="size-4" />}
                onClick={() => setCardExpanded(true)}
                title="카드 펼치기"
                className="!flex-shrink-0 !w-8 !h-8 !p-0 !text-gray-400 hover:!text-[#405189]"
              />
            </div>
          </div>
        )}
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
              onMove={handleMoveGroup}
              onSkillsetDrop={handleSkillsetDrop}
            />
          </div>
        </div>

        {/* 우측 ag-Grid */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">스킬셋 목록 ({filteredSkillsets.length.toLocaleString()}건)</span>
            {selectedRows.length > 0 && (
              <span className="text-xs text-gray-500">
                {filteredSkillsets.length.toLocaleString()}건 중 {selectedRows.length}건 선택
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                danger
                icon={<Trash2 className="size-3.5" />}
                onClick={handleBulkDelete}
                loading={isDeleting}
                disabled={selectedRows.length === 0}
                title={selectedRows.length === 0 ? '삭제할 스킬셋을 선택하세요' : '선택한 스킬셋 삭제'}
              >
                {selectedRows.length > 0 ? `삭제 (${selectedRows.length})` : '삭제'}
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

      {/* 스킬셋별 스케쥴 관리 Drawer */}
      <SkillsetScheduleDrawer open={scheduleDrawerOpen} skillset={scheduleSkillset} onClose={() => setScheduleDrawerOpen(false)} />
    </div>
  );
}

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}
