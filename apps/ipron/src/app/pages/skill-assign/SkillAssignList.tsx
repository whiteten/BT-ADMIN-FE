/**
 * 스킬 배정 페이지 (AS-IS SWAT IPR20S5090 + IPR20S5080 통합).
 *
 * 레이아웃:
 *  - 상단 테넌트 카드 슬라이더 (ADN 패턴) — 전체/테넌트별 선택 selector
 *  - 모드 토글 (① 상담사별 스킬 관리 / ③ 스킬모음 관리) ※ ② 스킬별 상담사 = Phase 2
 *  - 모드 ①: 좌 상담사 목록 + 우 보유 스킬셋 칩 + 스킬 추가 버튼
 *  - 모드 ③: 스킬모음 목록 + 등록/수정/삭제
 *
 * Phase 1: 칩 UI + 기본 CRUD. 매트릭스/diff/라우팅 시각화는 Phase 2.
 *
 * UX 개선 (시안 2026-06-06):
 *  - 배정 버튼 우측 패널 상단 툴바에 항상 노출 (선택 전 비활성 + 안내)
 *  - P/L 인라인 입력란 툴바 고정 (기본값 0/0, SWAT sPriority/sSkillLevel 정합)
 *  - InlineAssignPanel 카드 P/L 셀 클릭→인라인 편집→blur/Enter 자동저장
 *  - GrantDrawer는 fallback으로 유지 (P/L 확인 경로)
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { CellClickedEvent, ColDef, GridOptions, IRowNode } from 'ag-grid-community';
import { AgGridReact, type AgGridReact as AgGridReactType } from 'ag-grid-react';
import { Button, Empty, Input, InputNumber, Modal, Popover, Segmented, Spin, Tag } from 'antd';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  ClipboardList,
  Eye,
  FilterX,
  FolderOpen,
  Layers,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AgentGroupTree from '../../features/agent-master/components/AgentGroupTree';
import { useGetAgentGroupTree, useGetAgents } from '../../features/agent-master/hooks/useAgentMasterQueries';
import type { AgentResponse } from '../../features/agent-master/types';
import SkillAgentChipList from '../../features/skill-assign/components/SkillAgentChipList';
import SkillAgentEditDrawer from '../../features/skill-assign/components/SkillAgentEditDrawer';
import SkillAssignGrantDrawer, { type GrantMapping } from '../../features/skill-assign/components/SkillAssignGrantDrawer';
import SkillAssignStatusModal from '../../features/skill-assign/components/SkillAssignStatusModal';
import SkillAssignTenantCard from '../../features/skill-assign/components/SkillAssignTenantCard';
import SkillGroupApplyDrawer from '../../features/skill-assign/components/SkillGroupApplyDrawer';
import {
  useBulkGrant,
  useBulkRevoke,
  useBulkUpdatePl,
  useGetAgentCoverage,
  useGetAgentsBySkillset,
  useGetSkillAssignTenants,
  useGetSkillsetCoverage,
  useGetSkillsetsByAgent,
  useUpdateSkillAgent,
} from '../../features/skill-assign/hooks/useSkillAssignQueries';
import type { SkillAgentResponse } from '../../features/skill-assign/types';
import SkillsetGroupTree from '../../features/skillset-master/components/SkillsetGroupTree';
import { useGetSkillsetGroups, useGetSkillsets } from '../../features/skillset-master/hooks/useSkillsetQueries';
import { type SkillsetResponse, getMediaTypeName } from '../../features/skillset-master/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb = [{ title: '상담사 관리' }, { title: '스킬 관리' }, { title: '상담사 스킬 배정', path: '/ipron/skill-assign' }];

type Mode = 'agent' | 'skillset' | 'view';
type ViewSubMode = 'agent' | 'skillset'; // 조회 탭 내 기준 토글

export default function SkillAssignList() {
  const { gridOptions: baseGridOptions } = useAggridOptions();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── Grid Refs (for quickFilter / filter reset) ──────────────────────────
  const agentGridRef1 = useRef<AgGridReactType<AgentResponse>>(null); // 모드① 좌 / 모드② 우
  const agentGridRef2 = useRef<AgGridReactType<AgentResponse>>(null); // 모드② 우 (동일 컴포넌트, 별도 ref)
  const skillsetGridRef1 = useRef<AgGridReactType<SkillsetResponse>>(null); // 모드① 우
  const skillsetGridRef2 = useRef<AgGridReactType<SkillsetResponse>>(null); // 모드② 좌

  // ─── Tree Panel Refs (트리 접기/펼치기 imperative) ──────────────────────
  // 모드① 좌(상담그룹 트리) / 모드① 우(업무그룹 트리) / 모드② 좌(업무그룹 트리) / 모드② 우(상담그룹 트리)
  const agentTreePanelRef1 = useRef<ImperativePanelHandle>(null); // 모드① 좌
  const skillsetTreePanelRef1 = useRef<ImperativePanelHandle>(null); // 모드① 우
  const skillsetTreePanelRef2 = useRef<ImperativePanelHandle>(null); // 모드② 좌
  const agentTreePanelRef2 = useRef<ImperativePanelHandle>(null); // 모드② 우
  // 접힘 상태 (토글 버튼 아이콘 방향용)
  const [agentTreeCollapsed1, setAgentTreeCollapsed1] = useState(false);
  const [skillsetTreeCollapsed1, setSkillsetTreeCollapsed1] = useState(false);
  const [skillsetTreeCollapsed2, setSkillsetTreeCollapsed2] = useState(false);
  const [agentTreeCollapsed2, setAgentTreeCollapsed2] = useState(false);

  // 트리 패널 토글 헬퍼
  const toggleTreePanel = useCallback((ref: React.RefObject<ImperativePanelHandle | null>) => {
    const panel = ref.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  }, []);

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('agent');
  const [cardExpanded, setCardExpanded] = useState(false);

  // 모드 ① 상담사별 (multi-select 양방향 + 트리 필터)
  const [agentSearch, setAgentSearch] = useState('');
  const [skillsetSearch, setSkillsetSearch] = useState('');

  // 디바운스된 Quick Filter 값
  const [agentQuickFilter, setAgentQuickFilter] = useState('');
  const [skillsetQuickFilter, setSkillsetQuickFilter] = useState('');
  const agentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skillsetDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedAgentGroupId, setSelectedAgentGroupId] = useState<number | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
  const [selectedSkillsetTreeId, setSelectedSkillsetTreeId] = useState<number | null>(null);
  const [selectedSkillsetIds, setSelectedSkillsetIds] = useState<number[]>([]);
  // 교차테넌트 방지: row 선택 시 그 row 의 tenantId 로 상대 목록을 좁힘. 선택 해제 시 null(전체 복귀).
  const [lockedTenantId, setLockedTenantId] = useState<number | null>(null);
  const [grantDrawerOpen, setGrantDrawerOpen] = useState(false);
  // (legacy single-select 잔재 — mode 'group' 의존성 위해 임시 유지)
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<SkillAgentResponse | null>(null);

  // 툴바 P/L 기본값 입력 (항상 노출 — 배정 버튼 옆, SWAT sPriority/sSkillLevel 정합)
  const [toolbarPriority, setToolbarPriority] = useState<number>(0);
  const [toolbarSkillLevel, setToolbarSkillLevel] = useState<number>(0);

  // hover 팝오버용: 마우스 오버 중인 상담사/스킬셋 ID (InlineAssignPanel hover 구동)
  const [hoverAgentId, setHoverAgentId] = useState<number | null>(null);
  const [hoverSkillsetId, setHoverSkillsetId] = useState<number | null>(null);
  // 패널 내부 hover 여부 (마우스가 그리드→패널로 이동해도 닫히지 않게)
  const [panelHovered, setPanelHovered] = useState(false);
  // panelHovered ref — gridOptions useMemo(빈 deps) 내 onCellMouseOut 에서 최신 값 참조용
  const panelHoveredRef = useRef(false);
  panelHoveredRef.current = panelHovered;
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 보유건수 셀 hover 여부 ref — 이 셀 위에서는 InlineAssignPanel 억제
  // (상담사 그리드의 AgentCoverageCell / 스킬셋 그리드의 SkillsetCoverageCell 공통)
  const coverageCellHoveredRef = useRef(false);

  // 배정 현황 모달 (읽기 전용)
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  // 스킬모음 적용 드로어 (플로팅 액션바 [스킬모음 적용] — 상담사 ≥1 체크 시 활성)
  const [applyDrawerOpen, setApplyDrawerOpen] = useState(false);

  // ② 보기 필터 — 모드① 스킬셋 그리드 / 모드② 상담사 그리드
  // 'all' | 'assigned' | 'unassigned'
  const [skillsetViewFilter, setSkillsetViewFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [agentViewFilter, setAgentViewFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // 모드 ④ 배정 현황 조회 (view)
  const [viewSubMode, setViewSubMode] = useState<ViewSubMode>('agent');
  const [viewSelectedAgentId, setViewSelectedAgentId] = useState<number | null>(null);
  const [viewSelectedSkillsetId, setViewSelectedSkillsetId] = useState<number | null>(null);
  const viewAgentGridRef = useRef<AgGridReactType<AgentResponse>>(null);
  const viewSkillsetGridRef = useRef<AgGridReactType<SkillsetResponse>>(null);
  // 모드 ④ 트리 필터 — 상담사 기준: 상담그룹, 스킬셋 기준: 업무그룹
  const [viewAgentGroupId, setViewAgentGroupId] = useState<number | null>(null);
  const [viewSkillsetTreeId, setViewSkillsetTreeId] = useState<number | null>(null);
  // 모드 ④ 트리 패널 접힘 상태
  const viewAgentTreePanelRef = useRef<ImperativePanelHandle>(null);
  const viewSkillsetTreePanelRef = useRef<ImperativePanelHandle>(null);
  const [viewAgentTreeCollapsed, setViewAgentTreeCollapsed] = useState(false);
  const [viewSkillsetTreeCollapsed, setViewSkillsetTreeCollapsed] = useState(false);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: tenantStats = [] } = useGetSkillAssignTenants();

  // 상담사 / 상담그룹 트리 / 스킬셋 / 업무그룹 트리 — 양쪽 모드 모두 필요 (좌우 반전만 다름)
  // 카드 selectedTenantId 가 있으면 그 테넌트로 BE 조회를 필터링, null(전체) 이면 전체 조회.
  const { data: agents = [], isLoading: agentsLoading } = useGetAgents({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
  });

  const { data: agentGroupTree = [] } = useGetAgentGroupTree({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
  });

  const { data: skillsetGroups = [] } = useGetSkillsetGroups({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
  });

  const { data: skillsetMasters = [], isLoading: skillsetMastersLoading } = useGetSkillsets({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
  });

  // 선택 N명 기준 보유율 (모드 ① 우측 시각화)
  const { data: coverage = [] } = useGetSkillsetCoverage(selectedAgentIds, {
    queryOptions: { enabled: selectedAgentIds.length > 0 },
  });

  // 선택 M건 기준 상담사별 보유 수 (모드 ② 우측 시각화)
  const { data: agentCoverage = [] } = useGetAgentCoverage(selectedSkillsetIds, {
    queryOptions: { enabled: selectedSkillsetIds.length > 0 },
  });

  // 모드 ④ 조회 탭 — 선택 상담사의 스킬셋 / 선택 스킬셋의 상담사
  const { data: viewAgentSkillsets = [], isFetching: viewAgentSkillsetsFetching } = useGetSkillsetsByAgent(mode === 'view' && viewSubMode === 'agent' ? viewSelectedAgentId : null);
  const { data: viewSkillsetAgents = [], isFetching: viewSkillsetAgentsFetching } = useGetAgentsBySkillset(
    mode === 'view' && viewSubMode === 'skillset' ? viewSelectedSkillsetId : null,
  );

  // 모드 ① 단일 상담사 선택 시 — 그 상담사의 배정 스킬셋(priority/skillLevel 포함).
  // 스킬셋 그리드 정렬(배정 상단) 계산에 사용. 2명+ 선택 / 미선택 시 enabled=false.
  const singleAgentId = selectedAgentIds.length === 1 ? selectedAgentIds[0] : null;
  const { data: singleAgentSkillsets = [] } = useGetSkillsetsByAgent(singleAgentId, {
    queryOptions: { enabled: singleAgentId != null },
  });

  // 모드 ② 단일 스킬셋 선택 시 — 그 스킬셋의 배정 상담사(priority/skillLevel 포함).
  // 상담사 그리드 정렬(배정 상단) 계산에 사용. 2건+ 선택 / 미선택 시 enabled=false.
  const singleSkillsetId = selectedSkillsetIds.length === 1 ? selectedSkillsetIds[0] : null;
  const { data: singleSkillsetAgents = [] } = useGetAgentsBySkillset(singleSkillsetId, {
    queryOptions: { enabled: singleSkillsetId != null },
  });

  // 모드 ①/② 인라인 배정 목록 — hover 중인 행의 배정 목록(P/L 포함) 팝오버 표시.
  // 다중 선택(일괄 부여/해제) 흐름은 그대로 두고, hover 시 팝오버로 현황 확인.
  const inlineAgentId = mode === 'agent' ? hoverAgentId : null;
  const inlineSkillsetId = mode === 'skillset' ? hoverSkillsetId : null;
  const { data: inlineAgentSkillsets = [], isFetching: inlineAgentSkillsetsFetching } = useGetSkillsetsByAgent(inlineAgentId);
  const { data: inlineSkillsetAgents = [], isFetching: inlineSkillsetAgentsFetching } = useGetAgentsBySkillset(inlineSkillsetId);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutateAsync: bulkGrant, isPending: bulkGrantPending } = useBulkGrant({
    mutationOptions: {
      onSuccess: (result) => {
        toast.success(`${result.added}개 부여, ${result.skipped}개 건너뜀 (이미 존재)`);
        setGrantDrawerOpen(false);
        setSelectedAgentIds([]);
        setSelectedSkillsetIds([]);
        setLockedTenantId(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '부여 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: bulkRevoke, isPending: bulkRevokePending } = useBulkRevoke({
    mutationOptions: {
      onSuccess: (result) => {
        toast.success(`${result.removed}개 매핑 해제됨`);
        setSelectedAgentIds([]);
        setSelectedSkillsetIds([]);
        setLockedTenantId(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '해제 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: bulkUpdatePl, isPending: bulkUpdatePlPending } = useBulkUpdatePl({
    mutationOptions: {
      onSuccess: (updated) => {
        toast.success(`${updated}건 우선순위·스킬레벨 수정됨`);
        setSelectedAgentIds([]);
        setSelectedSkillsetIds([]);
        setLockedTenantId(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '수정 실패';
        toast.error(msg);
      },
    },
  });

  // 카드 전환 시 선택·잠금 초기화 (전체↔특정테넌트 전환 시 이전 선택이 잔류하지 않도록)
  useEffect(() => {
    setSelectedAgentIds([]);
    setSelectedSkillsetIds([]);
    setLockedTenantId(null);
    agentGridRef1.current?.api?.deselectAll();
    agentGridRef2.current?.api?.deselectAll();
    skillsetGridRef1.current?.api?.deselectAll();
    skillsetGridRef2.current?.api?.deselectAll();
  }, [selectedTenantId]);

  // 양쪽 선택이 모두 빈 배열이 되면 lockedTenantId 를 해제.
  // onSelectionChanged 에서 empty 시 setLockedTenantId(null) 을 호출하지 않기 때문에
  // 그리드 체크박스로 전체 선택 해제했을 때 lock 이 풀리지 않는 문제를 보완한다.
  useEffect(() => {
    if (selectedAgentIds.length === 0 && selectedSkillsetIds.length === 0) {
      setLockedTenantId(null);
    }
  }, [selectedAgentIds, selectedSkillsetIds]);

  // ② 선택 해제 시 보기 필터를 '전체'로 리셋 (선택 없으면 필터 무의미)
  useEffect(() => {
    if (selectedAgentIds.length === 0) setSkillsetViewFilter('all');
  }, [selectedAgentIds.length]);

  useEffect(() => {
    if (selectedSkillsetIds.length === 0) setAgentViewFilter('all');
  }, [selectedSkillsetIds.length]);

  // ─── Derived ────────────────────────────────────────────────────────────
  const totalStats = useMemo(() => {
    let agentCount = 0;
    let skillsetCount = 0;
    let mappingCount = 0;
    let skillGroupCount = 0;
    let unassignedAgentCnt = 0;
    for (const t of tenantStats) {
      agentCount += t.agentCount;
      skillsetCount += t.skillsetCount;
      mappingCount += t.mappingCount;
      skillGroupCount += t.skillGroupCount;
      unassignedAgentCnt += t.unassignedAgentCnt;
    }
    return { agentCount, skillsetCount, mappingCount, skillGroupCount, unassignedAgentCnt };
  }, [tenantStats]);

  const filteredAgents = useMemo(() => {
    const kw = agentSearch.trim().toLowerCase();
    if (!kw) return agents;
    return agents.filter((a) => {
      const fields: (string | number | null | undefined)[] = [a.agentName, a.agentLoginId, a.agentAlias, a.groupName];
      return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
    });
  }, [agents, agentSearch]);

  // 좌측 트리에서 선택된 상담그룹 + 키워드 필터 적용. selectedAgentGroupId=null → 전체.
  // lockedTenantId: 스킬셋 row 를 먼저 선택한 경우, 그 tenantId 의 상담사만 표시(교차테넌트 방지).
  const filteredAgentsByGroup = useMemo(() => {
    let rows = filteredAgents;
    if (selectedAgentGroupId != null) {
      rows = rows.filter((a) => a.groupId === selectedAgentGroupId);
    }
    if (lockedTenantId != null) {
      rows = rows.filter((a) => a.tenantId === lockedTenantId);
    }
    return rows;
  }, [filteredAgents, selectedAgentGroupId, lockedTenantId]);

  // 우측: 업무그룹 트리 선택에 따른 스킬셋 필터링. selectedSkillsetTreeId=null → 전체, 0 → 미배정, n → 그 그룹.
  // lockedTenantId: 상담사 row 를 먼저 선택한 경우, 그 tenantId 의 스킬셋만 표시(교차테넌트 방지).
  const filteredSkillsetsByGroup = useMemo(() => {
    let rows = skillsetMasters;
    if (selectedSkillsetTreeId === 0) rows = rows.filter((s) => s.treeId == null);
    else if (selectedSkillsetTreeId != null) rows = rows.filter((s) => s.treeId === selectedSkillsetTreeId);
    if (lockedTenantId != null) {
      rows = rows.filter((s) => s.tenantId === lockedTenantId);
    }
    return rows;
  }, [skillsetMasters, selectedSkillsetTreeId, lockedTenantId]);

  // 보유율 맵 (skillsetId → 보유 인원) — 모드 ① (sortedSkillsetsByGroup 에서 사용하므로 먼저 선언)
  const coverageMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of coverage) m.set(c.skillsetId, c.holdingCount);
    return m;
  }, [coverage]);

  // 보유율 맵 (agentId → 보유 스킬셋 수) — 모드 ② (sortedAgentsByGroup 에서 사용하므로 먼저 선언)
  const agentCoverageMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of agentCoverage) m.set(c.agentId, c.holdingCount);
    return m;
  }, [agentCoverage]);

  // 모드 ① 스킬셋 그리드 정렬 — 배정된 스킬셋을 상단으로 이동.
  // 단일 선택: 그 상담사 기준 priority asc 정렬 후 상단(기존 로직 유지).
  // 다중 선택(2명+): 선택 상담사 중 그 스킬셋을 보유한 인원 수 desc, 동수는 스킬셋명 asc.
  //   → coverageMap (useGetSkillsetCoverage) 이 이미 선택 N명 기준 보유인원 제공 — 재활용.
  // 선택 없음: 원본 순서 그대로.
  const sortedSkillsetsByGroup = useMemo<typeof filteredSkillsetsByGroup>(() => {
    if (selectedAgentIds.length === 0) {
      return filteredSkillsetsByGroup;
    }
    if (singleAgentId != null && singleAgentSkillsets.length > 0) {
      // 단일 선택: priority 오름차순 기준 배정 상단
      const assignedMap = new Map<number, number | null>(); // skillsetId → priority
      for (const sa of singleAgentSkillsets) {
        assignedMap.set(sa.skillsetId, sa.priority ?? null);
      }
      const assigned: typeof filteredSkillsetsByGroup = [];
      const unassigned: typeof filteredSkillsetsByGroup = [];
      for (const s of filteredSkillsetsByGroup) {
        if (assignedMap.has(s.skillsetId)) assigned.push(s);
        else unassigned.push(s);
      }
      assigned.sort((a, b) => {
        const pa = assignedMap.get(a.skillsetId) ?? Number.MAX_SAFE_INTEGER;
        const pb = assignedMap.get(b.skillsetId) ?? Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
      return [...assigned, ...unassigned];
    }
    // 다중 선택(2명+): coverageMap 이미 선택 N명 기준 보유 인원 제공
    const assigned: typeof filteredSkillsetsByGroup = [];
    const unassigned: typeof filteredSkillsetsByGroup = [];
    for (const s of filteredSkillsetsByGroup) {
      const count = coverageMap.get(s.skillsetId) ?? 0;
      if (count > 0) assigned.push(s);
      else unassigned.push(s);
    }
    // 보유 인원 desc, 동수는 스킬셋명 asc
    assigned.sort((a, b) => {
      const ca = coverageMap.get(a.skillsetId) ?? 0;
      const cb = coverageMap.get(b.skillsetId) ?? 0;
      if (cb !== ca) return cb - ca;
      return (a.skillsetName ?? '').localeCompare(b.skillsetName ?? '', 'ko');
    });
    return [...assigned, ...unassigned];
  }, [filteredSkillsetsByGroup, selectedAgentIds.length, singleAgentId, singleAgentSkillsets, coverageMap]);

  // 모드 ② 상담사 그리드 정렬 — 배정된 상담사를 상단으로 이동.
  // 단일 스킬셋: 그 스킬셋을 보유한 상담사 상단(이름 asc).
  // 다중 스킬셋(2건+): 선택 스킬셋 중 그 상담사가 보유한 개수 desc, 동수 이름 asc.
  //   → agentCoverageMap (useGetAgentCoverage) 이 이미 선택 M건 기준 보유 수 제공 — 재활용.
  // 선택 없음: 원본 순서 그대로.
  const sortedAgentsByGroup = useMemo<typeof filteredAgentsByGroup>(() => {
    if (selectedSkillsetIds.length === 0) {
      return filteredAgentsByGroup;
    }
    if (singleSkillsetId != null && singleSkillsetAgents.length > 0) {
      // 단일 스킬셋: 보유 상담사 상단, 동순위 이름 asc
      const assignedSet = new Set<number>(singleSkillsetAgents.map((sa) => sa.agentId));
      const assigned: typeof filteredAgentsByGroup = [];
      const unassigned: typeof filteredAgentsByGroup = [];
      for (const a of filteredAgentsByGroup) {
        if (assignedSet.has(a.agentId)) assigned.push(a);
        else unassigned.push(a);
      }
      assigned.sort((a, b) => (a.agentName ?? '').localeCompare(b.agentName ?? '', 'ko'));
      return [...assigned, ...unassigned];
    }
    // 다중 스킬셋(2건+): agentCoverageMap 이미 선택 M건 기준 보유 수 제공
    const assigned: typeof filteredAgentsByGroup = [];
    const unassigned: typeof filteredAgentsByGroup = [];
    for (const a of filteredAgentsByGroup) {
      const count = agentCoverageMap.get(a.agentId) ?? 0;
      if (count > 0) assigned.push(a);
      else unassigned.push(a);
    }
    // 보유 수 desc, 동수 이름 asc
    assigned.sort((a, b) => {
      const ca = agentCoverageMap.get(a.agentId) ?? 0;
      const cb = agentCoverageMap.get(b.agentId) ?? 0;
      if (cb !== ca) return cb - ca;
      return (a.agentName ?? '').localeCompare(b.agentName ?? '', 'ko');
    });
    return [...assigned, ...unassigned];
  }, [filteredAgentsByGroup, selectedSkillsetIds.length, singleSkillsetId, singleSkillsetAgents, agentCoverageMap]);

  // ② 보기 필터 적용 — 모드① 스킬셋 그리드 (배정됨=coverageMap>0, 미배정=0)
  const filteredSkillsetsByView = useMemo<typeof sortedSkillsetsByGroup>(() => {
    if (selectedAgentIds.length === 0 || skillsetViewFilter === 'all') return sortedSkillsetsByGroup;
    if (skillsetViewFilter === 'assigned') return sortedSkillsetsByGroup.filter((s) => (coverageMap.get(s.skillsetId) ?? 0) > 0);
    // 'unassigned'
    return sortedSkillsetsByGroup.filter((s) => (coverageMap.get(s.skillsetId) ?? 0) === 0);
  }, [sortedSkillsetsByGroup, skillsetViewFilter, selectedAgentIds.length, coverageMap]);

  // ② 보기 필터 적용 — 모드② 상담사 그리드 (배정됨=agentCoverageMap>0, 미배정=0)
  const filteredAgentsByView = useMemo<typeof sortedAgentsByGroup>(() => {
    if (selectedSkillsetIds.length === 0 || agentViewFilter === 'all') return sortedAgentsByGroup;
    if (agentViewFilter === 'assigned') return sortedAgentsByGroup.filter((a) => (agentCoverageMap.get(a.agentId) ?? 0) > 0);
    // 'unassigned'
    return sortedAgentsByGroup.filter((a) => (agentCoverageMap.get(a.agentId) ?? 0) === 0);
  }, [sortedAgentsByGroup, agentViewFilter, selectedSkillsetIds.length, agentCoverageMap]);

  const skillsetTotalCount = skillsetMasters.length;
  const skillsetUnassignedCount = useMemo(() => skillsetMasters.filter((s) => s.treeId == null).length, [skillsetMasters]);

  // 모드 ④ 조회 탭용 그룹 필터 — 상담사 기준
  const viewFilteredAgents = useMemo(() => {
    if (viewAgentGroupId != null) return agents.filter((a) => a.groupId === viewAgentGroupId);
    return agents;
  }, [agents, viewAgentGroupId]);

  // 모드 ④ 조회 탭용 그룹 필터 — 스킬셋 기준 (null=전체, 0=미배정, n=그룹)
  const viewFilteredSkillsets = useMemo(() => {
    if (viewSkillsetTreeId === 0) return skillsetMasters.filter((s) => s.treeId == null);
    if (viewSkillsetTreeId != null) return skillsetMasters.filter((s) => s.treeId === viewSkillsetTreeId);
    return skillsetMasters;
  }, [skillsetMasters, viewSkillsetTreeId]);

  // ─── Quick Filter 디바운스 핸들러 ────────────────────────────────────────
  const handleAgentSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAgentSearch(val);
    if (agentDebounceRef.current) clearTimeout(agentDebounceRef.current);
    agentDebounceRef.current = setTimeout(() => setAgentQuickFilter(val), 200);
  }, []);

  const handleAgentSearchClear = useCallback(() => {
    setAgentSearch('');
    if (agentDebounceRef.current) clearTimeout(agentDebounceRef.current);
    setAgentQuickFilter('');
  }, []);

  const handleSkillsetSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSkillsetSearch(val);
    if (skillsetDebounceRef.current) clearTimeout(skillsetDebounceRef.current);
    skillsetDebounceRef.current = setTimeout(() => setSkillsetQuickFilter(val), 200);
  }, []);

  const handleSkillsetSearchClear = useCallback(() => {
    setSkillsetSearch('');
    if (skillsetDebounceRef.current) clearTimeout(skillsetDebounceRef.current);
    setSkillsetQuickFilter('');
  }, []);

  // ─── 필터 초기화 핸들러 ──────────────────────────────────────────────────
  const resetAgentFilters = useCallback((gridRef: React.RefObject<AgGridReactType<AgentResponse> | null>) => {
    setAgentSearch('');
    if (agentDebounceRef.current) clearTimeout(agentDebounceRef.current);
    setAgentQuickFilter('');
    gridRef.current?.api?.setFilterModel(null);
  }, []);

  const resetSkillsetFilters = useCallback((gridRef: React.RefObject<AgGridReactType<SkillsetResponse> | null>) => {
    setSkillsetSearch('');
    if (skillsetDebounceRef.current) clearTimeout(skillsetDebounceRef.current);
    setSkillsetQuickFilter('');
    gridRef.current?.api?.setFilterModel(null);
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────
  // 선택된 entity 추출 (Drawer/일괄 액션용)
  const selectedAgentEntities = useMemo(() => filteredAgentsByGroup.filter((a) => selectedAgentIds.includes(a.agentId)), [filteredAgentsByGroup, selectedAgentIds]);
  const selectedSkillsetEntities = useMemo(
    () => filteredSkillsetsByGroup.filter((s) => selectedSkillsetIds.includes(s.skillsetId)),
    [filteredSkillsetsByGroup, selectedSkillsetIds],
  );

  const handleBulkRevoke = useCallback(() => {
    if (!selectedAgentIds.length || !selectedSkillsetIds.length) return;
    Modal.confirm({
      title: '매핑 일괄 해제',
      content: `상담사 ${selectedAgentIds.length}명 × 스킬셋 ${selectedSkillsetIds.length}건 매핑을 해제합니다. 진행하시겠습니까?`,
      okType: 'danger',
      onOk: () => bulkRevoke({ agentIds: selectedAgentIds, skillsetIds: selectedSkillsetIds }),
    });
  }, [selectedAgentIds, selectedSkillsetIds, bulkRevoke]);

  // 선택 N명 × M건 교차 행의 우선순위·스킬레벨을 툴바 입력값으로 일괄 SET (미존재 조합은 skip)
  const handleBulkUpdatePl = useCallback(() => {
    if (!selectedAgentIds.length || !selectedSkillsetIds.length) return;
    Modal.confirm({
      title: '우선순위·스킬레벨 일괄 수정',
      content: `상담사 ${selectedAgentIds.length}명 × 스킬셋 ${selectedSkillsetIds.length}건 중 배정된 행의 우선순위를 ${toolbarPriority}, 스킬레벨을 ${toolbarSkillLevel} 로 일괄 수정합니다. 배정되지 않은 조합은 변경되지 않습니다. 진행하시겠습니까?`,
      onOk: () =>
        bulkUpdatePl({
          agentIds: selectedAgentIds,
          skillsetIds: selectedSkillsetIds,
          priority: toolbarPriority,
          skillLevel: toolbarSkillLevel,
        }),
    });
  }, [selectedAgentIds, selectedSkillsetIds, toolbarPriority, toolbarSkillLevel, bulkUpdatePl]);

  const handleGrantSubmit = useCallback(
    async (mappings: GrantMapping[]) => {
      if (!mappings.length) {
        toast.warning('생성할 매핑이 없습니다');
        return;
      }
      await bulkGrant({ mappings });
    },
    [bulkGrant],
  );

  // handleToolbarGrant 제거됨 — GrantToolbar 삭제로 인해 불필요.

  // handleQuickGrantAgent / handleQuickGrantSkillset 제거 — 호버 패널 "배정" 버튼 삭제.

  // ─── Columns ────────────────────────────────────────────────────────────
  // 상담사 multi-select ag-Grid 컬럼 (모드 ① 좌측 / 모드 ② 우측 공용)
  // checkboxSelection colDef 제거 — rowSelection.checkboxes:true 가 SelectionColumn 자동 생성하므로 중복 방지
  const agentColumnsAg = useMemo<ColDef<AgentResponse>[]>(
    () => [
      { headerName: '테넌트', field: 'tenantName', flex: 1, minWidth: 140, tooltipField: 'tenantName', valueFormatter: (p) => p.value ?? '-', hide: selectedTenantId !== null },
      { field: 'agentLoginId', headerName: '로그인ID', width: 110, tooltipField: 'agentLoginId' },
      { field: 'agentName', headerName: '이름', width: 90, tooltipField: 'agentName' },
      { field: 'groupName', headerName: '상담그룹', flex: 1, minWidth: 110, valueGetter: (p) => p.data?.groupName ?? '미배정' },
      {
        field: 'activateYn',
        headerName: '활성',
        width: 70,
        filterValueGetter: ({ data }: { data?: AgentResponse }) => (data?.activateYn === 1 ? '활성' : '비활성'),
        cellRenderer: ({ value }: { value: number | null }) => (value === 1 ? <Tag color="green">활성</Tag> : <Tag color="red">비활성</Tag>),
      },
      {
        headerName: '보유 건수',
        width: 100,
        sortable: true,
        filter: 'agNumberColumnFilter',
        suppressHeaderMenuButton: true,
        // 실제 숫자값 반환 → 정렬·필터 기준으로 사용 (선택 스킬셋 없으면 -1로 구분)
        valueGetter: (params: { data?: AgentResponse }) => {
          const total = selectedSkillsetIds.length;
          if (!total) return -1;
          const agentId = params.data?.agentId ?? -1;
          return agentCoverageMap.get(agentId) ?? 0;
        },
        cellRenderer: (params: { data?: AgentResponse; value: number }) => {
          const total = selectedSkillsetIds.length;
          if (!total) return <span className="text-gray-400 text-xs">스킬셋 선택 시 표시</span>;
          const agentId = params.data?.agentId ?? -1;
          const holding = agentCoverageMap.get(agentId) ?? 0;
          return (
            <AgentCoverageCell
              agentId={agentId}
              agentName={params.data?.agentName ?? params.data?.agentLoginId ?? '-'}
              holding={holding}
              total={total}
              selectedSkillsets={selectedSkillsetEntities}
              onEdit={setEditRow}
              onDelete={(row) => bulkRevoke({ agentIds: [row.agentId], skillsetIds: [row.skillsetId] })}
            />
          );
        },
      },
    ],
    [selectedSkillsetIds.length, agentCoverageMap, selectedSkillsetEntities, selectedTenantId, bulkRevoke],
  );

  // rowSelection 을 gridOptions 밖 직접 prop 으로 분리 — ag-Grid 34 에서 gridOptions.rowSelection 은
  // 초기 마운트 1회만 읽히므로, AgGridReact prop 으로 전달해야 HMR/재마운트 없이도 명시적 적용 보장
  // enableClickSelection: false — ag-Grid 자동 클릭선택 비활성, onCellClicked 에서 수동 제어.
  // 보유건수 셀(coverage column) 클릭만 선택 제외, 나머지 셀은 onCellClicked 에서 node.setSelected() 토글.
  // 참고: ag-Grid v34.1.2 에는 suppressMouseEventHandling(v35+) 미제공 → onCellClicked 방식 사용.
  const agentRowSelection = useMemo(
    () => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: false, enableSelectionWithoutKeys: true }),
    [],
  );

  const selectedAgentIdsRef = useRef(selectedAgentIds);
  selectedAgentIdsRef.current = selectedAgentIds;
  const selectedSkillsetIdsRef = useRef(selectedSkillsetIds);
  selectedSkillsetIdsRef.current = selectedSkillsetIds;

  // hover 핸들러 ref — gridOptions useMemo 내에서 최신 setter 참조
  const setHoverAgentIdRef = useRef(setHoverAgentId);
  setHoverAgentIdRef.current = setHoverAgentId;
  const hoverLeaveTimerRefAgent = useRef<ReturnType<typeof setTimeout> | null>(null);
  // hover-intent(진입) 타이머 — 셀 진입 즉시 set 하지 않고 250ms 후 set (요청폭주/레이스 방어)
  const hoverIntentTimerRefAgent = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 현재 hover 값 추적 ref — 같은 행 셀 좌우이동 시 setState 스킵용
  const hoverAgentIdValueRef = useRef<number | null>(null);
  hoverAgentIdValueRef.current = hoverAgentId;

  const agentGridOptionsAg = useMemo<GridOptions<AgentResponse>>(
    () => ({
      ...baseGridOptions,
      statusBar: undefined,
      pagination: false,
      sideBar: false,
      defaultColDef: { resizable: true, sortable: true, filter: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true },
      getRowId: ({ data }) => String(data.agentId),
      onSelectionChanged: (e) => {
        const selected = e.api.getSelectedRows();
        setSelectedAgentIds(selected.map((r) => r.agentId));
        // 상담사 row 선택 시 그 tenantId 로 스킬셋 목록 잠금.
        // selected.length === 0 인 경우는 rowData 교체로 인한 ag-Grid 자동 선택해제 발화일 수 있으므로
        // setLockedTenantId(null) 을 여기서 호출하지 않는다 — 명시적 해제는 "선택 해제" 버튼 or deselectAll() 경로로만.
        if (selected.length > 0) {
          setLockedTenantId(selected[0].tenantId ?? null);
        }
      },
      onCellMouseOver: (e) => {
        // 보유건수 셀(AgentCoverageCell)에서는 InlineAssignPanel 억제
        if (e.column?.getColDef().headerName === '보유 건수') {
          coverageCellHoveredRef.current = true;
          // 진행 중인 intent 타이머 취소 및 현재 hover 해제
          if (hoverIntentTimerRefAgent.current) clearTimeout(hoverIntentTimerRefAgent.current);
          if (hoverLeaveTimerRefAgent.current) clearTimeout(hoverLeaveTimerRefAgent.current);
          setHoverAgentIdRef.current(null);
          return;
        }
        coverageCellHoveredRef.current = false;
        const nextId = e.data?.agentId ?? null;
        // ① 같은 행 가드: 현재 hover 값과 같으면 무시 (같은 행 셀 좌우이동)
        if (nextId === hoverAgentIdValueRef.current) {
          if (hoverLeaveTimerRefAgent.current) clearTimeout(hoverLeaveTimerRefAgent.current);
          return;
        }
        // 다른 행 진입 → leave 타이머와 직전 intent 타이머 정리
        if (hoverLeaveTimerRefAgent.current) clearTimeout(hoverLeaveTimerRefAgent.current);
        if (hoverIntentTimerRefAgent.current) clearTimeout(hoverIntentTimerRefAgent.current);
        // ② 디바운스(hover-intent ~250ms): 진입 즉시 set 하지 않고 타이머 후 set
        hoverIntentTimerRefAgent.current = setTimeout(() => {
          setHoverAgentIdRef.current(nextId);
        }, 250);
      },
      onCellMouseOut: (e) => {
        // 보유건수 셀에서 빠져나오면 ref 초기화
        if (e.column?.getColDef().headerName === '보유 건수') {
          coverageCellHoveredRef.current = false;
        }
        // 이탈 시 미발화 intent 타이머 취소 (스쳐 지나간 행은 요청 안 함)
        if (hoverIntentTimerRefAgent.current) clearTimeout(hoverIntentTimerRefAgent.current);
        // panelHovered 중이면 leave 타이머 설정 안 함 — 커서가 패널 위에 있으면 닫히지 않음
        if (panelHoveredRef.current) return;
        // grace delay 200ms — 행→패널로 이동 동선 허용
        hoverLeaveTimerRefAgent.current = setTimeout(() => {
          if (!panelHoveredRef.current) setHoverAgentIdRef.current(null);
        }, 200);
      },
      // 보유건수 셀 클릭 → 행 선택 차단, 일반 셀 클릭 → 수동 선택 토글.
      // enableClickSelection:false 로 ag-Grid 자동선택 비활성 → 이 핸들러에서 직접 제어.
      // 보유건수 컬럼은 headerName 으로 식별 (ag-Grid v34 — suppressMouseEventHandling v35+미제공).
      onCellClicked: (params: CellClickedEvent<AgentResponse>) => {
        if (params.column?.getColDef().headerName === '보유 건수') return;
        params.node.setSelected(!params.node.isSelected(), false);
      },
    }),

    [baseGridOptions],
  );

  // 스킬셋 multi-select ag-Grid (모드 ① 우측)
  // checkboxSelection colDef 제거 — rowSelection.checkboxes:true 가 SelectionColumn 자동 생성하므로 중복 방지
  const skillsetColumnsAg = useMemo<ColDef<SkillsetResponse>[]>(
    () => [
      { headerName: '테넌트', field: 'tenantName', flex: 1, minWidth: 140, tooltipField: 'tenantName', valueFormatter: (p) => p.value ?? '-', hide: selectedTenantId !== null },
      { field: 'skillsetName', headerName: '스킬셋명', flex: 1, minWidth: 140 },
      {
        headerName: '보유 건수',
        width: 168,
        sortable: true,
        filter: 'agNumberColumnFilter',
        suppressHeaderMenuButton: true,
        // 실제 숫자값 반환 → 정렬·필터 기준으로 사용 (선택 상담사 없으면 -1로 구분)
        valueGetter: (params: { data?: SkillsetResponse }) => {
          const total = selectedAgentIds.length;
          if (!total) return -1;
          const skillsetId = params.data?.skillsetId ?? -1;
          return coverageMap.get(skillsetId) ?? 0;
        },
        cellRenderer: (params: { data?: SkillsetResponse; value: number }) => {
          const total = selectedAgentIds.length;
          if (!total) return <span className="text-gray-400 text-xs">상담사 선택 시 표시</span>;
          const skillsetId = params.data?.skillsetId ?? -1;
          const holding = coverageMap.get(skillsetId) ?? 0;
          return (
            <SkillsetCoverageCell
              skillsetId={skillsetId}
              skillsetName={params.data?.skillsetName ?? '-'}
              holding={holding}
              total={total}
              selectedAgents={selectedAgentEntities}
              onEdit={setEditRow}
              onDelete={(row) => bulkRevoke({ agentIds: [row.agentId], skillsetIds: [row.skillsetId] })}
            />
          );
        },
      },
    ],
    [selectedAgentIds.length, coverageMap, selectedAgentEntities, selectedTenantId, bulkRevoke],
  );

  // rowSelection 을 gridOptions 밖 직접 prop 으로 분리 — 동일 이유
  // enableClickSelection: false — ag-Grid 자동 클릭선택 비활성, onCellClicked 에서 수동 제어.
  // 보유건수 셀(coverage column) 클릭만 선택 제외, 나머지 셀은 onCellClicked 에서 node.setSelected() 토글.
  // 참고: ag-Grid v34.1.2 에는 suppressMouseEventHandling(v35+) 미제공 → onCellClicked 방식 사용.
  const skillsetRowSelection = useMemo(
    () => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: false, enableSelectionWithoutKeys: true }),
    [],
  );

  // hover 핸들러 ref — skillset grid
  const setHoverSkillsetIdRef = useRef(setHoverSkillsetId);
  setHoverSkillsetIdRef.current = setHoverSkillsetId;
  const hoverLeaveTimerRefSkillset = useRef<ReturnType<typeof setTimeout> | null>(null);
  // hover-intent(진입) 타이머 — 셀 진입 즉시 set 하지 않고 250ms 후 set
  const hoverIntentTimerRefSkillset = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 현재 hover 값 추적 ref — 같은 행 셀 좌우이동 시 setState 스킵용
  const hoverSkillsetIdValueRef = useRef<number | null>(null);
  hoverSkillsetIdValueRef.current = hoverSkillsetId;

  const skillsetGridOptionsAg = useMemo<GridOptions<SkillsetResponse>>(
    () => ({
      ...baseGridOptions,
      statusBar: undefined,
      pagination: false,
      sideBar: false,
      defaultColDef: { resizable: true, sortable: true, filter: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true },
      getRowId: ({ data }) => String(data.skillsetId),
      onSelectionChanged: (e) => {
        const selected = e.api.getSelectedRows();
        setSelectedSkillsetIds(selected.map((r) => r.skillsetId));
        // 스킬셋 row 선택 시 그 tenantId 로 상담사 목록 잠금.
        // selected.length === 0 인 경우는 rowData 교체로 인한 ag-Grid 자동 선택해제 발화일 수 있으므로
        // setLockedTenantId(null) 을 여기서 호출하지 않는다 — 명시적 해제는 "선택 해제" 버튼 or deselectAll() 경로로만.
        if (selected.length > 0) {
          setLockedTenantId(selected[0].tenantId ?? null);
        }
      },
      onCellMouseOver: (e) => {
        // 보유건수 셀(SkillsetCoverageCell)에서는 InlineAssignPanel 억제
        if (e.column?.getColDef().headerName === '보유 건수') {
          coverageCellHoveredRef.current = true;
          // 진행 중인 intent 타이머 취소 및 현재 hover 해제
          if (hoverIntentTimerRefSkillset.current) clearTimeout(hoverIntentTimerRefSkillset.current);
          if (hoverLeaveTimerRefSkillset.current) clearTimeout(hoverLeaveTimerRefSkillset.current);
          setHoverSkillsetIdRef.current(null);
          return;
        }
        coverageCellHoveredRef.current = false;
        const nextId = e.data?.skillsetId ?? null;
        // ① 같은 행 가드: 현재 hover 값과 같으면 무시 (같은 행 셀 좌우이동)
        if (nextId === hoverSkillsetIdValueRef.current) {
          if (hoverLeaveTimerRefSkillset.current) clearTimeout(hoverLeaveTimerRefSkillset.current);
          return;
        }
        // 다른 행 진입 → leave 타이머와 직전 intent 타이머 정리
        if (hoverLeaveTimerRefSkillset.current) clearTimeout(hoverLeaveTimerRefSkillset.current);
        if (hoverIntentTimerRefSkillset.current) clearTimeout(hoverIntentTimerRefSkillset.current);
        // ② 디바운스(hover-intent ~250ms): 진입 즉시 set 하지 않고 타이머 후 set
        hoverIntentTimerRefSkillset.current = setTimeout(() => {
          setHoverSkillsetIdRef.current(nextId);
        }, 250);
      },
      onCellMouseOut: (e) => {
        // 보유건수 셀에서 빠져나오면 ref 초기화
        if (e.column?.getColDef().headerName === '보유 건수') {
          coverageCellHoveredRef.current = false;
        }
        // 이탈 시 미발화 intent 타이머 취소
        if (hoverIntentTimerRefSkillset.current) clearTimeout(hoverIntentTimerRefSkillset.current);
        // panelHovered 중이면 leave 타이머 설정 안 함
        if (panelHoveredRef.current) return;
        // grace delay 200ms — 행→패널로 이동 동선 허용
        hoverLeaveTimerRefSkillset.current = setTimeout(() => {
          if (!panelHoveredRef.current) setHoverSkillsetIdRef.current(null);
        }, 200);
      },
      // 보유건수 셀 클릭 → 행 선택 차단, 일반 셀 클릭 → 수동 선택 토글.
      // enableClickSelection:false 로 ag-Grid 자동선택 비활성 → 이 핸들러에서 직접 제어.
      onCellClicked: (params: CellClickedEvent<SkillsetResponse>) => {
        if (params.column?.getColDef().headerName === '보유 건수') return;
        params.node.setSelected(!params.node.isSelected(), false);
      },
    }),

    [baseGridOptions],
  );

  // ─── View 모드 — 좌측 단일선택 그리드 (상담사 기준) ────────────────────
  const viewAgentColumnsAg = useMemo<ColDef<AgentResponse>[]>(
    () => [
      { headerName: '테넌트', field: 'tenantName', flex: 1, minWidth: 140, tooltipField: 'tenantName', valueFormatter: (p) => p.value ?? '-', hide: selectedTenantId !== null },
      { field: 'agentLoginId', headerName: '로그인ID', width: 110, tooltipField: 'agentLoginId' },
      { field: 'agentName', headerName: '이름', width: 90, tooltipField: 'agentName' },
      { field: 'groupName', headerName: '상담그룹', flex: 1, minWidth: 110, valueGetter: (p) => p.data?.groupName ?? '미배정' },
    ],
    [selectedTenantId],
  );

  const viewAgentRowSelection = useMemo(() => ({ mode: 'singleRow' as const, checkboxes: false, enableClickSelection: true }), []);

  const viewAgentGridOptions = useMemo<GridOptions<AgentResponse>>(
    () => ({
      ...baseGridOptions,
      statusBar: undefined,
      pagination: false,
      sideBar: false,
      defaultColDef: { resizable: true, sortable: true, filter: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true },
      getRowId: ({ data }) => String(data.agentId),
      onSelectionChanged: (e) => {
        const rows = e.api.getSelectedRows();
        setViewSelectedAgentId(rows.length > 0 ? rows[0].agentId : null);
      },
    }),
    [baseGridOptions],
  );

  // ─── View 모드 — 좌측 단일선택 그리드 (스킬셋 기준) ────────────────────
  const viewSkillsetColumnsAg = useMemo<ColDef<SkillsetResponse>[]>(
    () => [
      { headerName: '테넌트', field: 'tenantName', flex: 1, minWidth: 140, tooltipField: 'tenantName', valueFormatter: (p) => p.value ?? '-', hide: selectedTenantId !== null },
      { field: 'skillsetName', headerName: '스킬셋명', flex: 1, minWidth: 140 },
      {
        field: 'treeName',
        headerName: '업무그룹',
        flex: 1,
        minWidth: 150,
        // null = 업무그룹 미매핑 → '미지정' 표기 (공백 방지)
        valueGetter: (p) => p.data?.treeName ?? '미지정',
      },
      {
        field: 'activateYn',
        headerName: '활성',
        width: 70,
        suppressHeaderMenuButton: true,
        filterValueGetter: ({ data }: { data?: SkillsetResponse }) => (data?.activateYn === 1 ? '활성' : '비활성'),
        cellRenderer: ({ value }: { value: number | null }) => (value === 1 ? <Tag color="green">활성</Tag> : <Tag color="default">비활성</Tag>),
      },
    ],
    [selectedTenantId],
  );

  // ag-Grid 34: rowSelection 은 gridOptions 밖 직접 prop 으로 (초기 마운트 1회 제한 우회)
  const viewSkillsetRowSelection = useMemo(() => ({ mode: 'singleRow' as const, checkboxes: false, enableClickSelection: true }), []);

  const viewSkillsetGridOptions = useMemo<GridOptions<SkillsetResponse>>(
    () => ({
      ...baseGridOptions,
      statusBar: undefined,
      pagination: false,
      sideBar: false,
      defaultColDef: { resizable: true, sortable: true, filter: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true },
      getRowId: ({ data }) => String(data.skillsetId),
      onSelectionChanged: (e) => {
        const rows = e.api.getSelectedRows();
        setViewSelectedSkillsetId(rows.length > 0 ? rows[0].skillsetId : null);
      },
    }),
    [baseGridOptions],
  );

  // ─── View 모드 — 카드 클릭 시 좌측 그리드 row 점프 ─────────────────────
  const handleViewDetailCardClick = useCallback(
    (targetId: number) => {
      if (viewSubMode === 'skillset') {
        // 스킬셋 기준: 카드=상담사 → 좌측 상담사 그리드(없음, 현재 submode=skillset이므로 방향 반전)
        // 카드 클릭 시 서브모드를 'agent'로 전환하고 해당 상담사를 선택
        setViewSubMode('agent');
        setViewSelectedAgentId(targetId);
        // 그리드가 렌더된 뒤 선택 — setTimeout으로 다음 렌더 사이클에서 실행
        setTimeout(() => {
          viewAgentGridRef.current?.api?.forEachNode((node: IRowNode<AgentResponse>) => {
            if (node.data?.agentId === targetId) {
              node.setSelected(true);
              viewAgentGridRef.current?.api?.ensureNodeVisible(node, 'middle');
            }
          });
        }, 100);
      } else {
        // 상담사 기준: 카드=스킬셋 → 서브모드를 'skillset'로 전환하고 해당 스킬셋을 선택
        setViewSubMode('skillset');
        setViewSelectedSkillsetId(targetId);
        setTimeout(() => {
          viewSkillsetGridRef.current?.api?.forEachNode((node: IRowNode<SkillsetResponse>) => {
            if (node.data?.skillsetId === targetId) {
              node.setSelected(true);
              viewSkillsetGridRef.current?.api?.ensureNodeVisible(node, 'middle');
            }
          });
        }, 100);
      }
    },
    [viewSubMode],
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 (타이틀 + 모드 토글) — 별도 박스 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          <span className="text-sm font-semibold text-gray-700">스킬 배정 현황</span>
          <div className="ml-auto flex items-center gap-2">
            <ModeButton active={mode === 'agent'} icon={<Users className="size-3.5" />} label="상담사별 스킬배정" onClick={() => setMode('agent')} />
            <ModeButton active={mode === 'skillset'} icon={<Package className="size-3.5" />} label="스킬별 상담사배정" onClick={() => setMode('skillset')} />
            <ModeButton active={mode === 'view'} icon={<ClipboardList className="size-3.5" />} label="배정 현황" onClick={() => setMode('view')} />
          </div>
        </div>
      </div>

      {/* ===== 박스 2: 테넌트 카드 슬라이더 — 별도 박스 (gap-4 로 헤더와 분리) ===== */}
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
                <SkillAssignTenantCard tenantId={null} tenantName="전체" stats={totalStats} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">테넌트가 없습니다</span>
                  </div>
                ) : (
                  tenantStats.map((g) => (
                    <SkillAssignTenantCard
                      key={g.tenantId}
                      tenantId={g.tenantId}
                      tenantName={g.tenantName ?? '-'}
                      stats={{
                        agentCount: g.agentCount,
                        skillsetCount: g.skillsetCount,
                        mappingCount: g.mappingCount,
                        skillGroupCount: g.skillGroupCount,
                        unassignedAgentCnt: g.unassignedAgentCnt,
                      }}
                      selected={selectedTenantId === g.tenantId}
                      onClick={(e) => {
                        setSelectedTenantId(g.tenantId);
                        setSelectedAgentId(null);
                        setViewSelectedAgentId(null);
                        setViewSelectedSkillsetId(null);
                        setViewAgentGroupId(null);
                        setViewSkillsetTreeId(null);
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
                <CompactTenantPill name="전체" count={totalStats.mappingCount} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.map((g) => (
                  <CompactTenantPill
                    key={g.tenantId}
                    name={g.tenantName ?? '-'}
                    count={g.mappingCount}
                    selected={selectedTenantId === g.tenantId}
                    onClick={() => {
                      setSelectedTenantId(g.tenantId);
                      setSelectedAgentId(null);
                      setViewSelectedAgentId(null);
                      setViewSelectedSkillsetId(null);
                      setViewAgentGroupId(null);
                      setViewSkillsetTreeId(null);
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

      {/* ===== 모드 ① 상담사별 스킬배정 (A→S) — 좌(상담사 multi) + 우(스킬셋 multi, 보유율) ===== */}
      {mode === 'agent' && (
        <div className="relative flex-1 min-h-0">
          <PanelGroup direction="horizontal" className="h-full">
            {/* 좌: 상담사 sub-panel [상담그룹 트리(접기/리사이즈) | grid] */}
            <Panel defaultSize={60} minSize={25}>
              <div
                className="bg-white bt-shadow flex flex-col overflow-hidden h-full"
                onMouseLeave={() => {
                  // 그리드 컨테이너 이탈 — intent 타이머 취소 후, 패널에 없을 때만 null 세팅
                  if (hoverIntentTimerRefAgent.current) clearTimeout(hoverIntentTimerRefAgent.current);
                  if (hoverLeaveTimerRefAgent.current) clearTimeout(hoverLeaveTimerRefAgent.current);
                  if (!panelHovered) {
                    hoverLeaveTimerRef.current = setTimeout(() => setHoverAgentId(null), 300);
                  }
                }}
              >
                <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
                  {agentTreeCollapsed1 && (
                    <Button
                      size="small"
                      type="text"
                      icon={<PanelLeftOpen className="size-4" />}
                      title="상담그룹 트리 펼치기"
                      onClick={() => toggleTreePanel(agentTreePanelRef1)}
                      className="!text-gray-400 hover:!text-[#405189]"
                    />
                  )}
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <Users className="size-3.5" /> 상담사
                  </span>
                  <span className="text-xs text-gray-500">
                    총 {filteredAgentsByGroup.length.toLocaleString()}명 · <strong className="text-[#405189]">선택 {selectedAgentIds.length}명</strong>
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <Input
                      size="small"
                      allowClear
                      prefix={<Search className="size-3.5 text-gray-400" />}
                      placeholder="이름/사번 검색"
                      value={agentSearch}
                      onChange={handleAgentSearchChange}
                      onClear={handleAgentSearchClear}
                      style={{ width: 160 }}
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<FilterX className="size-3.5" />}
                      title="필터 초기화"
                      onClick={() => resetAgentFilters(agentGridRef1)}
                      className="!text-gray-400 hover:!text-[#405189]"
                    />
                  </div>
                </div>
                <PanelGroup direction="horizontal" className="flex-1 min-h-0">
                  <Panel
                    ref={agentTreePanelRef1}
                    defaultSize={30}
                    minSize={16}
                    maxSize={45}
                    collapsible
                    collapsedSize={0}
                    onCollapse={() => setAgentTreeCollapsed1(true)}
                    onExpand={() => setAgentTreeCollapsed1(false)}
                    className="flex flex-col min-h-0 overflow-hidden"
                  >
                    <div className="px-3 h-9 flex items-center bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 flex-shrink-0">
                      <FolderOpen className="size-3.5 mr-1" /> 상담그룹
                      <Button
                        size="small"
                        type="text"
                        icon={<PanelLeftClose className="size-4" />}
                        title="상담그룹 트리 접기"
                        onClick={() => toggleTreePanel(agentTreePanelRef1)}
                        className="ml-auto !text-gray-400 hover:!text-[#405189]"
                      />
                    </div>
                    <div className="flex-1 min-h-0">
                      <AgentGroupTree tree={agentGroupTree} selectedGroupId={selectedAgentGroupId} onSelectGroup={setSelectedAgentGroupId} />
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />
                  <Panel defaultSize={70} minSize={40} className="min-w-0 min-h-0 ag-theme-quartz">
                    <AgGridReact<AgentResponse>
                      ref={agentGridRef1}
                      rowData={filteredAgentsByView}
                      columnDefs={agentColumnsAg}
                      gridOptions={agentGridOptionsAg}
                      rowSelection={agentRowSelection}
                      quickFilterText={agentQuickFilter}
                      loading={agentsLoading}
                    />
                  </Panel>
                </PanelGroup>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />

            {/* 우: 스킬셋 sub-panel [업무그룹 트리(접기/리사이즈) | 스킬셋 grid + 보유율] */}
            <Panel defaultSize={40} minSize={20}>
              <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
                <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
                  {skillsetTreeCollapsed1 && (
                    <Button
                      size="small"
                      type="text"
                      icon={<PanelLeftOpen className="size-4" />}
                      title="업무그룹 트리 펼치기"
                      onClick={() => toggleTreePanel(skillsetTreePanelRef1)}
                      className="!text-gray-400 hover:!text-[#405189]"
                    />
                  )}
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <Wrench className="size-3.5" /> 스킬셋
                  </span>
                  <span className="text-xs text-gray-500">
                    총 {filteredSkillsetsByView.length.toLocaleString()}건 · <strong className="text-[#405189]">선택 {selectedSkillsetIds.length}건</strong>
                    {selectedAgentIds.length > 0 && ` · ${selectedAgentIds.length}명 기준 보유율`}
                  </span>
                  {/* ② 보기 필터 토글 — 상담사 선택 시만 활성 */}
                  {selectedAgentIds.length > 0 && (
                    <Segmented
                      size="small"
                      value={skillsetViewFilter}
                      onChange={(v) => setSkillsetViewFilter(v as 'all' | 'assigned' | 'unassigned')}
                      options={[
                        { label: '전체', value: 'all' },
                        { label: '배정됨', value: 'assigned' },
                        { label: '미배정', value: 'unassigned' },
                      ]}
                    />
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <Input
                      size="small"
                      allowClear
                      prefix={<Search className="size-3.5 text-gray-400" />}
                      placeholder="스킬셋명 검색"
                      value={skillsetSearch}
                      onChange={handleSkillsetSearchChange}
                      onClear={handleSkillsetSearchClear}
                      style={{ width: 160 }}
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<FilterX className="size-3.5" />}
                      title="필터 초기화"
                      onClick={() => resetSkillsetFilters(skillsetGridRef1)}
                      className="!text-gray-400 hover:!text-[#405189]"
                    />
                  </div>
                </div>
                <PanelGroup direction="horizontal" className="flex-1 min-h-0">
                  <Panel
                    ref={skillsetTreePanelRef1}
                    defaultSize={30}
                    minSize={16}
                    maxSize={45}
                    collapsible
                    collapsedSize={0}
                    onCollapse={() => setSkillsetTreeCollapsed1(true)}
                    onExpand={() => setSkillsetTreeCollapsed1(false)}
                    className="flex flex-col min-h-0 overflow-hidden"
                  >
                    <div className="px-3 h-9 flex items-center bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 flex-shrink-0">
                      <FolderOpen className="size-3.5 mr-1" /> 업무그룹
                      <Button
                        size="small"
                        type="text"
                        icon={<PanelLeftClose className="size-4" />}
                        title="업무그룹 트리 접기"
                        onClick={() => toggleTreePanel(skillsetTreePanelRef1)}
                        className="ml-auto !text-gray-400 hover:!text-[#405189]"
                      />
                    </div>
                    <div className="flex-1 min-h-0">
                      <SkillsetGroupTree
                        groups={skillsetGroups}
                        totalSkillsetCount={skillsetTotalCount}
                        totalUnassignedCount={skillsetUnassignedCount}
                        selectedTreeId={selectedSkillsetTreeId}
                        selectedTenantId={selectedTenantId}
                        onSelect={setSelectedSkillsetTreeId}
                        onCreateChild={() => toast.info('업무그룹 편집은 스킬셋 관리에서')}
                        onEdit={() => toast.info('업무그룹 편집은 스킬셋 관리에서')}
                        onDelete={() => toast.info('업무그룹 편집은 스킬셋 관리에서')}
                        onSkillsetDrop={() => {
                          /* no-op: 스킬셋 이동은 스킬셋 관리에서 */
                        }}
                      />
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />
                  <Panel defaultSize={70} minSize={40} className="min-w-0 min-h-0 ag-theme-quartz">
                    <AgGridReact<SkillsetResponse>
                      ref={skillsetGridRef1}
                      rowData={filteredSkillsetsByView}
                      columnDefs={skillsetColumnsAg}
                      gridOptions={skillsetGridOptionsAg}
                      rowSelection={skillsetRowSelection}
                      quickFilterText={skillsetQuickFilter}
                      loading={skillsetMastersLoading}
                    />
                  </Panel>
                </PanelGroup>
              </div>
            </Panel>
          </PanelGroup>

          {/* hover 시 — 우측 상단 floating 팝오버 (그리드 비침해) */}
          <InlineAssignPanel
            visible={inlineAgentId != null || panelHovered}
            headerLabel="배정된 스킬셋"
            entityName={filteredAgentsByGroup.find((a) => a.agentId === inlineAgentId)?.agentName ?? '-'}
            entitySub={filteredAgentsByGroup.find((a) => a.agentId === inlineAgentId)?.agentLoginId ?? '-'}
            count={inlineAgentSkillsets.length}
            fetching={inlineAgentSkillsetsFetching}
            emptyText="이 상담사에 매핑된 스킬셋이 없습니다"
            items={inlineAgentSkillsets.map((item) => ({
              key: item.skillsetId,
              title: item.skillsetName ?? '-',
              subtitle: `${getMediaTypeName(item.mediaType)} · ${item.activateYn === 1 ? '활성' : '비활성'}`,
              priority: item.priority,
              skillLevel: item.skillLevel,
              row: item,
            }))}
            onEdit={setEditRow}
            onDelete={(row) => {
              Modal.confirm({
                title: '배정 해제',
                content: `[${row.skillsetName}] 배정을 해제하시겠습니까?`,
                okText: '해제',
                okType: 'danger',
                cancelText: '취소',
                onOk: () => bulkRevoke({ agentIds: [row.agentId], skillsetIds: [row.skillsetId] }),
              });
            }}
            onClose={() => {
              setPanelHovered(false);
              setHoverAgentId(null);
              if (hoverLeaveTimerRefAgent.current) clearTimeout(hoverLeaveTimerRefAgent.current);
              if (hoverIntentTimerRefAgent.current) clearTimeout(hoverIntentTimerRefAgent.current);
            }}
            onPanelMouseEnter={() => {
              if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
              if (hoverLeaveTimerRefAgent.current) clearTimeout(hoverLeaveTimerRefAgent.current);
              setPanelHovered(true);
            }}
            onPanelMouseLeave={() => {
              setPanelHovered(false);
              setHoverAgentId(null);
            }}
          />
        </div>
      )}

      {/* ===== 모드 ② 스킬별 상담사배정 (S→A) — 좌(스킬셋 multi) + 우(상담사 multi, 보유율) ===== */}
      {mode === 'skillset' && (
        <div className="relative flex-1 min-h-0">
          <PanelGroup direction="horizontal" className="h-full">
            {/* 좌: 스킬셋 sub-panel [업무그룹 트리(접기/리사이즈) | 스킬셋 grid] */}
            <Panel defaultSize={50} minSize={20}>
              <div
                className="bg-white bt-shadow flex flex-col overflow-hidden h-full"
                onMouseLeave={() => {
                  // 그리드 컨테이너 이탈 — intent 타이머 취소 후, 패널에 없을 때만 null 세팅
                  if (hoverIntentTimerRefSkillset.current) clearTimeout(hoverIntentTimerRefSkillset.current);
                  if (hoverLeaveTimerRefSkillset.current) clearTimeout(hoverLeaveTimerRefSkillset.current);
                  if (!panelHovered) {
                    hoverLeaveTimerRef.current = setTimeout(() => setHoverSkillsetId(null), 300);
                  }
                }}
              >
                <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
                  {skillsetTreeCollapsed2 && (
                    <Button
                      size="small"
                      type="text"
                      icon={<PanelLeftOpen className="size-4" />}
                      title="업무그룹 트리 펼치기"
                      onClick={() => toggleTreePanel(skillsetTreePanelRef2)}
                      className="!text-gray-400 hover:!text-[#405189]"
                    />
                  )}
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <Wrench className="size-3.5" /> 스킬셋
                  </span>
                  <span className="text-xs text-gray-500">
                    총 {filteredSkillsetsByGroup.length.toLocaleString()}건 · <strong className="text-[#405189]">선택 {selectedSkillsetIds.length}건</strong>
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <Input
                      size="small"
                      allowClear
                      prefix={<Search className="size-3.5 text-gray-400" />}
                      placeholder="스킬셋명 검색"
                      value={skillsetSearch}
                      onChange={handleSkillsetSearchChange}
                      onClear={handleSkillsetSearchClear}
                      style={{ width: 160 }}
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<FilterX className="size-3.5" />}
                      title="필터 초기화"
                      onClick={() => resetSkillsetFilters(skillsetGridRef2)}
                      className="!text-gray-400 hover:!text-[#405189]"
                    />
                  </div>
                </div>
                <PanelGroup direction="horizontal" className="flex-1 min-h-0">
                  <Panel
                    ref={skillsetTreePanelRef2}
                    defaultSize={30}
                    minSize={16}
                    maxSize={45}
                    collapsible
                    collapsedSize={0}
                    onCollapse={() => setSkillsetTreeCollapsed2(true)}
                    onExpand={() => setSkillsetTreeCollapsed2(false)}
                    className="flex flex-col min-h-0 overflow-hidden"
                  >
                    <div className="px-3 h-9 flex items-center bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 flex-shrink-0">
                      <FolderOpen className="size-3.5 mr-1" /> 업무그룹
                      <Button
                        size="small"
                        type="text"
                        icon={<PanelLeftClose className="size-4" />}
                        title="업무그룹 트리 접기"
                        onClick={() => toggleTreePanel(skillsetTreePanelRef2)}
                        className="ml-auto !text-gray-400 hover:!text-[#405189]"
                      />
                    </div>
                    <div className="flex-1 min-h-0">
                      <SkillsetGroupTree
                        groups={skillsetGroups}
                        totalSkillsetCount={skillsetTotalCount}
                        totalUnassignedCount={skillsetUnassignedCount}
                        selectedTreeId={selectedSkillsetTreeId}
                        selectedTenantId={selectedTenantId}
                        onSelect={setSelectedSkillsetTreeId}
                        onCreateChild={() => toast.info('업무그룹 편집은 스킬셋 관리에서')}
                        onEdit={() => toast.info('업무그룹 편집은 스킬셋 관리에서')}
                        onDelete={() => toast.info('업무그룹 편집은 스킬셋 관리에서')}
                        onSkillsetDrop={() => {
                          /* no-op: 스킬셋 이동은 스킬셋 관리에서 */
                        }}
                      />
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />
                  <Panel defaultSize={70} minSize={40} className="min-w-0 min-h-0 ag-theme-quartz">
                    <AgGridReact<SkillsetResponse>
                      ref={skillsetGridRef2}
                      rowData={filteredSkillsetsByView}
                      columnDefs={skillsetColumnsAg}
                      gridOptions={skillsetGridOptionsAg}
                      rowSelection={skillsetRowSelection}
                      quickFilterText={skillsetQuickFilter}
                      loading={skillsetMastersLoading}
                    />
                  </Panel>
                </PanelGroup>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />

            {/* 우: 상담사 sub-panel [상담그룹 트리(접기/리사이즈) | 상담사 grid + 보유율(스킬셋 기준)] */}
            <Panel defaultSize={50} minSize={20}>
              <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
                <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
                  {agentTreeCollapsed2 && (
                    <Button
                      size="small"
                      type="text"
                      icon={<PanelLeftOpen className="size-4" />}
                      title="상담그룹 트리 펼치기"
                      onClick={() => toggleTreePanel(agentTreePanelRef2)}
                      className="!text-gray-400 hover:!text-[#405189]"
                    />
                  )}
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <Users className="size-3.5" /> 상담사
                  </span>
                  <span className="text-xs text-gray-500">
                    총 {filteredAgentsByView.length.toLocaleString()}명 · <strong className="text-[#405189]">선택 {selectedAgentIds.length}명</strong>
                    {selectedSkillsetIds.length > 0 && ` · ${selectedSkillsetIds.length}건 기준 보유율`}
                  </span>
                  {/* ② 보기 필터 토글 — 스킬셋 선택 시만 활성 */}
                  {selectedSkillsetIds.length > 0 && (
                    <Segmented
                      size="small"
                      value={agentViewFilter}
                      onChange={(v) => setAgentViewFilter(v as 'all' | 'assigned' | 'unassigned')}
                      options={[
                        { label: '전체', value: 'all' },
                        { label: '배정됨', value: 'assigned' },
                        { label: '미배정', value: 'unassigned' },
                      ]}
                    />
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <Input
                      size="small"
                      allowClear
                      prefix={<Search className="size-3.5 text-gray-400" />}
                      placeholder="이름/사번 검색"
                      value={agentSearch}
                      onChange={handleAgentSearchChange}
                      onClear={handleAgentSearchClear}
                      style={{ width: 160 }}
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<FilterX className="size-3.5" />}
                      title="필터 초기화"
                      onClick={() => resetAgentFilters(agentGridRef2)}
                      className="!text-gray-400 hover:!text-[#405189]"
                    />
                  </div>
                </div>
                <PanelGroup direction="horizontal" className="flex-1 min-h-0">
                  <Panel
                    ref={agentTreePanelRef2}
                    defaultSize={30}
                    minSize={16}
                    maxSize={45}
                    collapsible
                    collapsedSize={0}
                    onCollapse={() => setAgentTreeCollapsed2(true)}
                    onExpand={() => setAgentTreeCollapsed2(false)}
                    className="flex flex-col min-h-0 overflow-hidden"
                  >
                    <div className="px-3 h-9 flex items-center bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 flex-shrink-0">
                      <FolderOpen className="size-3.5 mr-1" /> 상담그룹
                      <Button
                        size="small"
                        type="text"
                        icon={<PanelLeftClose className="size-4" />}
                        title="상담그룹 트리 접기"
                        onClick={() => toggleTreePanel(agentTreePanelRef2)}
                        className="ml-auto !text-gray-400 hover:!text-[#405189]"
                      />
                    </div>
                    <div className="flex-1 min-h-0">
                      <AgentGroupTree tree={agentGroupTree} selectedGroupId={selectedAgentGroupId} onSelectGroup={setSelectedAgentGroupId} />
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />
                  <Panel defaultSize={70} minSize={40} className="min-w-0 min-h-0 ag-theme-quartz">
                    <AgGridReact<AgentResponse>
                      ref={agentGridRef2}
                      rowData={filteredAgentsByView}
                      columnDefs={agentColumnsAg}
                      gridOptions={agentGridOptionsAg}
                      rowSelection={agentRowSelection}
                      quickFilterText={agentQuickFilter}
                      loading={agentsLoading}
                    />
                  </Panel>
                </PanelGroup>
              </div>
            </Panel>
          </PanelGroup>

          {/* hover 시 — 우측 상단 floating 팝오버 (그리드 비침해) */}
          <InlineAssignPanel
            visible={inlineSkillsetId != null || panelHovered}
            headerLabel="배정된 상담사"
            entityName={filteredSkillsetsByGroup.find((s) => s.skillsetId === inlineSkillsetId)?.skillsetName ?? '-'}
            entitySub={null}
            count={inlineSkillsetAgents.length}
            fetching={inlineSkillsetAgentsFetching}
            emptyText="이 스킬셋에 매핑된 상담사가 없습니다"
            items={inlineSkillsetAgents.map((item) => ({
              key: item.agentId,
              title: item.agentName ?? '-',
              subtitle: `${item.agentLoginId ?? '-'} · ${item.tenantName ?? '-'}`,
              priority: item.priority,
              skillLevel: item.skillLevel,
              row: item,
            }))}
            onEdit={setEditRow}
            onDelete={(row) => {
              Modal.confirm({
                title: '배정 해제',
                content: `[${row.agentName ?? '-'}] 배정을 해제하시겠습니까?`,
                okText: '해제',
                okType: 'danger',
                cancelText: '취소',
                onOk: () => bulkRevoke({ agentIds: [row.agentId], skillsetIds: [row.skillsetId] }),
              });
            }}
            onClose={() => {
              setPanelHovered(false);
              setHoverSkillsetId(null);
              if (hoverLeaveTimerRefSkillset.current) clearTimeout(hoverLeaveTimerRefSkillset.current);
              if (hoverIntentTimerRefSkillset.current) clearTimeout(hoverIntentTimerRefSkillset.current);
            }}
            onPanelMouseEnter={() => {
              if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
              if (hoverLeaveTimerRefSkillset.current) clearTimeout(hoverLeaveTimerRefSkillset.current);
              setPanelHovered(true);
            }}
            onPanelMouseLeave={() => {
              setPanelHovered(false);
              setHoverSkillsetId(null);
            }}
          />
        </div>
      )}

      {/* ===== 모드 ④ 배정 현황 조회 — [좌트리 | 기준 그리드] + 우(디테일 카드 패널) ===== */}
      {mode === 'view' && (
        <PanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* 좌: 트리+그리드 복합 패널 */}
          <Panel defaultSize={45} minSize={25}>
            <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
              {/* 헤더: 서브모드 토글 */}
              <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
                {/* 트리 접힌 상태에서 열기 버튼 */}
                {(viewSubMode === 'agent' ? viewAgentTreeCollapsed : viewSkillsetTreeCollapsed) && (
                  <Button
                    size="small"
                    type="text"
                    icon={<PanelLeftOpen className="size-4" />}
                    title="그룹 트리 펼치기"
                    onClick={() => toggleTreePanel(viewSubMode === 'agent' ? viewAgentTreePanelRef : viewSkillsetTreePanelRef)}
                    className="!text-gray-400 hover:!text-[#405189]"
                  />
                )}
                <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setViewSubMode('agent');
                      setViewSelectedAgentId(null);
                      setViewSelectedSkillsetId(null);
                      viewSkillsetGridRef.current?.api?.deselectAll();
                    }}
                    className={`px-2.5 h-6 rounded text-xs font-medium transition ${viewSubMode === 'agent' ? 'bg-white text-[#405189] shadow-sm' : 'text-gray-500 hover:text-[#405189]'}`}
                  >
                    상담사 기준
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewSubMode('skillset');
                      setViewSelectedAgentId(null);
                      setViewSelectedSkillsetId(null);
                      viewAgentGridRef.current?.api?.deselectAll();
                    }}
                    className={`px-2.5 h-6 rounded text-xs font-medium transition ${viewSubMode === 'skillset' ? 'bg-white text-[#405189] shadow-sm' : 'text-gray-500 hover:text-[#405189]'}`}
                  >
                    스킬셋 기준
                  </button>
                </div>
                <span className="text-xs text-gray-400">
                  총 {viewSubMode === 'agent' ? viewFilteredAgents.length.toLocaleString() + '명' : viewFilteredSkillsets.length.toLocaleString() + '건'}
                </span>
              </div>

              {/* 트리(접기가능) + 그리드 수평 분할 */}
              <PanelGroup direction="horizontal" className="flex-1 min-h-0">
                {/* 트리 패널 — 상담사 기준: 상담그룹 트리 / 스킬셋 기준: 업무그룹 트리 */}
                {viewSubMode === 'agent' ? (
                  <Panel
                    ref={viewAgentTreePanelRef}
                    defaultSize={32}
                    minSize={18}
                    maxSize={50}
                    collapsible
                    collapsedSize={0}
                    onCollapse={() => setViewAgentTreeCollapsed(true)}
                    onExpand={() => setViewAgentTreeCollapsed(false)}
                    className="flex flex-col min-h-0 overflow-hidden"
                  >
                    <div className="px-3 h-9 flex items-center bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 flex-shrink-0">
                      <FolderOpen className="size-3.5 mr-1" /> 상담그룹
                      <Button
                        size="small"
                        type="text"
                        icon={<PanelLeftClose className="size-4" />}
                        title="트리 접기"
                        onClick={() => toggleTreePanel(viewAgentTreePanelRef)}
                        className="ml-auto !text-gray-400 hover:!text-[#405189]"
                      />
                    </div>
                    <div className="flex-1 min-h-0">
                      <AgentGroupTree
                        tree={agentGroupTree}
                        selectedGroupId={viewAgentGroupId}
                        onSelectGroup={(id) => {
                          setViewAgentGroupId(id);
                          setViewSelectedAgentId(null);
                          viewAgentGridRef.current?.api?.deselectAll();
                        }}
                      />
                    </div>
                  </Panel>
                ) : (
                  <Panel
                    ref={viewSkillsetTreePanelRef}
                    defaultSize={32}
                    minSize={18}
                    maxSize={50}
                    collapsible
                    collapsedSize={0}
                    onCollapse={() => setViewSkillsetTreeCollapsed(true)}
                    onExpand={() => setViewSkillsetTreeCollapsed(false)}
                    className="flex flex-col min-h-0 overflow-hidden"
                  >
                    <div className="px-3 h-9 flex items-center bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 flex-shrink-0">
                      <FolderOpen className="size-3.5 mr-1" /> 업무그룹
                      <Button
                        size="small"
                        type="text"
                        icon={<PanelLeftClose className="size-4" />}
                        title="트리 접기"
                        onClick={() => toggleTreePanel(viewSkillsetTreePanelRef)}
                        className="ml-auto !text-gray-400 hover:!text-[#405189]"
                      />
                    </div>
                    <div className="flex-1 min-h-0">
                      <SkillsetGroupTree
                        groups={skillsetGroups}
                        totalSkillsetCount={skillsetTotalCount}
                        totalUnassignedCount={skillsetUnassignedCount}
                        selectedTreeId={viewSkillsetTreeId}
                        selectedTenantId={selectedTenantId}
                        onSelect={(id) => {
                          setViewSkillsetTreeId(id);
                          setViewSelectedSkillsetId(null);
                          viewSkillsetGridRef.current?.api?.deselectAll();
                        }}
                        onCreateChild={() => {
                          /* view-only: no-op */
                        }}
                        onEdit={() => {
                          /* view-only: no-op */
                        }}
                        onDelete={() => {
                          /* view-only: no-op */
                        }}
                        onSkillsetDrop={() => {
                          /* view-only: no-op */
                        }}
                      />
                    </div>
                  </Panel>
                )}

                <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />

                {/* 그리드 패널 */}
                <Panel defaultSize={68} minSize={40} className="min-w-0 min-h-0 ag-theme-quartz">
                  {viewSubMode === 'agent' ? (
                    <AgGridReact<AgentResponse>
                      key="view-agent-grid"
                      ref={viewAgentGridRef}
                      rowData={viewFilteredAgents}
                      columnDefs={viewAgentColumnsAg}
                      gridOptions={viewAgentGridOptions}
                      rowSelection={viewAgentRowSelection}
                      loading={agentsLoading}
                    />
                  ) : (
                    <AgGridReact<SkillsetResponse>
                      key="view-skillset-grid"
                      ref={viewSkillsetGridRef}
                      rowData={viewFilteredSkillsets}
                      columnDefs={viewSkillsetColumnsAg}
                      gridOptions={viewSkillsetGridOptions}
                      rowSelection={viewSkillsetRowSelection}
                      loading={skillsetMastersLoading}
                    />
                  )}
                </Panel>
              </PanelGroup>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />

          {/* 우: 디테일 카드 패널 */}
          <Panel defaultSize={55} minSize={30}>
            <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
              {/* 패널 헤더 */}
              <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
                {viewSubMode === 'agent' && viewSelectedAgentId != null ? (
                  <>
                    <span className="text-xs font-semibold text-gray-700">배정된 스킬셋</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[#eef1fb] text-[#405189] border border-[#c5cbe0]">
                      {viewFilteredAgents.find((a) => a.agentId === viewSelectedAgentId)?.agentName ?? '-'}
                      <span className="text-[#405189]/60">({viewFilteredAgents.find((a) => a.agentId === viewSelectedAgentId)?.agentLoginId ?? '-'})</span>
                    </span>
                    {!viewAgentSkillsetsFetching && <span className="text-[11px] text-gray-400">{viewAgentSkillsets.length}건</span>}
                    {viewAgentSkillsetsFetching && <span className="text-[11px] text-gray-400">조회 중...</span>}
                  </>
                ) : viewSubMode === 'skillset' && viewSelectedSkillsetId != null ? (
                  <>
                    <span className="text-xs font-semibold text-gray-700">배정된 상담사</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[#eef1fb] text-[#405189] border border-[#c5cbe0]">
                      {viewFilteredSkillsets.find((s) => s.skillsetId === viewSelectedSkillsetId)?.skillsetName ?? '-'}
                    </span>
                    {!viewSkillsetAgentsFetching && <span className="text-[11px] text-gray-400">{viewSkillsetAgents.length}명</span>}
                    {viewSkillsetAgentsFetching && <span className="text-[11px] text-gray-400">조회 중...</span>}
                  </>
                ) : (
                  <span className="text-xs text-gray-400">좌측 목록에서 항목을 선택하세요</span>
                )}
              </div>

              {/* 카드 본문 */}
              <div className="flex-1 overflow-y-auto p-3">
                {/* 미선택 빈 상태 */}
                {((viewSubMode === 'agent' && viewSelectedAgentId == null) || (viewSubMode === 'skillset' && viewSelectedSkillsetId == null)) && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                    <ClipboardList className="size-10 text-gray-200" />
                    <span className="text-sm">선택된 항목이 없습니다</span>
                    <span className="text-xs">좌측 목록에서 항목을 클릭하세요</span>
                  </div>
                )}

                {/* 상담사 기준 — 스킬셋 카드 목록 */}
                {viewSubMode === 'agent' &&
                  viewSelectedAgentId != null &&
                  !viewAgentSkillsetsFetching &&
                  (viewAgentSkillsets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                      <span className="text-sm">이 상담사에 매핑된 스킬셋이 없습니다</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
                      {viewAgentSkillsets.map((item) => (
                        <ViewDetailCard
                          key={item.skillsetId}
                          title={item.skillsetName ?? '-'}
                          subtitle={[item.treeName ?? '업무그룹 미지정', getMediaTypeName(item.mediaType), item.activateYn === 1 ? '활성' : '비활성'].join(' · ')}
                          priority={item.priority}
                          skillLevel={item.skillLevel}
                          onClick={() => handleViewDetailCardClick(item.skillsetId)}
                        />
                      ))}
                    </div>
                  ))}

                {/* 스킬셋 기준 — 상담사 카드 목록 */}
                {viewSubMode === 'skillset' &&
                  viewSelectedSkillsetId != null &&
                  !viewSkillsetAgentsFetching &&
                  (viewSkillsetAgents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                      <span className="text-sm">이 스킬셋에 매핑된 상담사가 없습니다</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
                      {viewSkillsetAgents.map((item) => (
                        <ViewDetailCard
                          key={item.agentId}
                          title={item.agentName ?? '-'}
                          subtitle={[item.agentLoginId ?? '-', item.groupName ?? '상담그룹 미지정'].join(' · ')}
                          priority={item.priority}
                          skillLevel={item.skillLevel}
                          onClick={() => handleViewDetailCardClick(item.agentId)}
                        />
                      ))}
                    </div>
                  ))}

                {/* 조회 중 로딩 */}
                {(viewAgentSkillsetsFetching || viewSkillsetAgentsFetching) && (
                  <div className="flex items-center justify-center h-full">
                    <Spin size="small" />
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      )}

      {/* ===== Bulk Action Bar (floating bottom) — 양쪽 모드 공통, 항상 렌더 ===== */}
      {/* 버튼 4개 상시 렌더 + 상태별 disabled 토글만. 안내 문구 없음. */}
      {(mode === 'agent' || mode === 'skillset') &&
        (() => {
          const agentCount = selectedAgentIds.length;
          const skillsetCount = selectedSkillsetIds.length;
          const bothSelected = agentCount > 0 && skillsetCount > 0;
          // [스킬모음 적용]: 상담사≥1 이고 스킬셋=0 일 때만 활성
          const applyEnabled = agentCount > 0 && skillsetCount === 0;
          const applyTitle = agentCount > 0 && skillsetCount > 0 ? '스킬셋 선택을 해제하면 적용할 수 있습니다' : undefined;
          return (
            <div
              className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-xl shadow-xl flex items-center gap-3 px-4 py-2.5 text-sm"
              style={{ backgroundColor: 'rgba(51,65,85,0.9)' }}
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                <Users className="size-3.5" style={{ color: '#94a3b8' }} />
                <span className="text-xs" style={{ color: '#e2e8f0' }}>
                  상담사
                </span>
                <span className={`px-2 py-0.5 rounded-full font-bold min-w-[28px] text-center text-white ${agentCount > 0 ? 'bg-[#405189]' : 'bg-slate-600'}`}>{agentCount}</span>
                <span className="text-xs" style={{ color: '#e2e8f0' }}>
                  명
                </span>
              </span>
              <span className="flex-shrink-0" style={{ color: '#94a3b8' }}>
                ×
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                <Wrench className="size-3.5" style={{ color: '#94a3b8' }} />
                <span className="text-xs" style={{ color: '#e2e8f0' }}>
                  스킬셋
                </span>
                <span className={`px-2 py-0.5 rounded-full font-bold min-w-[28px] text-center text-white ${skillsetCount > 0 ? 'bg-[#405189]' : 'bg-slate-600'}`}>
                  {skillsetCount}
                </span>
                <span className="text-xs" style={{ color: '#e2e8f0' }}>
                  건
                </span>
              </span>
              <Button
                icon={<Eye className="size-3.5" />}
                disabled={!bothSelected}
                onClick={() => setStatusModalOpen(true)}
                style={{ backgroundColor: '#334155', borderColor: '#475569', color: '#e2e8f0', opacity: bothSelected ? 1 : 0.38 }}
              >
                매핑 확인
              </Button>
              <Button
                type="primary"
                icon={<Plus className="size-3.5" />}
                disabled={!bothSelected}
                onClick={() => setGrantDrawerOpen(true)}
                style={{ opacity: bothSelected ? 1 : 0.38 }}
              >
                부여
              </Button>
              <Button
                danger
                icon={<Trash2 className="size-3.5" />}
                disabled={!bothSelected}
                onClick={handleBulkRevoke}
                loading={bulkRevokePending}
                style={{ opacity: bothSelected ? 1 : 0.38 }}
              >
                해제
              </Button>
              {/* 우선순위·스킬레벨 일괄 수정: 선택 교차 행 전체에 동일 값 SET (배정된 행만, 미존재 조합 skip) */}
              <span className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0" style={{ opacity: bothSelected ? 1 : 0.38 }}>
                <span className="text-xs" style={{ color: '#e2e8f0' }}>
                  우선순위
                </span>
                <InputNumber size="small" min={0} max={9} value={toolbarPriority} onChange={(v) => setToolbarPriority(v ?? 0)} disabled={!bothSelected} style={{ width: 56 }} />
                <span className="text-xs" style={{ color: '#e2e8f0' }}>
                  스킬레벨
                </span>
                <InputNumber
                  size="small"
                  min={0}
                  max={99}
                  value={toolbarSkillLevel}
                  onChange={(v) => setToolbarSkillLevel(v ?? 0)}
                  disabled={!bothSelected}
                  style={{ width: 56 }}
                />
              </span>
              <Button
                icon={<Pencil className="size-3.5" />}
                disabled={!bothSelected}
                onClick={handleBulkUpdatePl}
                loading={bulkUpdatePlPending}
                style={{ backgroundColor: '#334155', borderColor: '#475569', color: '#e2e8f0', opacity: bothSelected ? 1 : 0.38 }}
              >
                우선순위·스킬레벨 수정
              </Button>
              <Button
                type="primary"
                icon={<Layers className="size-3.5" />}
                disabled={!applyEnabled}
                title={applyTitle}
                onClick={() => setApplyDrawerOpen(true)}
                style={{ opacity: applyEnabled ? 1 : 0.38 }}
              >
                스킬모음 적용
              </Button>
              <Button
                type="text"
                onClick={() => {
                  setSelectedAgentIds([]);
                  setSelectedSkillsetIds([]);
                  setLockedTenantId(null);
                  agentGridRef1.current?.api?.deselectAll();
                  agentGridRef2.current?.api?.deselectAll();
                  skillsetGridRef1.current?.api?.deselectAll();
                  skillsetGridRef2.current?.api?.deselectAll();
                }}
                style={{ color: '#e2e8f0' }}
                className="hover:!text-white"
              >
                선택 해제
              </Button>
            </div>
          );
        })()}

      {/* 부여 Drawer (P/L 확인) — 양쪽 모드 공통 */}
      <SkillAssignGrantDrawer
        open={grantDrawerOpen}
        agents={selectedAgentEntities}
        skillsets={selectedSkillsetEntities}
        onClose={() => setGrantDrawerOpen(false)}
        onSubmit={handleGrantSubmit}
        loading={bulkGrantPending}
        defaultPriority={toolbarPriority}
        defaultSkillLevel={toolbarSkillLevel}
      />

      {/* 배정 현황 모달 (읽기 전용) */}
      <SkillAssignStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        selectedAgents={selectedAgentEntities}
        selectedSkillsets={selectedSkillsetEntities}
      />

      {/* 스킬모음 적용 Drawer — 모음 단일선택 + 멤버 P/L 미리보기 + 모음 CRUD 내장 (양쪽 모드 공통) */}
      <SkillGroupApplyDrawer open={applyDrawerOpen} agents={selectedAgentEntities} tenantId={selectedTenantId ?? undefined} onClose={() => setApplyDrawerOpen(false)} />

      {/* 배정된 항목 P/L 수정 Drawer (InlineAssignPanel ✎ 진입점) */}
      <SkillAgentEditDrawer open={editRow != null} row={editRow} onClose={() => setEditRow(null)} />
    </div>
  );
}

interface ModeButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ModeButton({ active, icon, label, onClick }: ModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition ${
        active ? 'bg-[#405189] text-white' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:text-[#405189] hover:border-[#405189]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface CompactTenantPillProps {
  name: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}

function CompactTenantPill({ name, count, selected, onClick }: CompactTenantPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${name} · 매핑 ${count.toLocaleString()}건`}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
        selected
          ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
      }`}
    >
      <span className="font-medium truncate max-w-[120px]">{name}</span>
      <span className={`text-[11px] ${selected ? 'text-white/80' : 'text-gray-400'}`}>{count.toLocaleString()}건</span>
    </button>
  );
}

// ─── ViewDetailCard ──────────────────────────────────────────────────────────
interface ViewDetailCardProps {
  title: string;
  subtitle: string;
  priority: number | null | undefined;
  skillLevel: number | null | undefined;
  onClick: () => void;
  onEdit?: () => void;
}

function ViewDetailCard({ title, subtitle, priority, skillLevel, onClick, onEdit }: ViewDetailCardProps) {
  const level = skillLevel ?? 0;
  const dotColor = level >= 71 ? '#3b82f6' : level >= 41 ? '#f59e0b' : '#9ca3af';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative w-full text-left border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2.5 text-xs hover:border-[#c5cbe0] hover:bg-[#f9fafc] transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5cbe0]"
    >
      {/* 스킬레벨 색상 도트 */}
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
      {/* 이름 + 서브타이틀 */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-800 truncate">{title}</div>
        <div className="text-[11px] text-gray-400 truncate mt-0.5">{subtitle}</div>
      </div>
      {/* PRIORITY */}
      <div className="flex-shrink-0 text-center">
        <div className="text-[10px] text-gray-400">우선순위</div>
        <div className="font-bold text-sm text-[#405189]">{priority ?? '-'}</div>
      </div>
      {/* SKILL_LEVEL */}
      <div className="flex-shrink-0 text-center min-w-[52px]">
        <div className="text-[10px] text-gray-400">스킬레벨</div>
        <div className="font-bold text-sm text-[#405189]">{level}</div>
      </div>
      {/* 우선순위/레벨 수정 진입점 */}
      {onEdit && (
        <button
          type="button"
          title="우선순위/레벨 수정"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-[#405189] hover:bg-[#eef1fb] transition"
        >
          <Pencil className="size-3.5" />
        </button>
      )}
    </div>
  );
}

// GrantToolbar 제거됨 (2026-06-07 재설계).
// 배정/해제/현황 액션은 화면 하단 BulkActionBar 로 일원화.
// P/L 입력은 부여 시점 SkillAssignGrantDrawer 에서 수행.

// ─── ViewDetailCardEditable ───────────────────────────────────────────────────
// InlineAssignPanel 에서 사용. P/L 숫자 클릭 → input 인라인 편집 → blur/Enter 자동저장.
// ag-Grid 인라인 편집 대신 카드 수준에서 구현 (현재 InlineAssignPanel 은 카드 그리드).
// blur 폭탄 방지: 편집 상태를 'priority' | 'skillLevel' | null 로 관리, 한 필드씩만 열림.
interface ViewDetailCardEditableProps {
  title: string;
  subtitle: string;
  priority: number | null | undefined;
  skillLevel: number | null | undefined;
  row: SkillAgentResponse;
  onEdit: () => void; // fallback: Drawer 열기
}

function ViewDetailCardEditable({ title, subtitle, priority, skillLevel, row, onEdit }: ViewDetailCardEditableProps) {
  const level = skillLevel ?? 0;
  const dotColor = level >= 71 ? '#3b82f6' : level >= 41 ? '#f59e0b' : '#9ca3af';

  // 어떤 필드가 편집 중인지
  const [editing, setEditing] = useState<'priority' | 'skillLevel' | null>(null);
  // 편집 중인 임시 값
  const [editPriority, setEditPriority] = useState<number>(priority ?? 0);
  const [editSkillLevel, setEditSkillLevel] = useState<number>(level);
  // input ref (focus 제어)
  const priorityInputRef = useRef<HTMLInputElement>(null);
  const skillLevelInputRef = useRef<HTMLInputElement>(null);
  // 저장 중 상태
  const [saving, setSaving] = useState(false);

  const { mutate: updateSkillAgent } = useUpdateSkillAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('저장되었습니다');
        setSaving(false);
        setEditing(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '저장 실패';
        toast.error(msg);
        setSaving(false);
        setEditing(null);
      },
    },
  });

  // 편집 시작 시 input focus
  useEffect(() => {
    if (editing === 'priority') {
      setEditPriority(priority ?? 0);
      // 다음 render cycle 에 focus (input이 DOM에 마운트된 후)
      requestAnimationFrame(() => {
        priorityInputRef.current?.focus();
        priorityInputRef.current?.select();
      });
    } else if (editing === 'skillLevel') {
      setEditSkillLevel(level);
      requestAnimationFrame(() => {
        skillLevelInputRef.current?.focus();
        skillLevelInputRef.current?.select();
      });
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveField = (field: 'priority' | 'skillLevel', value: number) => {
    const clampedP = field === 'priority' ? Math.max(0, Math.min(9, value)) : (priority ?? 0);
    const clampedL = field === 'skillLevel' ? Math.max(0, Math.min(99, value)) : level;
    setSaving(true);
    updateSkillAgent({ agentId: row.agentId, skillsetId: row.skillsetId, body: { priority: clampedP, skillLevel: clampedL } });
  };

  const handleBlur = (field: 'priority' | 'skillLevel') => {
    if (field === 'priority') {
      const v = Math.max(0, Math.min(9, editPriority));
      if (v !== (priority ?? 0)) saveField('priority', v);
      else setEditing(null);
    } else {
      const v = Math.max(0, Math.min(99, editSkillLevel));
      if (v !== level) saveField('skillLevel', v);
      else setEditing(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'priority' | 'skillLevel') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur(field);
    } else if (e.key === 'Escape') {
      setEditing(null);
    }
  };

  return (
    <div className="group relative w-full text-left border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2.5 text-xs hover:border-[#c5cbe0] hover:bg-[#f9fafc] transition">
      {/* 스킬레벨 색상 도트 */}
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
      {/* 이름 + 서브타이틀 */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-800 truncate">{title}</div>
        <div className="text-[11px] text-gray-400 truncate mt-0.5">{subtitle}</div>
      </div>

      {/* PRIORITY 인라인 편집 */}
      <div className="flex-shrink-0 text-center">
        <div className="text-[10px] text-gray-400">우선순위</div>
        {editing === 'priority' ? (
          <input
            ref={priorityInputRef}
            type="number"
            min={0}
            max={9}
            value={editPriority}
            onChange={(e) => setEditPriority(parseInt(e.target.value) || 0)}
            onBlur={() => handleBlur('priority')}
            onKeyDown={(e) => handleKeyDown(e, 'priority')}
            className="w-10 text-center text-sm font-bold text-[#405189] border border-[#405189] rounded outline-none bg-white"
            style={{ boxShadow: '0 0 0 2px rgba(64,81,137,0.15)' }}
          />
        ) : (
          <button
            type="button"
            title="클릭하여 우선순위 편집 (0~9)"
            onClick={() => {
              if (!saving) setEditing('priority');
            }}
            className="font-bold text-sm text-[#405189] bg-[#d1fdfd] rounded px-1.5 py-0.5 min-w-[28px] hover:bg-[#93c5fd] transition cursor-pointer tabular-nums"
          >
            {saving && editing === null ? '...' : (priority ?? '-')}
          </button>
        )}
      </div>

      {/* SKILL_LEVEL 인라인 편집 */}
      <div className="flex-shrink-0 text-center min-w-[52px]">
        <div className="text-[10px] text-gray-400">스킬레벨</div>
        {editing === 'skillLevel' ? (
          <input
            ref={skillLevelInputRef}
            type="number"
            min={0}
            max={99}
            value={editSkillLevel}
            onChange={(e) => setEditSkillLevel(parseInt(e.target.value) || 0)}
            onBlur={() => handleBlur('skillLevel')}
            onKeyDown={(e) => handleKeyDown(e, 'skillLevel')}
            className="w-12 text-center text-sm font-bold text-[#405189] border border-[#405189] rounded outline-none bg-white"
            style={{ boxShadow: '0 0 0 2px rgba(64,81,137,0.15)' }}
          />
        ) : (
          <button
            type="button"
            title="클릭하여 스킬레벨 편집 (0~99)"
            onClick={() => {
              if (!saving) setEditing('skillLevel');
            }}
            className="font-bold text-sm text-[#405189] bg-[#d1fdfd] rounded px-1.5 py-0.5 min-w-[32px] hover:bg-[#93c5fd] transition cursor-pointer tabular-nums"
          >
            {level}
          </button>
        )}
      </div>

      {/* fallback: Drawer 열기 */}
      <button
        type="button"
        title="드로어에서 우선순위/스킬레벨 수정"
        onClick={onEdit}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-[#405189] hover:bg-[#eef1fb] transition"
      >
        <Pencil className="size-3" />
      </button>
    </div>
  );
}

// ─── InlineAssignPanel ────────────────────────────────────────────────────────
// 모드 ①/② 에서 행 hover 시 우측 상단에 floating 팝오버로 표시 (그리드 비침해).
// 개선 3차: 고정 사이드 패널(그리드 가림) → hover floating popover 로 전환.
// 마우스가 그리드 행 위에 있을 때만 표시, 패널 자체에 진입하면 유지, 이탈 시 닫힘.
// P/L 숫자 클릭 → 인라인 input 편집 → Enter/blur 자동 저장 유지.
interface InlineAssignItem {
  key: number;
  title: string;
  subtitle: string;
  priority: number | null | undefined;
  skillLevel: number | null | undefined;
  row: SkillAgentResponse;
}

interface InlineAssignPanelProps {
  visible: boolean;
  headerLabel: string;
  entityName: string;
  entitySub: string | null;
  count: number;
  fetching: boolean;
  emptyText: string;
  items: InlineAssignItem[];
  onEdit: (row: SkillAgentResponse) => void;
  /** 항목별 단건 해제 — SidePanelRow x버튼 클릭 시 호출 */
  onDelete: (row: SkillAgentResponse) => void;
  onClose: () => void;
  onPanelMouseEnter: () => void;
  onPanelMouseLeave: () => void;
}

function InlineAssignPanel({
  visible,
  headerLabel,
  entityName,
  entitySub,
  count,
  fetching,
  emptyText,
  items,
  onEdit,
  onDelete,
  onClose,
  onPanelMouseEnter,
  onPanelMouseLeave,
}: InlineAssignPanelProps) {
  const [filterText, setFilterText] = useState('');

  // visible 이 false → true 로 바뀔 때(새 행 hover) 필터 초기화
  const prevVisibleRef = useRef(visible);
  useEffect(() => {
    if (visible && !prevVisibleRef.current) setFilterText('');
    prevVisibleRef.current = visible;
  }, [visible]);

  // ESC 키 닫힘
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [visible, onClose]);

  const filteredItems = useMemo(() => {
    const kw = filterText.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((it) => it.title.toLowerCase().includes(kw) || it.subtitle.toLowerCase().includes(kw));
  }, [items, filterText]);

  const filterInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="absolute top-2 z-20 bg-white flex flex-col overflow-hidden"
      style={{
        right: '41%',
        width: 300,
        maxHeight: 440,
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
      }}
      onMouseEnter={onPanelMouseEnter}
      onMouseLeave={onPanelMouseLeave}
    >
      {/* 패널 헤더 */}
      <div className="px-3 pt-2.5 pb-2 border-b border-gray-100 flex-shrink-0 bg-[#f8f9fc]">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-gray-400 font-medium">{headerLabel}</div>
            <div className="text-[13px] font-bold text-gray-800 truncate leading-tight">{entityName}</div>
          </div>
          {entitySub != null && <span className="text-[11px] text-gray-500 flex-shrink-0">{entitySub}</span>}
          {/* X 닫기 버튼 */}
          <button
            type="button"
            title="닫기 (ESC)"
            onClick={onClose}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {!fetching && (
            <span className="text-[11px] text-[#405189] font-semibold">
              {count}건 배정됨
              {filterText.trim() && ` (표시 ${filteredItems.length}건)`}
            </span>
          )}
          {fetching && <span className="text-[11px] text-gray-400">조회 중...</span>}
          <span className="text-[10px] text-gray-400 ml-auto">우선순위/스킬레벨 클릭하여 수정</span>
        </div>
        {/* 필터 입력 — 항목 2건 이상일 때만 표시 */}
        {!fetching && items.length >= 2 && (
          <div className="mt-1.5 flex items-center gap-1 px-1.5 py-1 rounded-md bg-white border border-gray-200 focus-within:border-[#405189] focus-within:ring-1 focus-within:ring-[#405189]/20 transition">
            <Search className="size-3 text-gray-400 flex-shrink-0" />
            <input
              ref={filterInputRef}
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="항목명 검색..."
              className="flex-1 text-[11px] text-gray-700 bg-transparent outline-none placeholder:text-gray-300 min-w-0"
              onMouseDown={(e) => e.stopPropagation()}
            />
            {filterText && (
              <button
                type="button"
                onClick={() => {
                  setFilterText('');
                  filterInputRef.current?.focus();
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 패널 본문 */}
      <div className="overflow-y-auto p-1.5" style={{ maxHeight: 320 }}>
        {fetching ? (
          <div className="flex items-center justify-center py-6">
            <Spin size="small" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-1 text-gray-400 text-xs">{emptyText}</div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 gap-1 text-gray-400 text-xs">
            <FilterX className="size-4 text-gray-300" />
            <span>'{filterText}' 에 맞는 항목이 없습니다</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredItems.map((item) => (
              <SidePanelRow
                key={item.key}
                title={item.title}
                subtitle={item.subtitle}
                priority={item.priority}
                skillLevel={item.skillLevel}
                row={item.row}
                onEdit={() => onEdit(item.row)}
                onDelete={() => onDelete(item.row)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SidePanelRow ─────────────────────────────────────────────────────────────
// 우측 사이드 패널 내 항목 행. 1열 테이블 스타일 — 스킬셋명 + P 값 + L 값 + 진행바.
// ViewDetailCardEditable 과 동일한 인라인 P/L 편집 로직 사용.
interface SidePanelRowProps {
  title: string;
  subtitle: string;
  priority: number | null | undefined;
  skillLevel: number | null | undefined;
  row: SkillAgentResponse;
  onEdit: () => void;
  onDelete: () => void;
}

function SidePanelRow({ title, subtitle, priority, skillLevel, row, onEdit, onDelete }: SidePanelRowProps) {
  const level = skillLevel ?? 0;
  const dotColor = level >= 71 ? '#3b82f6' : level >= 41 ? '#f59e0b' : '#9ca3af';

  const [editing, setEditing] = useState<'priority' | 'skillLevel' | null>(null);
  const [editPriority, setEditPriority] = useState<number>(priority ?? 0);
  const [editSkillLevel, setEditSkillLevel] = useState<number>(level);
  const priorityInputRef = useRef<HTMLInputElement>(null);
  const skillLevelInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const { mutate: updateSkillAgent } = useUpdateSkillAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('저장되었습니다');
        setSaving(false);
        setEditing(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '저장 실패';
        toast.error(msg);
        setSaving(false);
        setEditing(null);
      },
    },
  });

  useEffect(() => {
    if (editing === 'priority') {
      setEditPriority(priority ?? 0);
      requestAnimationFrame(() => {
        priorityInputRef.current?.focus();
        priorityInputRef.current?.select();
      });
    } else if (editing === 'skillLevel') {
      setEditSkillLevel(level);
      requestAnimationFrame(() => {
        skillLevelInputRef.current?.focus();
        skillLevelInputRef.current?.select();
      });
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveField = (field: 'priority' | 'skillLevel', value: number) => {
    const clampedP = field === 'priority' ? Math.max(0, Math.min(9, value)) : (priority ?? 0);
    const clampedL = field === 'skillLevel' ? Math.max(0, Math.min(99, value)) : level;
    setSaving(true);
    updateSkillAgent({ agentId: row.agentId, skillsetId: row.skillsetId, body: { priority: clampedP, skillLevel: clampedL } });
  };

  const handleBlur = (field: 'priority' | 'skillLevel') => {
    if (field === 'priority') {
      const v = Math.max(0, Math.min(9, editPriority));
      if (v !== (priority ?? 0)) saveField('priority', v);
      else setEditing(null);
    } else {
      const v = Math.max(0, Math.min(99, editSkillLevel));
      if (v !== level) saveField('skillLevel', v);
      else setEditing(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'priority' | 'skillLevel') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur(field);
    } else if (e.key === 'Escape') {
      setEditing(null);
    }
  };

  return (
    <div className="group flex items-center gap-2 px-2.5 py-2 rounded-md border border-gray-100 hover:border-[#c5cbe0] hover:bg-[#f9fafc] transition text-xs">
      {/* 스킬레벨 도트 */}
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
      {/* 이름 + 서브타이틀 */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-800 truncate">{title}</div>
        <div className="text-[10px] text-gray-400 truncate mt-0.5">{subtitle}</div>
      </div>
      {/* P 인라인 편집 */}
      <div className="flex-shrink-0 flex flex-col items-center min-w-[38px]">
        <div className="text-[10px] text-gray-400 mb-0.5">우선순위</div>
        {editing === 'priority' ? (
          <input
            ref={priorityInputRef}
            type="number"
            min={0}
            max={9}
            value={editPriority}
            onChange={(e) => setEditPriority(parseInt(e.target.value) || 0)}
            onBlur={() => handleBlur('priority')}
            onKeyDown={(e) => handleKeyDown(e, 'priority')}
            className="w-9 text-center text-[13px] font-bold text-[#405189] border border-[#405189] rounded outline-none bg-white"
            style={{ boxShadow: '0 0 0 2px rgba(64,81,137,0.15)' }}
          />
        ) : (
          <button
            type="button"
            title="클릭하여 우선순위 편집 (0~9)"
            onClick={() => {
              if (!saving) setEditing('priority');
            }}
            className="text-[14px] font-bold text-[#405189] bg-[#eef1fb] rounded px-2 py-0.5 min-w-[34px] text-center hover:bg-[#d8dff6] border border-transparent hover:border-[#405189] transition cursor-pointer tabular-nums"
          >
            {saving && editing === null ? '...' : (priority ?? '-')}
          </button>
        )}
      </div>
      {/* L 인라인 편집 */}
      <div className="flex-shrink-0 flex flex-col items-center min-w-[38px]">
        <div className="text-[10px] text-gray-400 mb-0.5">스킬레벨</div>
        {editing === 'skillLevel' ? (
          <input
            ref={skillLevelInputRef}
            type="number"
            min={0}
            max={99}
            value={editSkillLevel}
            onChange={(e) => setEditSkillLevel(parseInt(e.target.value) || 0)}
            onBlur={() => handleBlur('skillLevel')}
            onKeyDown={(e) => handleKeyDown(e, 'skillLevel')}
            className="w-10 text-center text-[13px] font-bold text-[#405189] border border-[#405189] rounded outline-none bg-white"
            style={{ boxShadow: '0 0 0 2px rgba(64,81,137,0.15)' }}
          />
        ) : (
          <button
            type="button"
            title="클릭하여 스킬레벨 편집 (0~99)"
            onClick={() => {
              if (!saving) setEditing('skillLevel');
            }}
            className="text-[14px] font-bold text-[#405189] bg-[#eef1fb] rounded px-2 py-0.5 min-w-[34px] text-center hover:bg-[#d8dff6] border border-transparent hover:border-[#405189] transition cursor-pointer tabular-nums"
          >
            {level}
          </button>
        )}
      </div>
      {/* fallback: Drawer 열기 */}
      <button
        type="button"
        title="드로어에서 우선순위/스킬레벨 수정"
        onClick={onEdit}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-[#405189] hover:bg-[#eef1fb] transition"
      >
        <Pencil className="size-3" />
      </button>
      {/* 단건 해제 버튼 */}
      <button
        type="button"
        title="이 항목 배정 해제"
        onClick={onDelete}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

// ─── Coverage 진행바 + 비율 (보유건 셀 공통 표시) ──────────────────────────────
function CoverageBar({ holding, total }: { holding: number; total: number }) {
  const pct = total > 0 ? (holding / total) * 100 : 0;
  const color = holding === total ? '#16a34a' : holding === 0 ? '#9ca3af' : '#f59e0b';
  return (
    <div className="w-12 h-1.5 bg-gray-100 rounded overflow-hidden flex-shrink-0">
      <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── 보유/미보유 분해 행 한 줄 ────────────────────────────────────────────────
interface BreakdownRowProps {
  name: string;
  sub?: string | null;
  holder: boolean;
  priority?: number | null;
  skillLevel?: number | null;
  onEdit?: () => void;
  /** 보유자만 — 단건 배정 해제 */
  onDelete?: () => void;
}

function BreakdownRow({ name, sub, holder, priority, skillLevel, onEdit, onDelete }: BreakdownRowProps) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${holder ? 'bg-[#f0fdf4]' : 'bg-gray-50'}`}>
      {/* 보유=초록✓ / 미보유=회색✗ */}
      <span
        className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${holder ? 'bg-[#16a34a] text-white' : 'bg-gray-300 text-white'}`}
        aria-label={holder ? '보유' : '미보유'}
      >
        {holder ? <Check className="size-2.5" strokeWidth={3} /> : <X className="size-2.5" strokeWidth={3} />}
      </span>
      {/* 이름 + 보조정보 */}
      <div className="flex-1 min-w-0">
        <div className={`truncate font-medium ${holder ? 'text-gray-800' : 'text-gray-400'}`}>{name}</div>
        {sub != null && <div className="truncate text-[10px] text-gray-400">{sub}</div>}
      </div>
      {/* 보유자: P/L + ✎ 수정 진입점 + ✕ 단건 해제 */}
      {holder ? (
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 tabular-nums">
            <span className="text-gray-400">우선순위</span>
            <span className="font-semibold text-[#405189]">{priority ?? '-'}</span>
          </span>
          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 tabular-nums">
            <span className="text-gray-400">스킬레벨</span>
            <span className="font-semibold text-[#405189]">{skillLevel ?? '-'}</span>
          </span>
          {onEdit && (
            <button
              type="button"
              title="우선순위/레벨 수정"
              onClick={onEdit}
              className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-[#405189] hover:bg-[#eef1fb] transition"
            >
              <Pencil className="size-3" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              title="배정 해제"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      ) : (
        <span className="flex-shrink-0 text-[10px] text-gray-400">미보유</span>
      )}
    </div>
  );
}

// ─── 분해 팝오버 본문 (보유 ✓ → 미보유 ✗ 순) ────────────────────────────────
interface BreakdownEntry {
  key: number;
  name: string;
  sub?: string | null;
  holder: boolean;
  priority?: number | null;
  skillLevel?: number | null;
  row?: SkillAgentResponse;
}

interface BreakdownPanelProps {
  title: string;
  holding: number;
  total: number;
  fetching: boolean;
  entries: BreakdownEntry[];
  onEdit: (row: SkillAgentResponse) => void;
  /** 항목별 단건 해제 */
  onDelete: (row: SkillAgentResponse) => void;
}

function BreakdownPanel({ title, holding, total, fetching, entries, onEdit, onDelete }: BreakdownPanelProps) {
  const [filterText, setFilterText] = useState('');
  const filterInputRef = useRef<HTMLInputElement>(null);

  // 보유자 우선 → 미보유 (보유자 내 priority 오름차순)
  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) => {
        if (a.holder !== b.holder) return a.holder ? -1 : 1;
        if (a.holder && b.holder) return (a.priority ?? 99) - (b.priority ?? 99);
        return 0;
      }),
    [entries],
  );

  const filteredSorted = useMemo(() => {
    const kw = filterText.trim().toLowerCase();
    if (!kw) return sorted;
    return sorted.filter((e) => e.name.toLowerCase().includes(kw) || (e.sub ?? '').toLowerCase().includes(kw));
  }, [sorted, filterText]);

  return (
    <div className="w-[280px]">
      <div className="flex items-center gap-2 pb-2 mb-1 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-700 truncate flex-1">{title}</span>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: holding === total ? '#16a34a' : holding === 0 ? '#9ca3af' : '#f59e0b' }}>
          {holding}/{total} 보유
        </span>
      </div>
      {/* 필터 입력 — 항목 2건 이상일 때만 표시 */}
      {!fetching && entries.length >= 2 && (
        <div className="mb-2 flex items-center gap-1 px-1.5 py-1 rounded-md bg-gray-50 border border-gray-200 focus-within:border-[#405189] focus-within:ring-1 focus-within:ring-[#405189]/20 transition">
          <Search className="size-3 text-gray-400 flex-shrink-0" />
          <input
            ref={filterInputRef}
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="이름 검색..."
            className="flex-1 text-[11px] text-gray-700 bg-transparent outline-none placeholder:text-gray-300 min-w-0"
          />
          {filterText && (
            <button
              type="button"
              onClick={() => {
                setFilterText('');
                filterInputRef.current?.focus();
              }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="size-3" />
            </button>
          )}
          {filterText.trim() && (
            <span className="flex-shrink-0 text-[10px] text-gray-400 tabular-nums">
              {filteredSorted.length}/{entries.length}
            </span>
          )}
        </div>
      )}
      {fetching ? (
        <div className="flex items-center justify-center py-4">
          <Spin size="small" />
        </div>
      ) : filteredSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-5 gap-1 text-gray-400 text-xs">
          <FilterX className="size-4 text-gray-300" />
          <span>'{filterText}' 에 맞는 항목이 없습니다</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-0.5">
          {filteredSorted.map((e) => (
            <BreakdownRow
              key={e.key}
              name={e.name}
              sub={e.sub}
              holder={e.holder}
              priority={e.priority}
              skillLevel={e.skillLevel}
              onEdit={e.holder && e.row ? () => onEdit(e.row as SkillAgentResponse) : undefined}
              onDelete={e.holder && e.row ? () => onDelete(e.row as SkillAgentResponse) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 보유건 셀 (모드① 스킬셋) — 클릭 시 선택 상담사 보유/미보유 분해 ──────────
interface SkillsetCoverageCellProps {
  skillsetId: number;
  skillsetName: string;
  holding: number;
  total: number;
  selectedAgents: AgentResponse[];
  onEdit: (row: SkillAgentResponse) => void;
  onDelete: (row: SkillAgentResponse) => void;
}

function SkillsetCoverageCell({ skillsetId, skillsetName, holding, total, selectedAgents, onEdit, onDelete }: SkillsetCoverageCellProps) {
  const [open, setOpen] = useState(false);
  // 팝오버 열렸을 때만 해당 스킬셋의 보유 상담사 조회 (lazy)
  const { data: holders = [], isFetching } = useGetAgentsBySkillset(open ? skillsetId : null);

  // cellRef: onMouseLeave 및 popover hover bridge 에서 사용 (선택 차단은 gridOptions.onCellClicked 로 처리)
  const cellRef = useRef<HTMLDivElement>(null);

  // hover bridge: 셀→팝오버 이동 중 닫힘 방지용 타이머
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 200);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  // 보유 상담사 행을 agentId 로 색인 (P/L + 전체 row 확보 → ✎ 연결)
  const holderMap = useMemo(() => {
    const m = new Map<number, SkillAgentResponse>();
    for (const h of holders) m.set(h.agentId, h);
    return m;
  }, [holders]);

  const entries = useMemo<BreakdownEntry[]>(
    () =>
      selectedAgents.map((a) => {
        const h = holderMap.get(a.agentId);
        // 보유자 row: holders 응답에 skillsetName 이 비어올 수 있어 셀 컨텍스트로 보강
        const row = h ? ({ ...h, skillsetId, skillsetName: h.skillsetName || skillsetName } as SkillAgentResponse) : undefined;
        return {
          key: a.agentId,
          name: a.agentName ?? a.agentLoginId ?? '-',
          sub: a.agentLoginId ?? null,
          holder: h != null,
          priority: h?.priority,
          skillLevel: h?.skillLevel,
          row,
        };
      }),
    [selectedAgents, holderMap, skillsetId, skillsetName],
  );

  // 팝오버 content를 hover bridge wrapper로 감싸서 오버레이 내부 진입 시 닫힘 취소
  const handleDelete = useCallback(
    (row: SkillAgentResponse) => {
      Modal.confirm({
        title: '배정 해제',
        content: `[${row.agentName ?? '-'}] 배정을 해제하시겠습니까?`,
        okText: '해제',
        okType: 'danger',
        cancelText: '취소',
        onOk: () => onDelete(row),
      });
    },
    [onDelete],
  );

  const popoverContent = (
    <div onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
      <BreakdownPanel title={skillsetName} holding={holding} total={total} fetching={isFetching} entries={entries} onEdit={onEdit} onDelete={handleDelete} />
    </div>
  );

  return (
    // cellRef: hover bridge 타이머 및 onMouseLeave 에서 사용. ag-Grid 선택 차단은 colDef.suppressMouseEventHandling.
    <div ref={cellRef} className="h-full w-full" onMouseLeave={scheduleClose}>
      <Popover open={open} onOpenChange={setOpen} trigger="click" placement="leftTop" destroyOnHidden content={popoverContent}>
        <button
          type="button"
          title="클릭하여 선택 상담사 보유/미보유 분해"
          className="flex items-center gap-2 h-full w-full text-left cursor-pointer hover:bg-[#f9fafc] rounded px-0.5"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <CoverageBar holding={holding} total={total} />
          <span
            style={{ color: holding === total ? '#16a34a' : holding === 0 ? '#9ca3af' : '#f59e0b', fontWeight: 600 }}
            className="text-xs tabular-nums underline decoration-dotted decoration-gray-300 underline-offset-2"
          >
            {holding}/{total}
          </span>
        </button>
      </Popover>
    </div>
  );
}

// ─── 보유건 셀 (모드② 상담사) — 클릭 시 선택 스킬셋 보유/미보유 분해 ──────────
interface AgentCoverageCellProps {
  agentId: number;
  agentName: string;
  holding: number;
  total: number;
  selectedSkillsets: SkillsetResponse[];
  onEdit: (row: SkillAgentResponse) => void;
  onDelete: (row: SkillAgentResponse) => void;
}

function AgentCoverageCell({ agentId, agentName, holding, total, selectedSkillsets, onEdit, onDelete }: AgentCoverageCellProps) {
  const [open, setOpen] = useState(false);
  // 팝오버 열렸을 때만 해당 상담사의 보유 스킬셋 조회 (lazy)
  const { data: holdings = [], isFetching } = useGetSkillsetsByAgent(open ? agentId : null);

  // cellRef: onMouseLeave 및 popover hover bridge 에서 사용 (선택 차단은 gridOptions.onCellClicked 로 처리)
  const cellRef = useRef<HTMLDivElement>(null);

  // hover bridge: 셀→팝오버 이동 중 닫힘 방지용 타이머
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 200);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  const holdingMap = useMemo(() => {
    const m = new Map<number, SkillAgentResponse>();
    for (const h of holdings) m.set(h.skillsetId, h);
    return m;
  }, [holdings]);

  const entries = useMemo<BreakdownEntry[]>(
    () =>
      selectedSkillsets.map((s) => {
        const h = holdingMap.get(s.skillsetId);
        const row = h ? ({ ...h, agentId, agentName: h.agentName || agentName } as SkillAgentResponse) : undefined;
        return {
          key: s.skillsetId,
          name: s.skillsetName ?? '-',
          sub: null,
          holder: h != null,
          priority: h?.priority,
          skillLevel: h?.skillLevel,
          row,
        };
      }),
    [selectedSkillsets, holdingMap, agentId, agentName],
  );

  // 팝오버 content를 hover bridge wrapper로 감싸서 오버레이 내부 진입 시 닫힘 취소
  const handleDelete = useCallback(
    (row: SkillAgentResponse) => {
      Modal.confirm({
        title: '배정 해제',
        content: `[${row.skillsetName ?? '-'}] 배정을 해제하시겠습니까?`,
        okText: '해제',
        okType: 'danger',
        cancelText: '취소',
        onOk: () => onDelete(row),
      });
    },
    [onDelete],
  );

  const popoverContent = (
    <div onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
      <BreakdownPanel title={agentName} holding={holding} total={total} fetching={isFetching} entries={entries} onEdit={onEdit} onDelete={handleDelete} />
    </div>
  );

  return (
    // cellRef: hover bridge 타이머 및 onMouseLeave 에서 사용. ag-Grid 선택 차단은 colDef.suppressMouseEventHandling.
    <div ref={cellRef} className="h-full w-full" onMouseLeave={scheduleClose}>
      <Popover open={open} onOpenChange={setOpen} trigger="click" placement="leftTop" destroyOnHidden content={popoverContent}>
        <button
          type="button"
          title="클릭하여 선택 스킬셋 보유/미보유 분해"
          className="flex items-center gap-2 h-full w-full text-left cursor-pointer hover:bg-[#f9fafc] rounded px-0.5"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <CoverageBar holding={holding} total={total} />
          <span
            style={{ color: holding === total ? '#16a34a' : holding === 0 ? '#9ca3af' : '#f59e0b', fontWeight: 600 }}
            className="text-xs tabular-nums underline decoration-dotted decoration-gray-300 underline-offset-2"
          >
            {holding}/{total}
          </span>
        </button>
      </Popover>
    </div>
  );
}
