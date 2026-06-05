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
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { ColDef, GridOptions, IRowNode } from 'ag-grid-community';
import { AgGridReact, type AgGridReact as AgGridReactType } from 'ag-grid-react';
import { Button, Card, Empty, Input, Modal, Popover, Space, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  ClipboardList,
  FilterX,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
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
import SkillAssignTenantCard from '../../features/skill-assign/components/SkillAssignTenantCard';
import SkillGroupFormDrawer, { type SkillGroupDrawerState } from '../../features/skill-assign/components/SkillGroupFormDrawer';
import SkillsetPickerDrawer from '../../features/skill-assign/components/SkillsetPickerDrawer';
import {
  useBulkGrant,
  useBulkRevoke,
  useGetAgentCoverage,
  useGetAgentsBySkillset,
  useGetSkillAssignTenants,
  useGetSkillsetCoverage,
  useGetSkillsetsByAgent,
} from '../../features/skill-assign/hooks/useSkillAssignQueries';
import type { SkillAgentResponse, SkillGroupResponse } from '../../features/skill-assign/types';
import SkillsetGroupTree from '../../features/skillset-master/components/SkillsetGroupTree';
import { useGetSkillsetGroups, useGetSkillsets } from '../../features/skillset-master/hooks/useSkillsetQueries';
import type { SkillsetResponse } from '../../features/skillset-master/types';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '상담사 관리', path: '/ipron/skill-assign' },
  { title: '스킬 관리', path: '/ipron/skill-assign' },
  { title: '스킬 배정', path: '/ipron/skill-assign' },
];

type Mode = 'agent' | 'skillset' | 'view';
type ViewSubMode = 'agent' | 'skillset'; // 조회 탭 내 기준 토글

export default function SkillAssignList() {
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
  const [cardExpanded, setCardExpanded] = useState(true);

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
  const [grantDrawerOpen, setGrantDrawerOpen] = useState(false);
  // (legacy single-select 잔재 — mode 'group' 의존성 위해 임시 유지)
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editRow, setEditRow] = useState<SkillAgentResponse | null>(null);

  // 모드 ③ 스킬모음
  const [groupSearch, setGroupSearch] = useState('');
  const [groupDrawer, setGroupDrawer] = useState<SkillGroupDrawerState>({ open: false });

  // 모드 ④ 배정 현황 조회 (view)
  const [viewSubMode, setViewSubMode] = useState<ViewSubMode>('agent');
  const [viewSelectedAgentId, setViewSelectedAgentId] = useState<number | null>(null);
  const [viewSelectedSkillsetId, setViewSelectedSkillsetId] = useState<number | null>(null);
  const viewAgentGridRef = useRef<AgGridReactType<AgentResponse>>(null);
  const viewSkillsetGridRef = useRef<AgGridReactType<SkillsetResponse>>(null);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: tenantStats = [] } = useGetSkillAssignTenants();

  // 상담사 / 상담그룹 트리 / 스킬셋 / 업무그룹 트리 — 양쪽 모드 모두 필요 (좌우 반전만 다름)
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

  // 모드 ①/② 인라인 배정 목록 — 정확히 1명/1건 선택 시 해당 단건의 배정 목록(P/L 포함) 조회.
  // 다중 선택(일괄 부여/해제) 흐름은 그대로 두고, 단건 선택 시에만 수정 진입점 패널 노출.
  const inlineAgentId = mode === 'agent' && selectedAgentIds.length === 1 ? selectedAgentIds[0] : null;
  const inlineSkillsetId = mode === 'skillset' && selectedSkillsetIds.length === 1 ? selectedSkillsetIds[0] : null;
  const { data: inlineAgentSkillsets = [], isFetching: inlineAgentSkillsetsFetching } = useGetSkillsetsByAgent(inlineAgentId);
  const { data: inlineSkillsetAgents = [], isFetching: inlineSkillsetAgentsFetching } = useGetAgentsBySkillset(inlineSkillsetId);
  const [inlineAssignExpanded, setInlineAssignExpanded] = useState(true);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutateAsync: bulkGrant, isPending: bulkGrantPending } = useBulkGrant({
    mutationOptions: {
      onSuccess: (result) => {
        toast.success(`${result.added}개 부여, ${result.skipped}개 skip (이미 존재)`);
        setGrantDrawerOpen(false);
        setSelectedAgentIds([]);
        setSelectedSkillsetIds([]);
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
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '해제 실패';
        toast.error(msg);
      },
    },
  });

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
  const filteredAgentsByGroup = useMemo(() => {
    let rows = filteredAgents;
    if (selectedAgentGroupId != null) {
      rows = rows.filter((a) => a.groupId === selectedAgentGroupId);
    }
    return rows;
  }, [filteredAgents, selectedAgentGroupId]);

  // 우측: 업무그룹 트리 선택에 따른 스킬셋 필터링. selectedSkillsetTreeId=null → 전체, 0 → 미배정, n → 그 그룹.
  const filteredSkillsetsByGroup = useMemo(() => {
    let rows = skillsetMasters;
    if (selectedSkillsetTreeId === 0) rows = rows.filter((s) => s.treeId == null);
    else if (selectedSkillsetTreeId != null) rows = rows.filter((s) => s.treeId === selectedSkillsetTreeId);
    return rows;
  }, [skillsetMasters, selectedSkillsetTreeId]);

  // 보유율 맵 (skillsetId → 보유 인원) — 모드 ①
  const coverageMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of coverage) m.set(c.skillsetId, c.holdingCount);
    return m;
  }, [coverage]);

  // 보유율 맵 (agentId → 보유 스킬셋 수) — 모드 ②
  const agentCoverageMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of agentCoverage) m.set(c.agentId, c.holdingCount);
    return m;
  }, [agentCoverage]);

  const skillsetTotalCount = skillsetMasters.length;
  const skillsetUnassignedCount = useMemo(() => skillsetMasters.filter((s) => s.treeId == null).length, [skillsetMasters]);

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

  // ─── Columns ────────────────────────────────────────────────────────────
  // 상담사 multi-select ag-Grid 컬럼 (모드 ① 좌측 / 모드 ② 우측 공용)
  const agentColumnsAg = useMemo<ColDef<AgentResponse>[]>(
    () => [
      { headerCheckboxSelection: true, checkboxSelection: true, width: 40, pinned: 'left', resizable: false, suppressHeaderMenuButton: true, filter: false },
      { field: 'agentLoginId', headerName: '로그인ID', width: 110 },
      { field: 'agentName', headerName: '이름', width: 90 },
      { field: 'groupName', headerName: '상담그룹', flex: 1, minWidth: 110, valueGetter: (p) => p.data?.groupName ?? '미배정' },
      {
        field: 'activateYn',
        headerName: '활성',
        width: 70,
        cellRenderer: ({ value }: { value: number | null }) => (value === 1 ? <Tag color="green">활성</Tag> : <Tag color="red">비활성</Tag>),
      },
      {
        headerName: '보유건',
        width: 168,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: (params: { data?: AgentResponse }) => {
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
            />
          );
        },
      },
    ],
    [selectedSkillsetIds.length, agentCoverageMap, selectedSkillsetEntities],
  );

  const agentGridOptionsAg = useMemo<GridOptions<AgentResponse>>(
    () => ({
      rowSelection: { mode: 'multiRow', checkboxes: true, enableClickSelection: true, enableSelectionWithoutKeys: true },
      defaultColDef: { resizable: true, sortable: true, filter: true, suppressHeaderMenuButton: true },
      getRowId: ({ data }) => String(data.agentId),
      onSelectionChanged: (e) => {
        setSelectedAgentIds(e.api.getSelectedRows().map((r) => r.agentId));
      },
    }),
    [],
  );

  // 스킬셋 multi-select ag-Grid (모드 ① 우측)
  const skillsetColumnsAg = useMemo<ColDef<SkillsetResponse>[]>(
    () => [
      { headerCheckboxSelection: true, checkboxSelection: true, width: 40, pinned: 'left', resizable: false, suppressHeaderMenuButton: true, filter: false },
      { field: 'skillsetName', headerName: '스킬셋명', flex: 1, minWidth: 140 },
      {
        headerName: '보유건',
        width: 168,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: (params: { data?: SkillsetResponse }) => {
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
            />
          );
        },
      },
    ],
    [selectedAgentIds.length, coverageMap, selectedAgentEntities],
  );

  const skillsetGridOptionsAg = useMemo<GridOptions<SkillsetResponse>>(
    () => ({
      rowSelection: { mode: 'multiRow', checkboxes: true, enableClickSelection: true, enableSelectionWithoutKeys: true },
      defaultColDef: { resizable: true, sortable: true, filter: true, suppressHeaderMenuButton: true },
      getRowId: ({ data }) => String(data.skillsetId),
      onSelectionChanged: (e) => {
        setSelectedSkillsetIds(e.api.getSelectedRows().map((r) => r.skillsetId));
      },
    }),
    [],
  );

  // ─── View 모드 — 좌측 단일선택 그리드 (상담사 기준) ────────────────────
  const viewAgentColumnsAg = useMemo<ColDef<AgentResponse>[]>(
    () => [
      { field: 'agentLoginId', headerName: '로그인ID', width: 110 },
      { field: 'agentName', headerName: '이름', width: 90 },
      { field: 'groupName', headerName: '상담그룹', flex: 1, minWidth: 110, valueGetter: (p) => p.data?.groupName ?? '미배정' },
    ],
    [],
  );

  const viewAgentGridOptions = useMemo<GridOptions<AgentResponse>>(
    () => ({
      rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
      defaultColDef: { resizable: true, sortable: true, filter: true, suppressHeaderMenuButton: true },
      getRowId: ({ data }) => String(data.agentId),
      onSelectionChanged: (e) => {
        const rows = e.api.getSelectedRows();
        setViewSelectedAgentId(rows.length > 0 ? rows[0].agentId : null);
      },
    }),
    [],
  );

  // ─── View 모드 — 좌측 단일선택 그리드 (스킬셋 기준) ────────────────────
  const viewSkillsetColumnsAg = useMemo<ColDef<SkillsetResponse>[]>(
    () => [
      { field: 'skillsetName', headerName: '스킬셋명', flex: 1, minWidth: 140 },
      {
        field: 'activateYn',
        headerName: '활성',
        width: 70,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: ({ value }: { value: number | null }) => (value === 1 ? <Tag color="green">활성</Tag> : <Tag color="default">비활성</Tag>),
      },
    ],
    [],
  );

  const viewSkillsetGridOptions = useMemo<GridOptions<SkillsetResponse>>(
    () => ({
      rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
      defaultColDef: { resizable: true, sortable: true, filter: true, suppressHeaderMenuButton: true },
      getRowId: ({ data }) => String(data.skillsetId),
      onSelectionChanged: (e) => {
        const rows = e.api.getSelectedRows();
        setViewSelectedSkillsetId(rows.length > 0 ? rows[0].skillsetId : null);
      },
    }),
    [],
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
            <ModeButton active={mode === 'agent'} icon={<Users className="size-3.5" />} label="상담사별 스킬할당" onClick={() => setMode('agent')} />
            <ModeButton active={mode === 'skillset'} icon={<Package className="size-3.5" />} label="스킬별 상담사할당" onClick={() => setMode('skillset')} />
            <ModeButton active={mode === 'view'} icon={<ClipboardList className="size-3.5" />} label="배정 현황 조회" onClick={() => setMode('view')} />
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

      {/* ===== 모드 ① 상담사별 스킬할당 (A→S) — 좌(상담사 multi) + 우(스킬셋 multi, 보유율) ===== */}
      {mode === 'agent' && (
        <div className="flex flex-col flex-1 min-h-0 gap-4">
          <PanelGroup direction="horizontal" className="flex-1 min-h-0">
            {/* 좌: 상담사 sub-panel [상담그룹 트리(접기/리사이즈) | grid] */}
            <Panel defaultSize={60} minSize={25}>
              <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
                <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
                  <Button
                    size="small"
                    type="text"
                    icon={agentTreeCollapsed1 ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                    title={agentTreeCollapsed1 ? '상담그룹 트리 펼치기' : '상담그룹 트리 접기'}
                    onClick={() => toggleTreePanel(agentTreePanelRef1)}
                    className="!text-gray-400 hover:!text-[#405189]"
                  />
                  <span className="text-sm font-semibold text-gray-700">👤 상담사</span>
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
                      📁 상담그룹
                      <span className="ml-auto text-[11px] text-gray-500 font-normal">{selectedAgentGroupId == null ? '전체' : '필터'}</span>
                    </div>
                    <div className="flex-1 min-h-0">
                      <AgentGroupTree tree={agentGroupTree} selectedGroupId={selectedAgentGroupId} onSelectGroup={setSelectedAgentGroupId} />
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />
                  <Panel defaultSize={70} minSize={40} className="min-w-0 min-h-0 ag-theme-quartz">
                    <AgGridReact<AgentResponse>
                      ref={agentGridRef1}
                      rowData={filteredAgentsByGroup}
                      columnDefs={agentColumnsAg}
                      gridOptions={agentGridOptionsAg}
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
                  <Button
                    size="small"
                    type="text"
                    icon={skillsetTreeCollapsed1 ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                    title={skillsetTreeCollapsed1 ? '업무그룹 트리 펼치기' : '업무그룹 트리 접기'}
                    onClick={() => toggleTreePanel(skillsetTreePanelRef1)}
                    className="!text-gray-400 hover:!text-[#405189]"
                  />
                  <span className="text-sm font-semibold text-gray-700">⚒️ 스킬셋 풀</span>
                  <span className="text-xs text-gray-500">
                    총 {filteredSkillsetsByGroup.length.toLocaleString()}건 · <strong className="text-[#405189]">선택 {selectedSkillsetIds.length}건</strong>
                    {selectedAgentIds.length > 0 && ` · ${selectedAgentIds.length}명 기준 보유율`}
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
                      📁 업무그룹
                      <span className="ml-auto text-[11px] text-gray-500 font-normal">
                        {selectedSkillsetTreeId == null ? '전체' : selectedSkillsetTreeId === 0 ? '미배정' : '필터'}
                      </span>
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
                          /* Phase 2 구현 예정 */
                        }}
                      />
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />
                  <Panel defaultSize={70} minSize={40} className="min-w-0 min-h-0 ag-theme-quartz">
                    <AgGridReact<SkillsetResponse>
                      ref={skillsetGridRef1}
                      rowData={filteredSkillsetsByGroup}
                      columnDefs={skillsetColumnsAg}
                      gridOptions={skillsetGridOptionsAg}
                      quickFilterText={skillsetQuickFilter}
                      loading={skillsetMastersLoading}
                    />
                  </Panel>
                </PanelGroup>
              </div>
            </Panel>
          </PanelGroup>

          {/* 단건 선택 시 — 그 상담사의 배정 스킬셋 목록 (P/L + ✎ 수정 진입점) */}
          <InlineAssignPanel
            visible={inlineAgentId != null}
            expanded={inlineAssignExpanded}
            onToggleExpand={() => setInlineAssignExpanded((v) => !v)}
            headerLabel="배정된 스킬셋"
            entityName={filteredAgentsByGroup.find((a) => a.agentId === inlineAgentId)?.agentName ?? '-'}
            entitySub={filteredAgentsByGroup.find((a) => a.agentId === inlineAgentId)?.agentLoginId ?? '-'}
            count={inlineAgentSkillsets.length}
            fetching={inlineAgentSkillsetsFetching}
            emptyText="이 상담사에 매핑된 스킬셋이 없습니다"
            items={inlineAgentSkillsets.map((item) => ({
              key: item.skillsetId,
              title: item.skillsetName ?? '-',
              subtitle: `미디어 ${item.mediaType ?? '-'} · ${item.activateYn === 1 ? '활성' : '비활성'}`,
              priority: item.priority,
              skillLevel: item.skillLevel,
              row: item,
            }))}
            onEdit={setEditRow}
          />
        </div>
      )}

      {/* ===== 모드 ② 스킬별 상담사할당 (S→A) — 좌(스킬셋 multi) + 우(상담사 multi, 보유율) ===== */}
      {mode === 'skillset' && (
        <div className="flex flex-col flex-1 min-h-0 gap-4">
          <PanelGroup direction="horizontal" className="flex-1 min-h-0">
            {/* 좌: 스킬셋 sub-panel [업무그룹 트리(접기/리사이즈) | 스킬셋 grid] */}
            <Panel defaultSize={50} minSize={20}>
              <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
                <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
                  <Button
                    size="small"
                    type="text"
                    icon={skillsetTreeCollapsed2 ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                    title={skillsetTreeCollapsed2 ? '업무그룹 트리 펼치기' : '업무그룹 트리 접기'}
                    onClick={() => toggleTreePanel(skillsetTreePanelRef2)}
                    className="!text-gray-400 hover:!text-[#405189]"
                  />
                  <span className="text-sm font-semibold text-gray-700">⚒️ 스킬셋</span>
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
                      📁 업무그룹
                      <span className="ml-auto text-[11px] text-gray-500 font-normal">
                        {selectedSkillsetTreeId == null ? '전체' : selectedSkillsetTreeId === 0 ? '미배정' : '필터'}
                      </span>
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
                          /* Phase 2 구현 예정 */
                        }}
                      />
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />
                  <Panel defaultSize={70} minSize={40} className="min-w-0 min-h-0 ag-theme-quartz">
                    <AgGridReact<SkillsetResponse>
                      ref={skillsetGridRef2}
                      rowData={filteredSkillsetsByGroup}
                      columnDefs={skillsetColumnsAg}
                      gridOptions={skillsetGridOptionsAg}
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
                  <Button
                    size="small"
                    type="text"
                    icon={agentTreeCollapsed2 ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                    title={agentTreeCollapsed2 ? '상담그룹 트리 펼치기' : '상담그룹 트리 접기'}
                    onClick={() => toggleTreePanel(agentTreePanelRef2)}
                    className="!text-gray-400 hover:!text-[#405189]"
                  />
                  <span className="text-sm font-semibold text-gray-700">👤 상담사</span>
                  <span className="text-xs text-gray-500">
                    총 {filteredAgentsByGroup.length.toLocaleString()}명 · <strong className="text-[#405189]">선택 {selectedAgentIds.length}명</strong>
                    {selectedSkillsetIds.length > 0 && ` · ${selectedSkillsetIds.length}건 기준 보유율`}
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
                      📁 상담그룹
                      <span className="ml-auto text-[11px] text-gray-500 font-normal">{selectedAgentGroupId == null ? '전체' : '필터'}</span>
                    </div>
                    <div className="flex-1 min-h-0">
                      <AgentGroupTree tree={agentGroupTree} selectedGroupId={selectedAgentGroupId} onSelectGroup={setSelectedAgentGroupId} />
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />
                  <Panel defaultSize={70} minSize={40} className="min-w-0 min-h-0 ag-theme-quartz">
                    <AgGridReact<AgentResponse>
                      ref={agentGridRef2}
                      rowData={filteredAgentsByGroup}
                      columnDefs={agentColumnsAg}
                      gridOptions={agentGridOptionsAg}
                      quickFilterText={agentQuickFilter}
                      loading={agentsLoading}
                    />
                  </Panel>
                </PanelGroup>
              </div>
            </Panel>
          </PanelGroup>

          {/* 단건 선택 시 — 그 스킬셋의 배정 상담사 목록 (P/L + ✎ 수정 진입점) */}
          <InlineAssignPanel
            visible={inlineSkillsetId != null}
            expanded={inlineAssignExpanded}
            onToggleExpand={() => setInlineAssignExpanded((v) => !v)}
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
          />
        </div>
      )}

      {/* ===== 모드 ④ 배정 현황 조회 — 좌(단일선택 그리드) + 우(디테일 카드 패널) ===== */}
      {mode === 'view' && (
        <PanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* 좌: 기준 그리드 */}
          <Panel defaultSize={45} minSize={25}>
            <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
              <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
                {/* 서브모드 토글 */}
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
                  총 {viewSubMode === 'agent' ? filteredAgentsByGroup.length.toLocaleString() + '명' : filteredSkillsetsByGroup.length.toLocaleString() + '건'}
                </span>
              </div>
              <div className="flex-1 min-h-0 ag-theme-quartz">
                {viewSubMode === 'agent' ? (
                  <AgGridReact<AgentResponse>
                    key="view-agent-grid"
                    ref={viewAgentGridRef}
                    rowData={filteredAgentsByGroup}
                    columnDefs={viewAgentColumnsAg}
                    gridOptions={viewAgentGridOptions}
                    loading={agentsLoading}
                  />
                ) : (
                  <AgGridReact<SkillsetResponse>
                    key="view-skillset-grid"
                    ref={viewSkillsetGridRef}
                    rowData={filteredSkillsetsByGroup}
                    columnDefs={viewSkillsetColumnsAg}
                    gridOptions={viewSkillsetGridOptions}
                    loading={skillsetMastersLoading}
                  />
                )}
              </div>
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
                      {filteredAgentsByGroup.find((a) => a.agentId === viewSelectedAgentId)?.agentName ?? '-'}
                      <span className="text-[#405189]/60">({filteredAgentsByGroup.find((a) => a.agentId === viewSelectedAgentId)?.agentLoginId ?? '-'})</span>
                    </span>
                    {!viewAgentSkillsetsFetching && <span className="text-[11px] text-gray-400">{viewAgentSkillsets.length}건</span>}
                    {viewAgentSkillsetsFetching && <span className="text-[11px] text-gray-400">조회 중...</span>}
                  </>
                ) : viewSubMode === 'skillset' && viewSelectedSkillsetId != null ? (
                  <>
                    <span className="text-xs font-semibold text-gray-700">배정된 상담사</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[#eef1fb] text-[#405189] border border-[#c5cbe0]">
                      {filteredSkillsetsByGroup.find((s) => s.skillsetId === viewSelectedSkillsetId)?.skillsetName ?? '-'}
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
                          subtitle={`미디어 ${item.mediaType ?? '-'} · ${item.activateYn === 1 ? '활성' : '비활성'}`}
                          priority={item.priority}
                          skillLevel={item.skillLevel}
                          onClick={() => handleViewDetailCardClick(item.skillsetId)}
                          onEdit={() => setEditRow(item)}
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
                          subtitle={`${item.agentLoginId ?? '-'} · ${item.tenantName ?? '-'}`}
                          priority={item.priority}
                          skillLevel={item.skillLevel}
                          onClick={() => handleViewDetailCardClick(item.agentId)}
                          onEdit={() => setEditRow(item)}
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

      {/* ===== Bulk Action Bar (floating bottom) — 양쪽 모드 공통, 선택 N + M ≥ 1 일 때만 ===== */}
      {selectedAgentIds.length > 0 && selectedSkillsetIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white rounded-xl shadow-xl flex items-center gap-3 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-1.5">
            <span>👤</span>
            <span className="text-white/60 text-xs">상담사</span>
            <span className="bg-[#405189] px-2 py-0.5 rounded-full font-bold min-w-[28px] text-center">{selectedAgentIds.length}</span>
            <span className="text-white/60 text-xs">명</span>
          </span>
          <span className="text-white/30">×</span>
          <span className="flex items-center gap-1.5">
            <span>⚒️</span>
            <span className="text-white/60 text-xs">스킬셋</span>
            <span className="bg-[#405189] px-2 py-0.5 rounded-full font-bold min-w-[28px] text-center">{selectedSkillsetIds.length}</span>
            <span className="text-white/60 text-xs">건</span>
          </span>
          <span className="text-white/40 mx-1">▶</span>
          <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => setGrantDrawerOpen(true)} style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
            부여 ({selectedAgentIds.length * selectedSkillsetIds.length}개)
          </Button>
          <Button danger icon={<Trash2 className="size-3.5" />} onClick={handleBulkRevoke} loading={bulkRevokePending}>
            해제
          </Button>
          <Button
            type="text"
            onClick={() => {
              setSelectedAgentIds([]);
              setSelectedSkillsetIds([]);
            }}
            className="!text-white/60 hover:!text-white"
          >
            선택 해제
          </Button>
        </div>
      )}

      {/* 부여 Drawer (N × M 매트릭스 입력) — 양쪽 모드 공통 */}
      <SkillAssignGrantDrawer
        open={grantDrawerOpen}
        agents={selectedAgentEntities}
        skillsets={selectedSkillsetEntities}
        onClose={() => setGrantDrawerOpen(false)}
        onSubmit={handleGrantSubmit}
        loading={bulkGrantPending}
      />

      {/* 배정된 항목 P/L 수정 Drawer (배정 현황 조회 카드의 ✎ 진입점) */}
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
      <span className={`text-[11px] ${selected ? 'text-white/80' : 'text-gray-400'}`}>{count.toLocaleString()}</span>
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
      {/* SKILL_LEVEL + 진행바 */}
      <div className="flex-shrink-0 text-center min-w-[52px]">
        <div className="text-[10px] text-gray-400">스킬레벨</div>
        <div className="font-bold text-sm text-[#405189]">{level}</div>
        <div className="w-full h-1 bg-gray-100 rounded overflow-hidden mt-0.5">
          <div className="h-full rounded transition-all" style={{ width: `${level}%`, backgroundColor: dotColor }} />
        </div>
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

// ─── InlineAssignPanel ────────────────────────────────────────────────────────
// 모드 ①/② 에서 단건 선택 시 하단에 노출되는 "배정 목록 + P/L + ✎" 패널.
// view 모드의 ViewDetailCard 를 재사용하여 동일한 수정 진입점을 제공한다.
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
  expanded: boolean;
  onToggleExpand: () => void;
  headerLabel: string;
  entityName: string;
  entitySub: string | null;
  count: number;
  fetching: boolean;
  emptyText: string;
  items: InlineAssignItem[];
  onEdit: (row: SkillAgentResponse) => void;
}

function InlineAssignPanel({ visible, expanded, onToggleExpand, headerLabel, entityName, entitySub, count, fetching, emptyText, items, onEdit }: InlineAssignPanelProps) {
  if (!visible) return null;

  return (
    <div className="bg-white bt-shadow flex flex-col overflow-hidden flex-shrink-0" style={{ maxHeight: expanded ? '40%' : 'auto' }}>
      <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-700">{headerLabel}</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[#eef1fb] text-[#405189] border border-[#c5cbe0]">
          {entityName}
          {entitySub != null && <span className="text-[#405189]/60">({entitySub})</span>}
        </span>
        {!fetching && <span className="text-[11px] text-gray-400">{count}건</span>}
        {fetching && <span className="text-[11px] text-gray-400">조회 중...</span>}
        <span className="ml-auto text-[11px] text-gray-400">카드의 ✎ 클릭하여 우선순위/스킬레벨 수정</span>
        <Button
          size="small"
          type="text"
          icon={expanded ? <ChevronsDown className="size-4" /> : <ChevronsUp className="size-4" />}
          title={expanded ? '접기' : '펼치기'}
          onClick={onToggleExpand}
          className="!text-gray-400 hover:!text-[#405189]"
        />
      </div>
      {expanded && (
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {fetching ? (
            <div className="flex items-center justify-center py-6">
              <Spin size="small" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-gray-400 text-sm">{emptyText}</div>
          ) : (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <ViewDetailCard
                  key={item.key}
                  title={item.title}
                  subtitle={item.subtitle}
                  priority={item.priority}
                  skillLevel={item.skillLevel}
                  onClick={() => onEdit(item.row)}
                  onEdit={() => onEdit(item.row)}
                />
              ))}
            </div>
          )}
        </div>
      )}
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
}

function BreakdownRow({ name, sub, holder, priority, skillLevel, onEdit }: BreakdownRowProps) {
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
      {/* 보유자: P/L + ✎ 수정 진입점 */}
      {holder ? (
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 tabular-nums" title="우선순위">
            <span className="text-gray-400">P</span>
            <span className="font-semibold text-[#405189]">{priority ?? '-'}</span>
          </span>
          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 tabular-nums" title="스킬레벨">
            <span className="text-gray-400">L</span>
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
}

function BreakdownPanel({ title, holding, total, fetching, entries, onEdit }: BreakdownPanelProps) {
  // 보유자 우선 → 미보유 (보유자 내 priority 오름차순)
  const sorted = [...entries].sort((a, b) => {
    if (a.holder !== b.holder) return a.holder ? -1 : 1;
    if (a.holder && b.holder) return (a.priority ?? 99) - (b.priority ?? 99);
    return 0;
  });
  return (
    <div className="w-[280px]">
      <div className="flex items-center gap-2 pb-2 mb-1 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-700 truncate flex-1">{title}</span>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: holding === total ? '#16a34a' : holding === 0 ? '#9ca3af' : '#f59e0b' }}>
          {holding}/{total} 보유
        </span>
      </div>
      {fetching ? (
        <div className="flex items-center justify-center py-4">
          <Spin size="small" />
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-0.5">
          {sorted.map((e) => (
            <BreakdownRow
              key={e.key}
              name={e.name}
              sub={e.sub}
              holder={e.holder}
              priority={e.priority}
              skillLevel={e.skillLevel}
              onEdit={e.holder && e.row ? () => onEdit(e.row as SkillAgentResponse) : undefined}
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
}

function SkillsetCoverageCell({ skillsetId, skillsetName, holding, total, selectedAgents, onEdit }: SkillsetCoverageCellProps) {
  const [open, setOpen] = useState(false);
  // 팝오버 열렸을 때만 해당 스킬셋의 보유 상담사 조회 (lazy)
  const { data: holders = [], isFetching } = useGetAgentsBySkillset(open ? skillsetId : null);

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

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="leftTop"
      destroyOnHidden
      content={<BreakdownPanel title={`⚒️ ${skillsetName}`} holding={holding} total={total} fetching={isFetching} entries={entries} onEdit={onEdit} />}
    >
      <button
        type="button"
        title="클릭하여 선택 상담사 보유/미보유 분해"
        className="flex items-center gap-2 h-full w-full text-left cursor-pointer hover:bg-[#f9fafc] rounded px-0.5"
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
}

function AgentCoverageCell({ agentId, agentName, holding, total, selectedSkillsets, onEdit }: AgentCoverageCellProps) {
  const [open, setOpen] = useState(false);
  // 팝오버 열렸을 때만 해당 상담사의 보유 스킬셋 조회 (lazy)
  const { data: holdings = [], isFetching } = useGetSkillsetsByAgent(open ? agentId : null);

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

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="leftTop"
      destroyOnHidden
      content={<BreakdownPanel title={`👤 ${agentName}`} holding={holding} total={total} fetching={isFetching} entries={entries} onEdit={onEdit} />}
    >
      <button
        type="button"
        title="클릭하여 선택 스킬셋 보유/미보유 분해"
        className="flex items-center gap-2 h-full w-full text-left cursor-pointer hover:bg-[#f9fafc] rounded px-0.5"
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
  );
}
