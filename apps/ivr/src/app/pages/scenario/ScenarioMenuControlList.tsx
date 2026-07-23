/**
 * 시나리오 메뉴 제어 페이지 (AS-IS IPR30S3035, 메뉴: 시나리오 관리 > 시나리오 메뉴 제어).
 *
 * 레이아웃:
 *  - 좌측: 시나리오 검색+종류 필터+flat list. 테넌트 스코프는 화면이 client-side로 거르지 않고
 *    API(TenantContext)에 위임 — 운영자 모드면 ScopeSelect로 전체/대행 테넌트 전환(SearchList.tsx 패턴),
 *    일반 모드는 로그인 테넌트로 서버가 자동 고정.
 *    /insight/statistics/datasets 좌측 패널 패턴 참고 — 계층이 없는 목록이라 트리 대신 일반 리스트로 표현.
 *  - 우측: 메뉴 제어 그리드(선택된 시나리오+버전) — AG-Grid Tree Data로 메뉴 depth(부모-자식) 표현.
 *    priorMenuId를 부모 포인터로 path를 구성한다(AS-IS treegrid parentField와 동일 개념).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, GetDataPath, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Empty, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { ChevronDown, FileText, Folder, ListChecks, PhoneCall, Search, Tags } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { fuzzyFilter } from '@/shared-util';
import { scenarioQueryKeys, useGetScenarios, useGetVersions } from '../../features/scenario/hooks/useScenarioQueries';
import { SCENARIO_TYPE_COLORS, SCENARIO_TYPE_LABELS, type ScenarioType } from '../../features/scenario/types';
import ScenarioMenuControlDrawer, { type ScenarioMenuControlDrawerRef } from '../../features/scenario-menu/components/ScenarioMenuControlDrawer';
import ScenarioMenuSuperAniDrawer, { type ScenarioMenuSuperAniDrawerRef } from '../../features/scenario-menu/components/ScenarioMenuSuperAniDrawer';
import { scenarioMenuControlQueryKeys, useGetScenarioMenuControls } from '../../features/scenario-menu/hooks/useScenarioMenuControlQueries';
import {
  SCENARIO_MENU_CONTROL_KIND,
  SCENARIO_MENU_CONTROL_KIND_LABELS,
  SCENARIO_MENU_DATE_TYPE_LABELS,
  SCENARIO_MENU_NEXT_TYPE_LABELS,
  type ScenarioMenuControlKind,
  type ScenarioMenuControlRow,
  getScenarioMenuControlKind,
} from '../../features/scenario-menu/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '시나리오 관리' }, { title: '시나리오 메뉴 제어', path: '/ivr/scenario/menu-control' }];

/** 그리드 안 상태값 배지 표준(add-grid 스킬 참조) — Record 색상 맵 + shadcn Badge. */
const CONTROL_KIND_BADGE_CLASS: Record<ScenarioMenuControlKind, string> = {
  [SCENARIO_MENU_CONTROL_KIND.NONE]: 'text-gray-500 bg-gray-100',
  [SCENARIO_MENU_CONTROL_KIND.BLOCK]: 'text-red-600 bg-red-50',
  [SCENARIO_MENU_CONTROL_KIND.NOTICE]: 'text-blue-600 bg-blue-50',
};
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

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
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<ScenarioType>>(new Set());
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);

  const drawerRef = useRef<ScenarioMenuControlDrawerRef>(null);
  const superAniRef = useRef<ScenarioMenuSuperAniDrawerRef>(null);
  const autoOpenedTypeFilterRef = useRef(false);

  // 운영자 모드(통합운영) — 전체(actAsTenantId=null)면 API가 X-View-All-Tenants로 전체 테넌트 조회,
  // 대행 중이면 X-Act-As-Tenant로 그 테넌트만 조회. 일반 모드는 로그인 테넌트로 서버가 자동 스코프.
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants ?? []);
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  // "전체" 스코프에서만 시나리오마다 소속 테넌트를 노출(대행/일반 모드는 전부 같은 테넌트라 무의미).
  const showTenantLabel = operatorMode && actAsTenantId === null;

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
  // 테넌트 스코프는 서버(TenantContext)가 이미 적용해서 내려주므로 여기서 다시 거르지 않는다.
  useEffect(() => {
    if (selectedScenarioId === null && scenarios.length > 0) setSelectedScenarioId(scenarios[0].serviceId);
  }, [scenarios, selectedScenarioId]);

  useEffect(() => {
    if (selectedScenarioId && !scenarios.some((s) => s.serviceId === selectedScenarioId)) setSelectedScenarioId(null);
  }, [scenarios, selectedScenarioId]);

  const selectedScenario = useMemo(() => scenarios.find((s) => s.serviceId === selectedScenarioId) ?? null, [scenarios, selectedScenarioId]);

  // 좌측 목록에 실제로 등장하는 종류만 필터 칩으로 노출(빈 칩 방지) — /insight/statistics/datasets 태그필터 패턴.
  const availableTypes = useMemo(() => Array.from(new Set(scenarios.map((s) => s.serviceType))), [scenarios]);

  // 등록된 종류가 있으면 필터를 최초 1회 자동 펼침(이후 수동 토글 존중) — StatDatasetList.tsx 태그필터와 동일.
  useEffect(() => {
    if (!autoOpenedTypeFilterRef.current && availableTypes.length > 0) {
      autoOpenedTypeFilterRef.current = true;
      setTypeFilterOpen(true);
    }
  }, [availableTypes]);

  const searchedScenarios = useMemo(() => (scenarioSearch.trim() ? fuzzyFilter(scenarioSearch, scenarios, (s) => s.serviceName) : scenarios), [scenarios, scenarioSearch]);
  const visibleScenarios = useMemo(
    () => (selectedTypes.size === 0 ? searchedScenarios : searchedScenarios.filter((s) => selectedTypes.has(s.serviceType))),
    [searchedScenarios, selectedTypes],
  );

  const toggleType = (type: ScenarioType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

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
        {/* Super ANI는 특정 시나리오에 종속되지 않는 전역 관리(ANI번호-시나리오 매핑)라 그리드 헤더가 아닌 최상단에 둔다.
            테넌트 스코프도 좌측 리스트뿐 아니라 우측 그리드까지 화면 전체에 영향을 주는 컨텍스트라 같은 최상단 바에 둔다. */}
        <div className="flex items-center justify-between bg-white bt-shadow px-5 h-[56px] flex-shrink-0">
          {operatorMode ? (
            <ScopeSelect
              kind="tenant"
              options={availableTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
              value={actAsTenantId}
              onChange={(id) => {
                setActAsTenant(id);
                void queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
              }}
            />
          ) : (
            <div />
          )}
          <Button icon={<PhoneCall className="size-3.5" />} onClick={() => superAniRef.current?.open()}>
            Super ANI
          </Button>
        </div>

        <div className="flex flex-1 min-h-0 gap-4">
          {/* ===== 좌측: 시나리오 목록 (검색 + 종류 필터 + flat list — /insight/statistics/datasets 패턴) ===== */}
          <div className="w-[340px] flex-shrink-0 bg-white bt-shadow p-4 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-[#405189]" />
              <h3 className="text-sm font-semibold text-gray-800">시나리오</h3>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{visibleScenarios.length}개</span>
            </div>

            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="시나리오명 검색"
              value={scenarioSearch}
              onChange={(e) => setScenarioSearch(e.target.value)}
            />

            {/* 종류 필터 (접이식) — StatDatasetList.tsx 태그 필터와 동일 패턴 */}
            {availableTypes.length > 0 && (
              <div className="rounded-md bg-gray-50">
                <button type="button" className="flex w-full items-center justify-between px-2.5 py-2 select-none" onClick={() => setTypeFilterOpen((v) => !v)}>
                  <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    <Tags className="size-3.5" />
                    종류 필터
                    {selectedTypes.size > 0 && <span className="ml-1 rounded-full bg-[var(--color-bt-primary)] px-1.5 text-[10px] font-bold text-white">{selectedTypes.size}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    {selectedTypes.size > 0 && (
                      <span
                        className="text-xs text-[var(--color-bt-primary)] hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTypes(new Set());
                        }}
                      >
                        초기화
                      </span>
                    )}
                    <ChevronDown className={cn('size-4 text-gray-400 transition-transform', typeFilterOpen ? '' : '-rotate-90')} />
                  </span>
                </button>
                {typeFilterOpen && (
                  <div className="px-2.5 pb-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {availableTypes.map((type) => {
                        const active = selectedTypes.has(type);
                        const color = SCENARIO_TYPE_COLORS[type];
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleType(type)}
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs transition-colors',
                              active ? cn(color.bg, color.text, 'border-transparent') : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                            )}
                          >
                            {SCENARIO_TYPE_LABELS[type]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto -mx-1">
              {visibleScenarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <Empty description={false} styles={{ image: { height: 40 } }} />
                  <span className="text-sm">{scenarioSearch || selectedTypes.size > 0 ? '검색 결과가 없습니다' : '등록된 시나리오가 없습니다'}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {visibleScenarios.map((s) => {
                    const isSelected = selectedScenarioId === s.serviceId;
                    return (
                      <div
                        key={s.serviceId}
                        onClick={() => setSelectedScenarioId(s.serviceId)}
                        title={s.serviceDesc || undefined}
                        className={cn(
                          'flex items-center gap-2 cursor-pointer rounded-md border-l-[3px] px-3 py-2 transition-colors',
                          isSelected ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]' : 'border-transparent hover:bg-gray-50',
                        )}
                      >
                        <FileText className={cn('size-4 flex-shrink-0', isSelected ? 'text-[var(--color-bt-primary)]' : 'text-gray-400')} />
                        <span className={cn('flex-1 min-w-0 truncate text-sm', isSelected ? 'text-[var(--color-bt-primary)] font-medium' : 'text-gray-700')}>{s.serviceName}</span>
                        {showTenantLabel && s.tenantName && (
                          <Badge variant="secondary" className="text-[10px] leading-4 !h-5 shrink-0 ml-auto text-amber-700 bg-amber-50 border border-amber-200">
                            {s.tenantName}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
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
