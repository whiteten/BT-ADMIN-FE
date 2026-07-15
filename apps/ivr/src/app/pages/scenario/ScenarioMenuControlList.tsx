/**
 * 시나리오 메뉴 제어 페이지 (AS-IS IPR30S3035, 메뉴: 시나리오 관리 > 시나리오 메뉴 제어).
 *
 * 레이아웃(AS-IS "구조정보" 좌측 트리 + 우측 그리드 참고):
 *  - 좌측: 시나리오 트리(로그인 사용자의 현재 테넌트로 고정 — 테넌트 전환 UI 없음) — 공통 트리(useTreeView + TreeView 프리미티브, .claude/skills/add-tree 표준) 사용
 *  - 우측: 메뉴 제어 그리드(선택된 시나리오+버전) — AG-Grid Tree Data로 메뉴 depth(부모-자식) 표현.
 *    priorMenuId를 부모 포인터로 path를 구성한다(AS-IS treegrid parentField와 동일 개념).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, GetDataPath, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Empty, Select } from 'antd';
import dayjs from 'dayjs';
import { FileText, Folder, ListChecks, PhoneCall } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import ScenarioMenuControlDrawer, { type ScenarioMenuControlDrawerRef } from '../../features/scenario/components/ScenarioMenuControlDrawer';
import ScenarioMenuSuperAniDrawer, { type ScenarioMenuSuperAniDrawerRef } from '../../features/scenario/components/ScenarioMenuSuperAniDrawer';
import { scenarioMenuControlQueryKeys, useGetScenarioMenuControls, useGetScenarios, useGetVersions } from '../../features/scenario/hooks/useScenarioQueries';
import {
  SCENARIO_MENU_CONTROL_KIND,
  SCENARIO_MENU_CONTROL_KIND_LABELS,
  SCENARIO_MENU_DATE_TYPE_LABELS,
  SCENARIO_MENU_NEXT_TYPE_LABELS,
  type Scenario,
  type ScenarioMenuControlKind,
  type ScenarioMenuControlRow,
  getScenarioMenuControlKind,
} from '../../features/scenario/types';
import { TreeCaret, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '시나리오 관리' }, { title: '시나리오 메뉴 제어', path: '/ivr/scenario/menu-control' }];

/** 그리드 안 상태값 배지 표준(add-grid 스킬 참조) — Record 색상 맵 + shadcn Badge. */
const CONTROL_KIND_BADGE_CLASS: Record<ScenarioMenuControlKind, string> = {
  [SCENARIO_MENU_CONTROL_KIND.NONE]: 'text-gray-500 bg-gray-100',
  [SCENARIO_MENU_CONTROL_KIND.BLOCK]: 'text-red-600 bg-red-50',
  [SCENARIO_MENU_CONTROL_KIND.NOTICE]: 'text-blue-600 bg-blue-50',
};
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

/** 좌측 시나리오 트리 노드 — leaf만 존재(1-depth 고정), 도메인 아이콘은 렌더에서 FileText로 고정. */
interface ScenarioTreeNode {
  key: string;
  label: string;
  scenario: Scenario;
}

function buildScenarioTreeData(scenarios: Scenario[]): ScenarioTreeNode[] {
  return scenarios.map((s) => ({ key: String(s.serviceId), label: s.serviceName, scenario: s }));
}

/** AG-Grid Tree Data용 — priorMenuId(부모 포인터) 체인으로 구성한 depth path. */
interface MenuTreeRow extends ScenarioMenuControlRow {
  path: string[];
}

/**
 * 메뉴 목록(부모 포인터 priorMenuId만 보유)을 AG-Grid Tree Data가 요구하는
 * 루트→자신 순 path 배열로 변환한다. AS-IS json2tree(idField=menuId, parentField=priorMenuId)와 동일 개념.
 */
function buildMenuTreeRows(rows: ScenarioMenuControlRow[]): MenuTreeRow[] {
  const byId = new Map(rows.map((r) => [r.menuId, r]));
  const pathCache = new Map<string, string[]>();

  const resolvePath = (row: ScenarioMenuControlRow, visited: Set<string>): string[] => {
    const cached = pathCache.get(row.menuId);
    if (cached) return cached;
    if (visited.has(row.menuId)) return [row.menuId];
    visited.add(row.menuId);

    const parent = row.priorMenuId ? byId.get(row.priorMenuId) : undefined;
    const path = parent ? [...resolvePath(parent, visited), row.menuId] : [row.menuId];
    pathCache.set(row.menuId, path);
    return path;
  };

  return rows.map((row) => ({ ...row, path: resolvePath(row, new Set()) }));
}

export default function ScenarioMenuControlList() {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // ─── State ────────────────────────────────────────────────────────────
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const drawerRef = useRef<ScenarioMenuControlDrawerRef>(null);
  const superAniRef = useRef<ScenarioMenuSuperAniDrawerRef>(null);

  // 로그인 사용자의 현재 테넌트(JWT) — 테넌트 전환 UI 없이 항상 이 테넌트로 고정.
  const myTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── Queries ──────────────────────────────────────────────────────────
  const { data: scenarios = [] } = useGetScenarios();
  const { data: versions = [] } = useGetVersions({
    params: { serviceId: selectedScenarioId },
    queryOptions: { enabled: !!selectedScenarioId },
  });
  const { data: menuRows = [], isLoading: isMenusLoading } = useGetScenarioMenuControls({
    params: selectedScenarioId && selectedVersion ? { serviceId: selectedScenarioId, serviceVer: selectedVersion } : undefined,
    queryOptions: { enabled: !!selectedScenarioId && !!selectedVersion },
  });

  // ─── Derived ──────────────────────────────────────────────────────────
  const filteredScenarios = useMemo(() => (myTenantId === null ? [] : scenarios.filter((s) => s.tenantId === myTenantId)), [scenarios, myTenantId]);

  useEffect(() => {
    if (selectedScenarioId === null && filteredScenarios.length > 0) setSelectedScenarioId(filteredScenarios[0].serviceId);
  }, [filteredScenarios, selectedScenarioId]);

  useEffect(() => {
    if (selectedScenarioId && !filteredScenarios.some((s) => s.serviceId === selectedScenarioId)) setSelectedScenarioId(null);
  }, [filteredScenarios, selectedScenarioId]);

  const selectedScenario = useMemo(() => filteredScenarios.find((s) => s.serviceId === selectedScenarioId) ?? null, [filteredScenarios, selectedScenarioId]);

  const scenarioTreeData = useMemo(() => buildScenarioTreeData(filteredScenarios), [filteredScenarios]);
  const { items: scenarioTreeItems, rootProps: scenarioTreeRootProps } = useTreeView<ScenarioTreeNode>({
    data: scenarioTreeData,
    getId: (n) => n.key,
    getChildren: () => undefined,
    getName: (n) => n.label,
    defaultExpandAll: true,
    ariaLabel: '시나리오 트리',
  });

  // 시나리오가 바뀌면 첫 버전 자동 선택
  useEffect(() => {
    if (versions.length > 0) {
      if (!selectedVersion || !versions.some((v) => v.serviceVer === selectedVersion)) {
        setSelectedVersion(versions[0].serviceVer);
      }
    } else {
      setSelectedVersion(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions]);

  const treeRows = useMemo(() => buildMenuTreeRows(menuRows), [menuRows]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const renderScenarioRow = (item: TreeViewItem<ScenarioTreeNode>) => {
    const node = item.node;
    const isSelected = selectedScenarioId === node.scenario.serviceId;
    return (
      <TreeRow key={item.id} item={item} selected={isSelected} onClick={() => setSelectedScenarioId(node.scenario.serviceId)}>
        <TreeCaret item={item} />
        <FileText className={cn('size-4 flex-shrink-0', isSelected ? 'text-[var(--color-bt-primary)]' : 'text-gray-400')} />
        <TreeLabel selected={isSelected} title={node.scenario.serviceDesc || undefined}>
          {node.label}
        </TreeLabel>
      </TreeRow>
    );
  };

  const handleDrawerSuccess = () => {
    queryClient.invalidateQueries({ queryKey: scenarioMenuControlQueryKeys.getScenarioMenuControls._def });
  };

  // ─── ag-Grid columns (메뉴명은 Tree Data autoGroupColumnDef가 담당) ─────
  const columnDefs: ColDef<MenuTreeRow>[] = useMemo(
    () => [
      { headerName: '메뉴ID', field: 'menuId', flex: 1, minWidth: 100 },
      {
        headerName: '제어상태',
        colId: 'controlKind',
        width: 100,
        cellRenderer: (p: ICellRendererParams<MenuTreeRow>) => {
          if (!p.data) return null;
          const kind = getScenarioMenuControlKind(p.data);
          return <Badge className={cn(BADGE_CLASS, CONTROL_KIND_BADGE_CLASS[kind])}>{SCENARIO_MENU_CONTROL_KIND_LABELS[kind]}</Badge>;
        },
      },
      {
        headerName: '기간',
        colId: 'dateRange',
        flex: 1,
        minWidth: 150,
        cellRenderer: (p: ICellRendererParams<MenuTreeRow>) => {
          if (!p.data?.startDate || !p.data?.finshDate) return '-';
          const fmt = (d: string) => (dayjs(d).isValid() ? dayjs(d).format('YYYY-MM-DD') : d);
          return `${fmt(p.data.startDate)} ~ ${fmt(p.data.finshDate)}`;
        },
      },
      {
        headerName: '시간',
        colId: 'timeRange',
        flex: 1,
        minWidth: 130,
        cellRenderer: (p: ICellRendererParams<MenuTreeRow>) => {
          if (!p.data?.startTime || !p.data?.finshTime) return '-';
          const fmt = (t: string) => t.slice(0, 5); // HH:MI:SS → HH:MI
          return `${fmt(p.data.startTime)} ~ ${fmt(p.data.finshTime)}`;
        },
      },
      {
        headerName: '적용일자타입',
        field: 'dateType',
        width: 110,
        cellRenderer: (p: ICellRendererParams<MenuTreeRow>) => (p.data?.dateType != null ? (SCENARIO_MENU_DATE_TYPE_LABELS[p.data.dateType] ?? '-') : '-'),
      },
      {
        headerName: '안내멘트',
        colId: 'ment',
        flex: 1.3,
        minWidth: 130,
        tooltipValueGetter: (p) => p.data?.serviceMentDesc ?? '',
        cellRenderer: (p: ICellRendererParams<MenuTreeRow>) => p.data?.serviceMentDesc || p.data?.serviceMent || '-',
      },
      {
        headerName: '다음이동',
        field: 'nextType',
        width: 130,
        cellRenderer: (p: ICellRendererParams<MenuTreeRow>) => (p.data?.nextType != null ? (SCENARIO_MENU_NEXT_TYPE_LABELS[p.data.nextType] ?? '-') : '-'),
      },
    ],
    [],
  );

  const getDataPath: GetDataPath<MenuTreeRow> = (data) => data.path;

  const treeGridOptions: GridOptions<MenuTreeRow> = useMemo(
    () => ({
      ...gridOptions,
      statusBar: undefined,
      pagination: false,
      sideBar: false,
      treeData: true,
      getDataPath,
      groupDefaultExpanded: -1,
      autoGroupColumnDef: {
        headerName: '메뉴명',
        field: 'menuName',
        flex: 1.3,
        minWidth: 220,
        cellRendererParams: {
          suppressCount: true,
          innerRenderer: (p: ICellRendererParams<MenuTreeRow>) => {
            const Icon = p.node.group ? Folder : FileText;
            return (
              <span className="flex items-center gap-1.5 truncate" title={p.value}>
                <Icon className="size-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{p.value}</span>
              </span>
            );
          },
        },
      },
    }),
    [gridOptions],
  );

  // AS-IS 버전 콤보 "(+)" 표시 — DNIS 에서 실제 시나리오되고 있는 버전에만 붙는다.
  const versionOptions = versions.map((v) => {
    const base = `${v.serviceVer}${v.deployed ? '(+)' : ''}`;
    return { label: v.versionName ? `${base} (${v.versionName})` : base, value: v.serviceVer };
  });

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* Super ANI는 특정 시나리오에 종속되지 않는 전역 관리(ANI번호-시나리오 매핑)라 그리드 헤더가 아닌 최상단에 둔다. */}
        <div className="flex items-center justify-end bg-white bt-shadow px-5 h-[56px] flex-shrink-0">
          <Button icon={<PhoneCall className="size-3.5" />} onClick={() => superAniRef.current?.open()}>
            Super ANI
          </Button>
        </div>

        <div className="flex flex-1 min-h-0 gap-4">
          {/* ===== 좌측: 시나리오 목록 ===== */}
          <div className="w-[260px] flex-shrink-0 bg-white bt-shadow flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100 flex-shrink-0">
              <FileText className="size-4 text-[#405189]" />
              <h3 className="text-sm font-semibold text-gray-800">시나리오</h3>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{filteredScenarios.length}개</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto py-1">
              {filteredScenarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <Empty description={false} imageStyle={{ height: 40 }} />
                  <span className="text-sm">등록된 시나리오가 없습니다</span>
                </div>
              ) : (
                <div {...scenarioTreeRootProps}>{scenarioTreeItems.map(renderScenarioRow)}</div>
              )}
            </div>
          </div>

          {/* ===== 우측: 시나리오 메뉴 제어 그리드 ===== */}
          <div className="flex-1 min-w-0 bg-white bt-shadow flex flex-col overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <ListChecks className="size-4 text-[#405189]" />
                <h3 className="text-sm font-semibold text-gray-800">
                  시나리오 메뉴 제어{selectedScenario && <span className="text-[#405189]"> — {selectedScenario.serviceName}</span>}
                </h3>
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{menuRows.length}개</span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedVersion} onChange={setSelectedVersion} options={versionOptions} style={{ width: 160 }} placeholder="버전" disabled={!selectedScenarioId} />
                <span className="text-[11px] text-gray-400 whitespace-nowrap">(DNIS 에서 시나리오 되고 있는 버전은 (+) 표시됩니다.)</span>
              </div>
            </div>
            <div className="border-t border-gray-200" />
            <div className="flex-1 min-h-0 p-5">
              {!selectedScenarioId || !selectedVersion ? (
                <div className="flex items-center justify-center h-full">
                  <Empty description="시나리오와 버전을 선택하세요" />
                </div>
              ) : menuRows.length === 0 && !isMenusLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Empty description="등록된 메뉴가 없습니다" />
                </div>
              ) : (
                <AgGridReact<MenuTreeRow>
                  rowData={treeRows}
                  columnDefs={columnDefs}
                  gridOptions={treeGridOptions}
                  loading={isMenusLoading}
                  getRowId={(p) => p.data.menuId}
                  defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                  onRowDoubleClicked={(e) => e.data && drawerRef.current?.open(e.data)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <ScenarioMenuControlDrawer ref={drawerRef} serviceId={selectedScenarioId} serviceVer={selectedVersion} menuRows={menuRows} onSuccess={handleDrawerSuccess} />
      <ScenarioMenuSuperAniDrawer ref={superAniRef} />
    </div>
  );
}
