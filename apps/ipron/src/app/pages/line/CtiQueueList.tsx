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
import { Button, Empty, Input, Modal, Table } from 'antd';
import { ArrowUpDown, Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Download, Network, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { ctiQueueApi } from '../../features/cti-queue/api/ctiQueueApi';
import CtiQueueBulkUpdateModal from '../../features/cti-queue/components/CtiQueueBulkUpdateModal';
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
  useGetCtiQueueMediaOptions,
  useGetCtiQueueSkillsetOptions,
  useGetCtiQueues,
  useReassignCtiQueueMembers,
  useReorderCtiQueueGroup,
  useUnassignCtiQueueMembers,
  useUpdateCtiQueueGroup,
} from '../../features/cti-queue/hooks/useCtiQueueQueries';
import type { CtiQueueGroupCreateRequest, CtiQueueGroupReorderPosition, CtiQueueGroupResponse, CtiQueueGroupUpdateRequest, CtiQueueResponse } from '../../features/cti-queue/types';
import { useGetDnProfileNodes, useGetDnProfileTenants } from '../../features/dn-profile/hooks/useDnProfileQueries';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '교환기 번호관리' }, { title: 'CTI 큐', path: '/ipron/cti-queue' }];

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
  const [cardExpanded, setCardExpanded] = useState(false);
  const [drawer, setDrawer] = useState<CtiQueueDrawerState>({ open: false });
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // 업무그룹 트리 Drawer (추가/수정)
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [groupDrawerMode, setGroupDrawerMode] = useState<'create' | 'edit'>('create');
  const [groupDrawerParent, setGroupDrawerParent] = useState<CtiQueueGroupResponse | null>(null);
  const [groupDrawerTarget, setGroupDrawerTarget] = useState<CtiQueueGroupResponse | null>(null);
  const [groupDrawerTenantHint, setGroupDrawerTenantHint] = useState<number | null>(null);

  // ─── 내보내기/가져오기 상태 (GAP2/3) ─────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResultModal, setImportResultModal] = useState<{
    open: boolean;
    successCount: number;
    errors: { rowNum: number; message: string }[];
  }>({ open: false, successCount: 0, errors: [] });
  const importFileInputRef = useRef<HTMLInputElement>(null);

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
  const { data: skillsetOptions = [] } = useGetCtiQueueSkillsetOptions(selectedTenantId);
  const { data: mediaOptions = [] } = useGetCtiQueueMediaOptions();

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

  // ─── 전체(무필터) 업무그룹 — 카드 "업무그룹수" 스탯 SoT. 스코프 무관 전 테넌트 그룹. ──
  const { data: allGroups = [] } = useGetCtiQueueGroups({ queryOptions: { enabled: true } });

  // 테넌트별 업무그룹(TB_TR_CTIQ_MASTER) 개수 — 트리 노드 재귀 카운트.
  const groupCntByTenant = useMemo(() => {
    const m = new Map<number, number>();
    const walk = (list: CtiQueueGroupResponse[]) => {
      for (const n of list) {
        if (n.tenantId != null) m.set(n.tenantId, (m.get(n.tenantId) ?? 0) + 1);
        if ((n.children ?? []).length) walk(n.children);
      }
    };
    walk(allGroups);
    return m;
  }, [allGroups]);

  // ─── 카드 통계 ──────────────────────────────────────────────────────────────
  // 업무그룹수(groupCnt): byNode 카드=테넌트 → 그 테넌트의 TB_TR_CTIQ_MASTER 그룹 수.
  //   byTenant 카드=노드 → 모두 동일(선택) 테넌트 소속이므로 그 테넌트 그룹 수를 공통 표기.
  const cardStats = useMemo(() => {
    const map = new Map<number, { id: number; name: string; totalCnt: number; activeCnt: number; groupCnt: number }>();
    for (const r of rowsInTab) {
      const key = viewMode === 'byNode' ? r.tenantId : r.nodeId;
      if (key == null) continue;
      const name =
        viewMode === 'byNode' ? (r.tenantName ?? tenants.find((t) => t.tenantId === key)?.tenantName ?? '-') : (nodes.find((n) => n.nodeId === key)?.nodeName ?? `노드 ${key}`);
      if (!map.has(key)) {
        // byNode: key=tenantId; byTenant: 모든 노드 카드가 선택 테넌트 1개 소속.
        const groupCnt = viewMode === 'byNode' ? (groupCntByTenant.get(key) ?? 0) : selectedTenantId != null ? (groupCntByTenant.get(selectedTenantId) ?? 0) : 0;
        map.set(key, { id: key, name, totalCnt: 0, activeCnt: 0, groupCnt });
      }
      const g = map.get(key)!;
      g.totalCnt += 1;
      if (r.activateYn === 1) g.activeCnt += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rowsInTab, viewMode, tenants, nodes, groupCntByTenant, selectedTenantId]);

  const totalStats = useMemo(() => {
    let totalCnt = 0;
    let activeCnt = 0;
    for (const r of rowsInTab) {
      totalCnt += 1;
      if (r.activateYn === 1) activeCnt += 1;
    }
    // "전체" 카드 업무그룹수: 현재 스코프(rowsInTab)에 등장하는 테넌트들의 그룹 수 합.
    const scopeTenants = new Set<number>();
    for (const r of rowsInTab) if (r.tenantId != null) scopeTenants.add(r.tenantId);
    let groupCnt = 0;
    for (const tid of scopeTenants) groupCnt += groupCntByTenant.get(tid) ?? 0;
    return { totalCnt, activeCnt, groupCnt };
  }, [rowsInTab, groupCntByTenant]);

  const selectedCardId = viewMode === 'byNode' ? selectedTenantId : selectedNodeId;
  const setSelectedCardId = useCallback(
    (id: number | null) => {
      if (viewMode === 'byNode') setSelectedTenantId(id);
      else setSelectedNodeId(id);
    },
    [viewMode],
  );

  // 등록 폼에 넘길 테넌트/노드 컨텍스트 (선택된 카드/탭 기준 — 카드=전체면 null → Drawer 에서 직접 선택)
  // byNode 모드: 카드=테넌트. 카드가 명시적으로 선택된 경우에만 해당 테넌트를 넘기고,
  //             "전체" 카드(selectedCardId === null)면 null → Drawer 에서 테넌트 직접 선택.
  //             (selectedTenantId 폴백 사용 금지 — 항상 loginTenantId 로 고정되어 버그 발생)
  const ctxTenantId = viewMode === 'byNode' ? selectedCardId : selectedTenantId;
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

  // ─── 업무그룹 트리 ID 재귀 수집 (SWAT IPR20S3020 WITH RECURSIVE CTE 정합) ────────
  // 선택된 treeId 의 모든 하위 그룹 ID 를 FE 메모리에서 재귀 수집.
  // SWAT selCtiqList: treeId != 0 이면 SubTree CTE 로 하위 포함 — FE 는 groupTree 를 이용해 동등 구현.
  const treeDescendantIds = useMemo((): Set<number> => {
    if (selectedTreeId == null || selectedTreeId === 0) return new Set();
    const result = new Set<number>();
    const walk = (nodes: CtiQueueGroupResponse[]) => {
      for (const n of nodes) {
        if (n.treeId === selectedTreeId || result.has(n.treeId)) {
          // 자기 자신 및 모든 하위 노드 수집
          const collectAll = (sub: CtiQueueGroupResponse[]) => {
            for (const s of sub) {
              result.add(s.treeId);
              if ((s.children ?? []).length) collectAll(s.children);
            }
          };
          result.add(n.treeId);
          collectAll(n.children ?? []);
        } else if ((n.children ?? []).length) {
          walk(n.children);
        }
      }
    };
    walk(groupTree);
    return result;
  }, [selectedTreeId, groupTree]);

  // ─── 그리드 표시용 행 (카드 + 텍스트 검색) ───────────────────────────────────
  const rowsForGrid = useMemo(() => {
    let list = rowsInTab;
    if (selectedCardId != null) {
      list = list.filter((r) => (viewMode === 'byNode' ? r.tenantId === selectedCardId : r.nodeId === selectedCardId));
    }
    // 업무그룹(treeName) 트리 필터 — 트리 노드 선택 시 적용 (0=미배정, null=전체)
    // SWAT CTE 재귀 정합: 선택 노드 하위 그룹(treeDescendantIds)도 포함
    if (selectedTreeId != null) {
      list = list.filter((r) => (selectedTreeId === 0 ? r.treeId == null : r.treeId != null && treeDescendantIds.has(r.treeId)));
    }
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      list = list.filter((r) => [r.gdnNo, r.gdnName, r.ctiqName, r.tenantName, r.treeName].some((f) => f != null && String(f).toLowerCase().includes(kw)));
    }
    return list;
  }, [rowsInTab, selectedCardId, viewMode, searchText, selectedTreeId, treeDescendantIds]);

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

  // ─── 트리에 내려보낼 그룹 ─────────────────────────────────────────────────────
  // byNode + 전체(admin, treeTenantId==null)에서 groupTree 는 전 테넌트 그룹을 담는다.
  // 선택 노드에 큐가 0인 테넌트(빈 테스트 그룹 등)는 통째로 숨긴다 — "노드에 큐 있는 테넌트의 그룹만".
  //  · 노드 presence 있는 테넌트는 그 테넌트 그룹 전부 표시(빈 그룹도 — 배정 대상).
  //  · byTenant 모드/특정 테넌트 카드 선택(treeTenantId!=null) 시엔 이미 테넌트 단위라 그대로.
  const treeGroups = useMemo(() => {
    if (treeTenantId != null) return groupTree; // 단일 테넌트 스코프 — 그대로
    if (viewMode !== 'byNode') return groupTree; // byTenant 전체는 기존 동작 유지
    const presentTenants = new Set<number>();
    for (const r of rowsInTab) if (r.tenantId != null) presentTenants.add(r.tenantId);
    return groupTree.filter((n) => n.tenantId != null && presentTenants.has(n.tenantId));
  }, [groupTree, treeTenantId, viewMode, rowsInTab]);

  // 트리 노드별 배지 카운트 — 현재 그리드 범위(rowsInTab)에서 각 배정 그룹(treeId)에 속한 큐 수.
  // BE getGroups 의 절대 멤버 수(node.ctiqCount, 전 스코프 고정값) 대신 사용해
  // 전체 칩/그리드와 동일한 분모를 유지한다.
  const treeScopedCount = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of rowsInTab) {
      if (r.treeId == null) continue;
      m.set(r.treeId, (m.get(r.treeId) ?? 0) + 1);
    }
    return m;
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

  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => selectedRows.forEach((r) => deleteQueue(r.ctiqId)),
      options: {
        title: 'CTI 큐 일괄 삭제',
        content: `선택한 ${selectedRows.length}건의 CTI 큐를 삭제하시겠습니까?`,
      },
    });
  };

  // ─── GAP2: Excel 내보내기 ────────────────────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await ctiQueueApi.exportExcel(selectedTenantId != null ? { tenantId: selectedTenantId } : undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `CTI큐목록_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Excel 내보내기에 실패했습니다');
    } finally {
      setIsExporting(false);
    }
  };

  // ─── GAP3: Excel 가져오기 ────────────────────────────────────────────────────
  const handleImportClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 파일 선택 후 input 초기화 (동일 파일 재선택 허용)
    e.target.value = '';
    setIsImporting(true);
    try {
      const res = await ctiQueueApi.importExcel(file);
      const data = res.data ?? { successCount: 0, errors: [] };
      setImportResultModal({ open: true, successCount: data.successCount ?? 0, errors: data.errors ?? [] });
    } catch {
      toast.error('Excel 가져오기에 실패했습니다');
    } finally {
      setIsImporting(false);
    }
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
  const { mutate: reorderGroup } = useReorderCtiQueueGroup({
    mutationOptions: {
      onError: (err: unknown) => toast.error(extractMsg(err, '순서 변경 실패')),
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
        options: { title: '업무그룹 삭제', content: `"${group.treeName}" 그룹을 삭제하시겠습니까?` },
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

  // ─── 업무그룹 트리 D&D 재배치 ──────────────────────────────────────────────
  const handleGroupReorder = useCallback(
    (movedTreeId: number, position: CtiQueueGroupReorderPosition, referenceTreeId: number) => {
      reorderGroup({ treeId: movedTreeId, body: { position, referenceTreeId } });
    },
    [reorderGroup],
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

  // 제목은 "CTI 큐 목록 (N건)" 만 — 노드/테넌트 스코프 접두 제거 (사용자 요청).
  const gridHeaderText = useMemo(() => `CTI 큐 목록 (${rowsForGrid.length.toLocaleString()}건)`, [rowsForGrid.length]);

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
                      isActive ? 'bg-blue-50 text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
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
              {/* BP-1: 화면 전역 액션(엑셀류) → 헤더 박스 */}
              <Button icon={<Download className="size-3.5" />} loading={isExporting} onClick={handleExport} title="CTI 큐 목록 Excel 내보내기">
                엑셀
              </Button>
              <Button icon={<Upload className="size-3.5" />} loading={isImporting} onClick={handleImportClick} title="Excel 파일로 CTI 큐 일괄 등록">
                가져오기
              </Button>
              <input ref={importFileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportFileChange} />
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
                        stats={{ totalCnt: g.totalCnt, activeCnt: g.activeCnt, groupCnt: g.groupCnt }}
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
                groups={treeGroups}
                totalCtiqCount={treeDisplayCount.total}
                totalUnassignedCount={treeDisplayCount.unassigned}
                scopedCount={treeScopedCount}
                selectedTreeId={selectedTreeId}
                selectedTenantId={treeTenantId}
                onSelect={setSelectedTreeId}
                onCreateChild={(parent) => handleCreateGroup(parent, treeTenantId)}
                onEdit={handleEditGroup}
                onDelete={handleDeleteGroup}
                onCtiQueueDrop={handleCtiQueueDrop}
                onGroupReorder={handleGroupReorder}
              />
            </div>
          </div>

          <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
              <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
              <span className={`text-xs text-gray-500 ${selectedRows.length === 0 ? 'invisible' : ''}`}>
                {rowsForGrid.length.toLocaleString()}건 중 {selectedRows.length}건 선택
              </span>
              <div className="ml-auto flex items-center gap-2">
                {/* BP-2 CRUD 문법: [삭제 danger] → [보조: 일괄 설정 default] → [등록 primary] */}
                <Button
                  danger
                  icon={<Trash2 className="size-3.5" />}
                  onClick={handleDeleteSelected}
                  loading={isDeleting}
                  disabled={selectedRows.length === 0}
                  title={selectedRows.length === 0 ? '삭제할 큐를 선택하세요' : '선택한 큐 삭제'}
                >
                  삭제
                </Button>
                {/* P1: 일괄 설정 (BP-3: default variant, 인라인 색 제거) */}
                <Button
                  icon={<Pencil className="size-3.5" />}
                  onClick={() => setBulkModalOpen(true)}
                  disabled={selectedRows.length === 0}
                  title={selectedRows.length === 0 ? '설정할 큐를 선택하세요' : `선택한 ${selectedRows.length}건 일괄 설정`}
                >
                  일괄 설정{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
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
                onSelectionChanged={setSelectedRows}
                getDragCtiqIds={getDragCtiqIds}
              />
            </div>
          </div>
        </div>
      </div>

      <CtiQueueFormDrawer state={drawer} onClose={() => setDrawer({ open: false })} tenantOptions={tenantSelectOptions} nodeOptions={nodeSelectOptions} />

      {/* P1: 일괄 설정 모달 */}
      <CtiQueueBulkUpdateModal
        open={bulkModalOpen}
        selectedRows={selectedRows}
        skillsetOptions={skillsetOptions}
        groupOptions={groupOptions}
        mediaOptions={mediaOptions}
        onClose={() => setBulkModalOpen(false)}
      />

      {/* GAP3: 가져오기 결과 모달 */}
      <Modal
        open={importResultModal.open}
        title={`Excel 가져오기 결과 — 성공 ${importResultModal.successCount}건${importResultModal.errors.length > 0 ? ` / 오류 ${importResultModal.errors.length}건` : ''}`}
        onCancel={() => setImportResultModal((s) => ({ ...s, open: false }))}
        footer={
          <Button type="primary" onClick={() => setImportResultModal((s) => ({ ...s, open: false }))}>
            확인
          </Button>
        }
        width={600}
      >
        {importResultModal.errors.length === 0 ? (
          <p className="text-green-600 font-medium">모든 행이 성공적으로 등록되었습니다.</p>
        ) : (
          <>
            {importResultModal.successCount > 0 && (
              <p className="text-gray-600 mb-2">
                {importResultModal.successCount}건 등록 성공 / {importResultModal.errors.length}건 오류
              </p>
            )}
            {importResultModal.successCount === 0 && <p className="text-red-600 mb-2">모든 행에서 오류가 발생했습니다.</p>}
            <Table
              size="small"
              dataSource={importResultModal.errors.map((e) => ({ ...e, key: e.rowNum }))}
              columns={[
                { title: '행 번호', dataIndex: 'rowNum', width: 80 },
                { title: '오류 내용', dataIndex: 'message', ellipsis: true },
              ]}
              pagination={false}
              scroll={{ y: 240 }}
            />
          </>
        )}
      </Modal>

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
