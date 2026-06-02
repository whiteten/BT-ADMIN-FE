/**
 * CTI 큐 관리 목록 페이지 (SWAT IPR20S3020)
 *
 * Pattern (IPRON 표준): 상단 노드/테넌트 탭 + 뷰 스위치 + 카드 슬라이더 + 단일 ag-Grid.
 *   - 박스A: 노드/테넌트 탭바 (⇅ viewMode 전환 + 검색 + 업무그룹 보기 토글)
 *   - 박스B: 테넌트/노드 카드 슬라이더 (큐 총수/활성/블록)
 *   - 박스C: CTI 큐 목록 ag-Grid (단일 그리드, 멤버 없음, 페이지네이션 없음)
 *
 * 행 더블클릭 → 5탭 Drawer (수정). "큐 등록" → 5탭 Drawer (그룹DN 결합 생성).
 *
 * 데이터: 전체 목록을 1회 조회 후 노드/테넌트/카드/검색 필터는 모두 클라이언트.
 *
 * NOTE: routes.tsx / 메뉴 등록은 통합 워커 담당.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Input } from 'antd';
import { ArrowUpDown, Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Network, Plus, Search, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CtiQueueFormDrawer, { type CtiQueueDrawerState } from '../../features/cti-queue/components/CtiQueueFormDrawer';
import CtiQueueGroupDrawer from '../../features/cti-queue/components/CtiQueueGroupDrawer';
import CtiQueueGroupTree from '../../features/cti-queue/components/CtiQueueGroupTree';
import CtiQueueTable from '../../features/cti-queue/components/CtiQueueTable';
import CtiQueueTenantCard from '../../features/cti-queue/components/CtiQueueTenantCard';
import {
  useCreateCtiQueueGroup,
  useDeleteCtiQueue,
  useDeleteCtiQueueGroup,
  useGetCtiQueueGroupOptions,
  useGetCtiQueueGroups,
  useGetCtiQueues,
  useReassignCtiQueueMembers,
  useUnassignCtiQueueMembers,
  useUpdateCtiQueueGroup,
} from '../../features/cti-queue/hooks/useCtiQueueQueries';
import type { CtiQueueGroupCreateRequest, CtiQueueGroupResponse, CtiQueueGroupUpdateRequest, CtiQueueResponse } from '../../features/cti-queue/types';
import { useGetDnProfileNodes, useGetDnProfileTenants } from '../../features/dn-profile/hooks/useDnProfileQueries';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '번호자원관리', path: '/ipron/cti-queue' },
  { title: '그룹DN', path: '/ipron/cti-queue' },
  { title: 'CTI 큐 관리', path: '/ipron/cti-queue' },
];

export default function CtiQueueList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();

  // 로그인 테넌트 ID (JWT — 사용자 본인 테넌트) — 페이지 진입 시 자동 선택
  const loginTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'byNode' | 'byTenant'>('byNode');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(loginTenantId);
  const [searchText, setSearchText] = useState('');
  // 업무그룹 패널 항상 표시 — 좌측 업무그룹 트리(TB_TR_CTIQ_MASTER) + 큐 D&D 배정 상시 노출 (SWAT IPR20S3020 업무그룹 트리).
  const groupView = true;
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null); // null=전체, 0=미배정, n=실제 트리
  const [selectedRows, setSelectedRows] = useState<CtiQueueResponse[]>([]);
  const [cardExpanded, setCardExpanded] = useState(true);
  const [drawer, setDrawer] = useState<CtiQueueDrawerState>({ open: false });

  // 업무그룹 트리 Drawer (추가/수정)
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [groupDrawerMode, setGroupDrawerMode] = useState<'create' | 'edit'>('create');
  const [groupDrawerParent, setGroupDrawerParent] = useState<CtiQueueGroupResponse | null>(null);
  const [groupDrawerTarget, setGroupDrawerTarget] = useState<CtiQueueGroupResponse | null>(null);
  const [groupDrawerTenantHint, setGroupDrawerTenantHint] = useState<number | null>(null);

  // loginTenantId 가 늦게 로드되는 경우 (auth fetch 비동기) 동기화
  useEffect(() => {
    if (loginTenantId != null && selectedTenantId === null) {
      setSelectedTenantId(loginTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginTenantId]);

  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedNodeRef = useRef(false);
  const hasInitializedTenantRef = useRef(false);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetDnProfileNodes();
  const { data: tenants = [] } = useGetDnProfileTenants();
  const { data: rows = [], isLoading } = useGetCtiQueues();
  const { data: groupOptions = [] } = useGetCtiQueueGroupOptions(selectedTenantId);

  // ─── Derived: 탭 항목 (행에서 노드/테넌트 추출) ──────────────────────────────
  const assignedNodes = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of rows) {
      if (r.nodeId == null) continue;
      if (!map.has(r.nodeId)) {
        map.set(r.nodeId, nodes.find((n) => n.nodeId === r.nodeId)?.nodeName ?? `노드 ${r.nodeId}`);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, nodes]);

  const assignedTenants = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of rows) {
      if (r.tenantId == null) continue;
      if (!map.has(r.tenantId)) {
        map.set(r.tenantId, r.tenantName ?? tenants.find((t) => t.tenantId === r.tenantId)?.tenantName ?? `테넌트 ${r.tenantId}`);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, tenants]);

  const tabItems = viewMode === 'byNode' ? assignedNodes : assignedTenants;

  // 선택된 탭 범위로 필터링된 행
  const rowsInTab = useMemo(() => {
    if (viewMode === 'byNode') {
      return selectedNodeId == null ? rows : rows.filter((r) => r.nodeId === selectedNodeId);
    }
    return selectedTenantId == null ? rows : rows.filter((r) => r.tenantId === selectedTenantId);
  }, [rows, viewMode, selectedNodeId, selectedTenantId]);

  // ─── 기본 라우팅그룹 이름맵 (그리드 "기본 라우팅그룹" 컬럼 표시용) ──────────────────
  // 업무그룹(treeName) 과는 별개 — 큐의 firstGroupId(TB_IC_GROUPMASTER) 라벨 표시에만 사용.
  const groupNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const g of groupOptions) m.set(g.id, g.name);
    return m;
  }, [groupOptions]);

  // ─── 카드 통계 ──────────────────────────────────────────────────────────────
  const cardStats = useMemo(() => {
    const map = new Map<number, { id: number; name: string; totalCnt: number; activeCnt: number; blockedCnt: number }>();
    for (const r of rowsInTab) {
      const key = viewMode === 'byNode' ? r.tenantId : r.nodeId;
      if (key == null) continue;
      const name =
        viewMode === 'byNode' ? (r.tenantName ?? tenants.find((t) => t.tenantId === key)?.tenantName ?? '-') : (nodes.find((n) => n.nodeId === key)?.nodeName ?? `노드 ${key}`);
      if (!map.has(key)) map.set(key, { id: key, name, totalCnt: 0, activeCnt: 0, blockedCnt: 0 });
      const g = map.get(key)!;
      g.totalCnt += 1;
      if (r.activateYn === 1) g.activeCnt += 1;
      if (r.blockYn === 1) g.blockedCnt += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rowsInTab, viewMode, tenants, nodes]);

  const totalStats = useMemo(() => {
    let totalCnt = 0;
    let activeCnt = 0;
    let blockedCnt = 0;
    for (const r of rowsInTab) {
      totalCnt += 1;
      if (r.activateYn === 1) activeCnt += 1;
      if (r.blockYn === 1) blockedCnt += 1;
    }
    return { totalCnt, activeCnt, blockedCnt };
  }, [rowsInTab]);

  const selectedCardId = viewMode === 'byNode' ? selectedTenantId : selectedNodeId;
  const setSelectedCardId = useCallback(
    (id: number | null) => {
      if (viewMode === 'byNode') setSelectedTenantId(id);
      else setSelectedNodeId(id);
    },
    [viewMode],
  );

  // ─── 그리드 표시용 행 (카드 + 텍스트 검색) ───────────────────────────────────
  const rowsForGrid = useMemo(() => {
    let list = rowsInTab;
    if (selectedCardId != null) {
      list = list.filter((r) => (viewMode === 'byNode' ? r.tenantId === selectedCardId : r.nodeId === selectedCardId));
    }
    // 업무그룹(treeName) 트리 필터 — 트리 노드 선택 시 적용 (0=미배정, null=전체)
    if (selectedTreeId != null) {
      list = list.filter((r) => (selectedTreeId === 0 ? r.treeId == null : r.treeId === selectedTreeId));
    }
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      list = list.filter((r) => [r.gdnNo, r.gdnName, r.ctiqName, r.tenantName, r.treeName].some((f) => f != null && String(f).toLowerCase().includes(kw)));
    }
    return list;
  }, [rowsInTab, selectedCardId, viewMode, searchText, selectedTreeId]);

  // 등록 폼에 넘길 테넌트/노드 컨텍스트 (선택된 카드/탭 기준 — 카드=전체면 null → Drawer 에서 직접 선택)
  const ctxTenantId = viewMode === 'byNode' ? (selectedCardId ?? selectedTenantId) : selectedTenantId;
  const ctxNodeId = viewMode === 'byNode' ? selectedNodeId : (selectedCardId ?? selectedNodeId);
  const ctxTenantName = assignedTenants.find((t) => t.id === ctxTenantId)?.name ?? tenants.find((t) => t.tenantId === ctxTenantId)?.tenantName ?? null;
  const ctxNodeName = nodes.find((n) => n.nodeId === ctxNodeId)?.nodeName ?? null;

  // 등록 Drawer 테넌트/노드 Select 옵션 (전체 마스터)
  const tenantSelectOptions = useMemo(() => tenants.map((t) => ({ value: t.tenantId, label: t.tenantName ?? `테넌트 ${t.tenantId}` })), [tenants]);
  const nodeSelectOptions = useMemo(() => nodes.map((n) => ({ value: n.nodeId, label: n.nodeName ?? `노드 ${n.nodeId}` })), [nodes]);

  // ─── 업무그룹 트리 (TB_TR_CTIQ_MASTER) — 항상 조회 ──────────────────────────
  // 트리는 테넌트 단위. 현재 스코프 테넌트(카드/탭) 가 있으면 그 테넌트, 없으면 전체.
  const treeTenantId = ctxTenantId;
  const { data: groupTree = [] } = useGetCtiQueueGroups({
    params: treeTenantId != null ? { tenantId: treeTenantId } : undefined,
    queryOptions: { enabled: true },
  });

  // 트리 "전체/미배정" 카운트 — 현재 그리드 범위(rowsInTab) 기준
  const treeDisplayCount = useMemo(() => {
    let total = 0;
    let unassigned = 0;
    for (const r of rowsInTab) {
      total += 1;
      if (r.treeId == null) unassigned += 1;
    }
    return { total, unassigned };
  }, [rowsInTab]);

  // ─── Auto-select 첫 탭 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (viewMode === 'byNode') {
      if (assignedNodes.length > 0 && !hasInitializedNodeRef.current && selectedNodeId == null) {
        hasInitializedNodeRef.current = true;
        setSelectedNodeId(assignedNodes[0].id);
      }
    } else {
      if (assignedTenants.length > 0 && !hasInitializedTenantRef.current && selectedTenantId == null) {
        hasInitializedTenantRef.current = true;
        setSelectedTenantId(assignedTenants[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, assignedNodes, assignedTenants]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleTabSelect = useCallback(
    (id: number) => {
      if (viewMode === 'byNode') {
        setSelectedNodeId(id);
        // 노드 전환 시 테넌트 스코프는 로그인 테넌트로 유지 (null 리셋 → 누수 방지)
        setSelectedTenantId((prev) => (prev === null ? null : (loginTenantId ?? prev)));
      } else {
        setSelectedTenantId(id);
        setSelectedNodeId(null);
      }
      setSearchText('');
      setSelectedTreeId(null);
    },
    [viewMode, loginTenantId],
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'byNode' ? 'byTenant' : 'byNode'));
    setSelectedNodeId(null);
    // viewMode 전환 시에도 테넌트 스코프는 로그인 테넌트로 복원 (null 리셋 → 누수 방지)
    setSelectedTenantId(loginTenantId);
    hasInitializedNodeRef.current = false;
    hasInitializedTenantRef.current = false;
    setSearchText('');
    setSelectedTreeId(null);
  }, [loginTenantId]);

  const { mutate: deleteQueue, isPending: isDeleting } = useDeleteCtiQueue({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI 큐가 삭제되었습니다');
        setSelectedRows([]);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  const handleCreate = () => {
    setDrawer({ open: true, mode: 'create', tenantId: ctxTenantId, tenantName: ctxTenantName, nodeId: ctxNodeId, nodeName: ctxNodeName });
  };

  const handleEdit = (row: CtiQueueResponse) => {
    setDrawer({
      open: true,
      mode: 'edit',
      row,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      nodeId: row.nodeId,
      nodeName: nodes.find((n) => n.nodeId === row.nodeId)?.nodeName ?? null,
    });
  };

  const handleDelete = (row: CtiQueueResponse) => {
    modal.confirm.execute({
      onOk: () => deleteQueue(row.ctiqId),
      options: {
        title: 'CTI 큐 삭제',
        content: `"${row.gdnName ?? row.ctiqName ?? row.ctiqId}" CTI 큐를 삭제하시겠습니까?\n그룹DN(번호 ${row.gdnNo ?? '-'})도 함께 삭제됩니다.`,
      },
    });
  };

  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => selectedRows.forEach((r) => deleteQueue(r.ctiqId)),
      options: {
        title: 'CTI 큐 일괄 삭제',
        content: `선택한 ${selectedRows.length}건의 CTI 큐를 삭제하시겠습니까?\n각 그룹DN도 함께 삭제됩니다.`,
      },
    });
  };

  // ─── 업무그룹 트리 mutations ────────────────────────────────────────────────
  const { mutate: createGroup, isPending: isCreatingGroup } = useCreateCtiQueueGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('업무그룹이 추가되었습니다');
        setGroupDrawerOpen(false);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '추가 실패')),
    },
  });
  const { mutate: updateGroup, isPending: isUpdatingGroup } = useUpdateCtiQueueGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('업무그룹이 수정되었습니다');
        setGroupDrawerOpen(false);
      },
      onError: (err: unknown) => toast.error(extractMsg(err, '수정 실패')),
    },
  });
  const { mutate: deleteGroup } = useDeleteCtiQueueGroup({
    mutationOptions: {
      onSuccess: () => toast.success('업무그룹이 삭제되었습니다'),
      onError: (err: unknown) => toast.error(extractMsg(err, '삭제 실패')),
    },
  });
  const { mutate: reassignMembers } = useReassignCtiQueueMembers({
    mutationOptions: {
      onSuccess: (count) => toast.success(`${count}건의 CTI 큐가 업무그룹에 배정되었습니다`),
      onError: (err: unknown) => toast.error(extractMsg(err, '배정 실패')),
    },
  });
  const { mutate: unassignMembers } = useUnassignCtiQueueMembers({
    mutationOptions: {
      onSuccess: (count) => toast.success(`${count}건의 CTI 큐 배정이 해제되었습니다`),
      onError: (err: unknown) => toast.error(extractMsg(err, '해제 실패')),
    },
  });

  // ─── 업무그룹 트리 핸들러 ───────────────────────────────────────────────────
  const handleCreateGroup = useCallback(
    (parent: CtiQueueGroupResponse | null, tenantHint?: number | null) => {
      const targetTenant = parent?.tenantId ?? tenantHint ?? treeTenantId;
      if (targetTenant == null) {
        toast.warning('루트 그룹을 추가할 테넌트를 먼저 선택하세요');
        return;
      }
      setGroupDrawerMode('create');
      setGroupDrawerParent(parent);
      setGroupDrawerTarget(null);
      setGroupDrawerTenantHint(targetTenant);
      setGroupDrawerOpen(true);
    },
    [treeTenantId],
  );

  const handleEditGroup = useCallback((group: CtiQueueGroupResponse) => {
    setGroupDrawerMode('edit');
    setGroupDrawerParent(null);
    setGroupDrawerTarget(group);
    setGroupDrawerTenantHint(group.tenantId);
    setGroupDrawerOpen(true);
  }, []);

  const handleDeleteGroup = useCallback(
    (group: CtiQueueGroupResponse) => {
      modal.confirm.execute({
        onOk: () => deleteGroup(group.treeId),
        options: { title: '업무그룹 삭제', content: `"${group.treeName}" 그룹과 하위 그룹/매핑이 모두 삭제됩니다. 진행하시겠습니까?` },
      });
    },
    [modal, deleteGroup],
  );

  const handleGroupDrawerSubmit = useCallback(
    (req: CtiQueueGroupCreateRequest | CtiQueueGroupUpdateRequest) => {
      if (groupDrawerMode === 'create') createGroup(req as CtiQueueGroupCreateRequest);
      else if (groupDrawerTarget) updateGroup({ id: groupDrawerTarget.treeId, body: req as CtiQueueGroupUpdateRequest });
    },
    [groupDrawerMode, groupDrawerTarget, createGroup, updateGroup],
  );

  // ─── D&D: 큐 → 업무그룹 노드 ────────────────────────────────────────────────
  const handleCtiQueueDrop = useCallback(
    (target: { treeId: number; tenantId: number | null }, ctiqIds: number[]) => {
      // 미배정 (treeId=0) 은 테넌트 검증 불필요
      if (target.treeId === 0) {
        unassignMembers(ctiqIds);
        return;
      }
      // 동일 테넌트 검증
      const dragged = rows.filter((r) => ctiqIds.includes(r.ctiqId));
      const mismatches = dragged.filter((r) => r.tenantId !== target.tenantId);
      if (mismatches.length > 0) {
        const names = mismatches
          .map((r) => r.gdnName ?? r.ctiqName ?? String(r.ctiqId))
          .slice(0, 3)
          .join(', ');
        const extra = mismatches.length > 3 ? ` 외 ${mismatches.length - 3}건` : '';
        toast.error(`다른 테넌트의 CTI 큐는 이동할 수 없습니다: ${names}${extra}`);
        return;
      }
      reassignMembers({ ctiqIds, targetTreeId: target.treeId });
    },
    [rows, reassignMembers, unassignMembers],
  );

  const getDragCtiqIds = useCallback(
    (dragRow: CtiQueueResponse): number[] => {
      const selectedIds = selectedRows.map((r) => r.ctiqId);
      if (selectedIds.length > 0 && selectedIds.includes(dragRow.ctiqId)) return selectedIds;
      return [dragRow.ctiqId];
    },
    [selectedRows],
  );

  const gridHeaderText = useMemo(() => {
    const tabName =
      viewMode === 'byNode'
        ? selectedNodeId
          ? (assignedNodes.find((n) => n.id === selectedNodeId)?.name ?? '선택 노드')
          : '전체'
        : selectedTenantId
          ? (assignedTenants.find((t) => t.id === selectedTenantId)?.name ?? '선택 테넌트')
          : '전체';
    const card = cardStats.find((g) => g.id === selectedCardId);
    const scope = card ? `${tabName} / ${card.name}` : tabName;
    return `${scope} CTI 큐 목록 (${rowsForGrid.length.toLocaleString()}건)`;
  }, [viewMode, selectedNodeId, selectedTenantId, assignedNodes, assignedTenants, cardStats, selectedCardId, rowsForGrid.length]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 박스A: 노드/테넌트 탭바 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
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

            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              aria-label="이전 탭"
            >
              <ChevronLeft className="size-4 text-gray-500" />
            </button>

            <div
              ref={tabScrollRef}
              className="flex items-stretch max-w-[900px] min-w-0 overflow-x-auto divide-x divide-gray-200"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {tabItems.map((item) => {
                const currentSelected = viewMode === 'byNode' ? selectedNodeId : selectedTenantId;
                const isActive = currentSelected === item.id;
                const Icon = viewMode === 'byNode' ? Network : Building2;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] w-[140px] flex-shrink-0 transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700 border-b-current' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                    }`}
                    onClick={(e) => {
                      handleTabSelect(item.id);
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                  >
                    <Icon className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              aria-label="다음 탭"
            >
              <ChevronRight className="size-4 text-gray-500" />
            </button>

            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="그룹DN번호 / 큐이름 검색"
                value={searchText}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                style={{ width: 220 }}
              />
            </div>
          </div>
        </div>

        {/* ===== 박스B: 카드 슬라이더 ===== */}
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
                  <CtiQueueTenantCard cardId={null} cardName="전체" stats={totalStats} selected={selectedCardId === null} onClick={() => setSelectedCardId(null)} />
                  {cardStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                      <Empty description={false} imageStyle={{ height: 40 }} />
                      <span className="text-sm">등록된 CTI 큐가 없습니다</span>
                    </div>
                  ) : (
                    cardStats.map((g) => (
                      <CtiQueueTenantCard
                        key={g.id}
                        cardId={g.id}
                        cardName={g.name}
                        stats={{ totalCnt: g.totalCnt, activeCnt: g.activeCnt, blockedCnt: g.blockedCnt }}
                        selected={selectedCardId === g.id}
                        onClick={(e) => {
                          setSelectedCardId(g.id);
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
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-4" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-7 !h-7 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-2 overflow-x-auto flex-1 items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <CompactPill name="전체" count={totalStats.totalCnt} selected={selectedCardId === null} onClick={() => setSelectedCardId(null)} />
                  {cardStats.map((g) => (
                    <CompactPill
                      key={g.id}
                      name={g.name}
                      count={g.totalCnt}
                      selected={selectedCardId === g.id}
                      onClick={(e) => {
                        setSelectedCardId(g.id);
                        (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }}
                    />
                  ))}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-4" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-7 !h-7 !p-0"
                />
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

        {/* ===== 박스C: 좌측 업무그룹 트리 + 우측 ag-Grid (항상 표시) ===== */}
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="bg-white bt-shadow flex flex-col w-[280px] flex-shrink-0 overflow-hidden">
            <div className="flex items-center px-4 h-[44px] border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700">업무그룹</span>
              <button
                type="button"
                onClick={() => handleCreateGroup(null, treeTenantId)}
                disabled={treeTenantId == null}
                className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#405189] text-[#405189] text-xs hover:bg-[#405189]/5 disabled:opacity-40 disabled:cursor-not-allowed"
                title={treeTenantId == null ? '테넌트를 먼저 선택하세요' : '루트 그룹 추가'}
              >
                <Plus className="size-3" /> 루트
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <CtiQueueGroupTree
                groups={groupTree}
                totalCtiqCount={treeDisplayCount.total}
                totalUnassignedCount={treeDisplayCount.unassigned}
                selectedTreeId={selectedTreeId}
                selectedTenantId={treeTenantId}
                onSelect={setSelectedTreeId}
                onCreateChild={(parent) => handleCreateGroup(parent, treeTenantId)}
                onEdit={handleEditGroup}
                onDelete={handleDeleteGroup}
                onCtiQueueDrop={handleCtiQueueDrop}
              />
            </div>
          </div>

          <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
              <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
              {selectedRows.length > 0 && (
                <span className="text-xs text-gray-500">
                  {rowsForGrid.length.toLocaleString()}건 중 {selectedRows.length}건 선택
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button
                  danger
                  icon={<Trash2 className="size-3.5" />}
                  onClick={handleDeleteSelected}
                  loading={isDeleting}
                  disabled={selectedRows.length === 0}
                  title={selectedRows.length === 0 ? '삭제할 큐를 선택하세요' : '선택한 큐 삭제'}
                >
                  {selectedRows.length > 0 ? `삭제 (${selectedRows.length})` : '삭제'}
                </Button>
                <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                  큐 등록
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <CtiQueueTable
                rowData={rowsForGrid}
                isLoading={isLoading}
                groupOptions={groupOptions}
                groupView={true}
                onRowDoubleClicked={handleEdit}
                onDelete={handleDelete}
                onSelectionChanged={setSelectedRows}
                onBulkDelete={handleDeleteSelected}
                selectedCount={selectedRows.length}
                getDragCtiqIds={getDragCtiqIds}
              />
            </div>
          </div>
        </div>
      </div>

      <CtiQueueFormDrawer state={drawer} onClose={() => setDrawer({ open: false })} tenantOptions={tenantSelectOptions} nodeOptions={nodeSelectOptions} />

      {/* 업무그룹 추가/수정 Drawer */}
      <CtiQueueGroupDrawer
        open={groupDrawerOpen}
        mode={groupDrawerMode}
        tenantId={groupDrawerTenantHint}
        parent={groupDrawerParent}
        group={groupDrawerTarget}
        onCancel={() => setGroupDrawerOpen(false)}
        onSubmit={handleGroupDrawerSubmit}
        loading={isCreatingGroup || isUpdatingGroup}
      />
    </div>
  );
}

// ─── 컴팩트 카드 pill (카드 축소 모드) ──────────────────────────────────────
interface CompactPillProps {
  name: string;
  count: number;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
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

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}
