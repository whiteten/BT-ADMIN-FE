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
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { ColDef, GridOptions, IRowNode } from 'ag-grid-community';
import { AgGridReact, type AgGridReact as AgGridReactType } from 'ag-grid-react';
import { Button, Card, Empty, Input, Modal, Space, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, ClipboardList, FilterX, Package, Plus, Search, Trash2, Users } from 'lucide-react';
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
      { headerCheckboxSelection: true, checkboxSelection: true, width: 40, pinned: 'left', resizable: false, suppressHeaderMenuButton: true, filter: false, floatingFilter: false },
      { field: 'agentLoginId', headerName: '로그인ID', width: 110, filter: 'agTextColumnFilter' },
      { field: 'agentName', headerName: '이름', width: 90, filter: 'agTextColumnFilter' },
      { field: 'groupName', headerName: '상담그룹', flex: 1, minWidth: 110, filter: 'agTextColumnFilter', valueGetter: (p) => p.data?.groupName ?? '미배정' },
      {
        field: 'activateYn',
        headerName: '활성',
        width: 70,
        filter: 'agNumberColumnFilter',
        cellRenderer: ({ value }: { value: number | null }) => (value === 1 ? <Tag color="green">활성</Tag> : <Tag color="red">비활성</Tag>),
      },
      {
        headerName: '보유 (M건 기준)',
        width: 150,
        filter: false,
        floatingFilter: false,
        cellRenderer: (params: { data?: AgentResponse }) => {
          const total = selectedSkillsetIds.length;
          if (!total) return <span className="text-gray-400 text-xs">스킬셋 선택 시 표시</span>;
          const holding = agentCoverageMap.get(params.data?.agentId ?? -1) ?? 0;
          const pct = total > 0 ? (holding / total) * 100 : 0;
          const color = holding === total ? '#16a34a' : holding === 0 ? '#9ca3af' : '#f59e0b';
          return (
            <div className="flex items-center gap-2 h-full">
              <div className="w-12 h-1.5 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
              <span style={{ color, fontWeight: 600 }} className="text-xs tabular-nums">
                {holding}/{total}
              </span>
            </div>
          );
        },
      },
    ],
    [selectedSkillsetIds.length, agentCoverageMap],
  );

  const agentGridOptionsAg = useMemo<GridOptions<AgentResponse>>(
    () => ({
      rowSelection: { mode: 'multiRow', checkboxes: true, enableClickSelection: true },
      defaultColDef: { resizable: true, sortable: true, floatingFilter: true, filter: 'agTextColumnFilter' },
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
      { headerCheckboxSelection: true, checkboxSelection: true, width: 40, pinned: 'left', resizable: false, suppressHeaderMenuButton: true, filter: false, floatingFilter: false },
      { field: 'skillsetName', headerName: '스킬셋명', flex: 1, minWidth: 140, filter: 'agTextColumnFilter' },
      {
        headerName: '보유 (N명 기준)',
        width: 150,
        filter: false,
        floatingFilter: false,
        cellRenderer: (params: { data?: SkillsetResponse }) => {
          const total = selectedAgentIds.length;
          if (!total) return <span className="text-gray-400 text-xs">상담사 선택 시 표시</span>;
          const holding = coverageMap.get(params.data?.skillsetId ?? -1) ?? 0;
          const pct = total > 0 ? (holding / total) * 100 : 0;
          const color = holding === total ? '#16a34a' : holding === 0 ? '#9ca3af' : '#f59e0b';
          return (
            <div className="flex items-center gap-2 h-full">
              <div className="w-12 h-1.5 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
              <span style={{ color, fontWeight: 600 }} className="text-xs tabular-nums">
                {holding}/{total}
              </span>
            </div>
          );
        },
      },
    ],
    [selectedAgentIds.length, coverageMap],
  );

  const skillsetGridOptionsAg = useMemo<GridOptions<SkillsetResponse>>(
    () => ({
      rowSelection: { mode: 'multiRow', checkboxes: true, enableClickSelection: true },
      defaultColDef: { resizable: true, sortable: true, floatingFilter: true, filter: 'agTextColumnFilter' },
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
      { field: 'agentLoginId', headerName: '로그인ID', width: 110, filter: 'agTextColumnFilter' },
      { field: 'agentName', headerName: '이름', width: 90, filter: 'agTextColumnFilter' },
      { field: 'groupName', headerName: '상담그룹', flex: 1, minWidth: 110, filter: 'agTextColumnFilter', valueGetter: (p) => p.data?.groupName ?? '미배정' },
    ],
    [],
  );

  const viewAgentGridOptions = useMemo<GridOptions<AgentResponse>>(
    () => ({
      rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
      defaultColDef: { resizable: true, sortable: true, floatingFilter: true, filter: 'agTextColumnFilter' },
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
      { field: 'skillsetName', headerName: '스킬셋명', flex: 1, minWidth: 140, filter: 'agTextColumnFilter' },
      {
        field: 'activateYn',
        headerName: '활성',
        width: 70,
        filter: false,
        floatingFilter: false,
        cellRenderer: ({ value }: { value: number | null }) => (value === 1 ? <Tag color="green">활성</Tag> : <Tag color="default">비활성</Tag>),
      },
    ],
    [],
  );

  const viewSkillsetGridOptions = useMemo<GridOptions<SkillsetResponse>>(
    () => ({
      rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
      defaultColDef: { resizable: true, sortable: true, floatingFilter: true, filter: 'agTextColumnFilter' },
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
        <PanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* 좌: 상담사 sub-panel [트리 220 | grid flex] */}
          <Panel defaultSize={50} minSize={20}>
            <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
              <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
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
              <div className="flex flex-1 min-h-0">
                <div className="w-[220px] flex-shrink-0 border-r border-gray-100 flex flex-col min-h-0 overflow-hidden">
                  <div className="px-3 h-9 flex items-center bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 flex-shrink-0">
                    📁 상담그룹
                    <span className="ml-auto text-[11px] text-gray-500 font-normal">{selectedAgentGroupId == null ? '전체' : '필터'}</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <AgentGroupTree tree={agentGroupTree} selectedGroupId={selectedAgentGroupId} onSelectGroup={setSelectedAgentGroupId} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 min-h-0 ag-theme-quartz">
                  <AgGridReact<AgentResponse>
                    ref={agentGridRef1}
                    rowData={filteredAgentsByGroup}
                    columnDefs={agentColumnsAg}
                    gridOptions={agentGridOptionsAg}
                    quickFilterText={agentQuickFilter}
                    loading={agentsLoading}
                  />
                </div>
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />

          {/* 우: 스킬셋 sub-panel [업무그룹 트리 220 | 스킬셋 grid + 보유율] */}
          <Panel defaultSize={50} minSize={20}>
            <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
              <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
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
              <div className="flex flex-1 min-h-0">
                <div className="w-[220px] flex-shrink-0 border-r border-gray-100 flex flex-col min-h-0 overflow-hidden">
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
                </div>
                <div className="flex-1 min-w-0 min-h-0 ag-theme-quartz">
                  <AgGridReact<SkillsetResponse>
                    ref={skillsetGridRef1}
                    rowData={filteredSkillsetsByGroup}
                    columnDefs={skillsetColumnsAg}
                    gridOptions={skillsetGridOptionsAg}
                    quickFilterText={skillsetQuickFilter}
                    loading={skillsetMastersLoading}
                  />
                </div>
              </div>
            </div>
          </Panel>
        </PanelGroup>
      )}

      {/* ===== 모드 ② 스킬별 상담사할당 (S→A) — 좌(스킬셋 multi) + 우(상담사 multi, 보유율) ===== */}
      {mode === 'skillset' && (
        <PanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* 좌: 스킬셋 sub-panel [업무그룹 트리 220 | 스킬셋 grid] */}
          <Panel defaultSize={50} minSize={20}>
            <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
              <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
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
              <div className="flex flex-1 min-h-0">
                <div className="w-[220px] flex-shrink-0 border-r border-gray-100 flex flex-col min-h-0 overflow-hidden">
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
                </div>
                <div className="flex-1 min-w-0 min-h-0 ag-theme-quartz">
                  <AgGridReact<SkillsetResponse>
                    ref={skillsetGridRef2}
                    rowData={filteredSkillsetsByGroup}
                    columnDefs={skillsetColumnsAg}
                    gridOptions={skillsetGridOptionsAg}
                    quickFilterText={skillsetQuickFilter}
                    loading={skillsetMastersLoading}
                  />
                </div>
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-[#c5cbe0] active:bg-[#405189] transition-colors cursor-col-resize flex-shrink-0" />

          {/* 우: 상담사 sub-panel [상담그룹 트리 220 | 상담사 grid + 보유율(스킬셋 기준)] */}
          <Panel defaultSize={50} minSize={20}>
            <div className="bg-white bt-shadow flex flex-col overflow-hidden h-full">
              <div className="flex items-center px-4 h-[44px] border-b border-gray-100 gap-2 flex-shrink-0">
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
              <div className="flex flex-1 min-h-0">
                <div className="w-[220px] flex-shrink-0 border-r border-gray-100 flex flex-col min-h-0 overflow-hidden">
                  <div className="px-3 h-9 flex items-center bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 flex-shrink-0">
                    📁 상담그룹
                    <span className="ml-auto text-[11px] text-gray-500 font-normal">{selectedAgentGroupId == null ? '전체' : '필터'}</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <AgentGroupTree tree={agentGroupTree} selectedGroupId={selectedAgentGroupId} onSelectGroup={setSelectedAgentGroupId} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 min-h-0 ag-theme-quartz">
                  <AgGridReact<AgentResponse>
                    ref={agentGridRef2}
                    rowData={filteredAgentsByGroup}
                    columnDefs={agentColumnsAg}
                    gridOptions={agentGridOptionsAg}
                    quickFilterText={agentQuickFilter}
                    loading={agentsLoading}
                  />
                </div>
              </div>
            </div>
          </Panel>
        </PanelGroup>
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
                    ref={viewAgentGridRef}
                    rowData={filteredAgentsByGroup}
                    columnDefs={viewAgentColumnsAg}
                    gridOptions={viewAgentGridOptions}
                    loading={agentsLoading}
                  />
                ) : (
                  <AgGridReact<SkillsetResponse>
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
}

function ViewDetailCard({ title, subtitle, priority, skillLevel, onClick }: ViewDetailCardProps) {
  const level = skillLevel ?? 0;
  const dotColor = level >= 71 ? '#3b82f6' : level >= 41 ? '#f59e0b' : '#9ca3af';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2.5 text-xs hover:border-[#c5cbe0] hover:bg-[#f9fafc] transition"
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
    </button>
  );
}
