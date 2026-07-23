/**
 * 시나리오별 메뉴관리 (AS-IS IPR20S6050) — TB_IR_SERVICEMENU 메뉴 트리.
 * 그리드는 읽기 전용 표시만 하고, 행을 더블클릭하면 Drawer가 열려 메뉴명/표시여부/주요서비스를
 * 수정할 수 있다(AS-IS 더블클릭 수정 팝업, IPR20S6050U.do와 동일한 UX).
 * 버전 선택은 이 탭 안에서 독립적으로 구성한다(다른 탭과 공유하지 않음).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, GetDataPath, GridOptions, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Empty, Select } from 'antd';
import { FileText, Folder } from 'lucide-react';
import { useGetVersions } from '../../scenario/hooks/useScenarioQueries';
import ScenarioAnalysisMenuDrawer, { type ScenarioAnalysisMenuDrawerRef } from '../components/ScenarioAnalysisMenuDrawer';
import { useGetScenarioAnalysisMenus } from '../hooks/useScenarioAnalysisQueries';
import type { ScenarioAnalysisMenuRow } from '../types';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  serviceId: number | null;
  scenarioName: string | null;
}

/** AG-Grid Tree Data용 — priorMenuId(부모 포인터) 체인으로 구성한 depth path. */
interface MenuTreeRow extends ScenarioAnalysisMenuRow {
  path: string[];
}

function buildMenuTreeRows(rows: ScenarioAnalysisMenuRow[]): MenuTreeRow[] {
  const byId = new Map(rows.map((r) => [r.menuId, r]));
  const pathCache = new Map<string, string[]>();

  const resolvePath = (row: ScenarioAnalysisMenuRow, visited: Set<string>): string[] => {
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

export default function ScenarioAnalysisMenuTab({ serviceId, scenarioName }: Props) {
  const { gridOptions } = useAggridOptions();
  const drawerRef = useRef<ScenarioAnalysisMenuDrawerRef>(null);

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const { data: versions = [] } = useGetVersions({
    params: { serviceId },
    queryOptions: { enabled: !!serviceId },
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

  const versionOptions = versions.map((v) => {
    const base = `${v.serviceVer}${v.deployed ? '(+)' : ''}`;
    return { label: v.versionName ? `${base} (${v.versionName})` : base, value: v.serviceVer };
  });

  const { data: rows = [], isLoading } = useGetScenarioAnalysisMenus({
    params: serviceId && selectedVersion ? { serviceId, serviceVer: selectedVersion } : undefined,
    queryOptions: { enabled: !!serviceId && !!selectedVersion },
  });

  const treeRows = useMemo(() => buildMenuTreeRows(rows), [rows]);

  const columnDefs: ColDef<MenuTreeRow>[] = useMemo(
    () => [
      { headerName: '메뉴ID', field: 'menuId', flex: 1, minWidth: 100 },
      { headerName: '버전', field: 'serviceVer', width: 90 },
      { headerName: '정렬순서', field: 'sortSeq', width: 100 },
      {
        headerName: '표시여부',
        colId: 'visibleYn',
        width: 100,
        // ON_OFF_STATUS 공통코드 기준 1=ON(표시), 0=OFF(미표시). 분석 시점엔 항상 0(OFF)으로만 저장된다(AS-IS 동일).
        cellRenderer: (p: ICellRendererParams<MenuTreeRow>) =>
          p.data?.visibleYn === 1 ? (
            <Badge variant="secondary" className="text-[13px] leading-[13px] font-medium !h-6 text-emerald-600 bg-emerald-50">
              ON
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[13px] leading-[13px] font-medium !h-6 text-gray-500 bg-gray-100">
              OFF
            </Badge>
          ),
        filterValueGetter: ({ data }) => (data?.visibleYn === 1 ? 'ON' : 'OFF'),
      },
      {
        headerName: '주요서비스',
        colId: 'majorYn',
        width: 100,
        cellRenderer: (p: ICellRendererParams<MenuTreeRow>) =>
          p.data?.majorYn === 1 ? (
            <Badge variant="secondary" className="text-[13px] leading-[13px] font-medium !h-6 text-emerald-600 bg-emerald-50">
              예
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[13px] leading-[13px] font-medium !h-6 text-gray-500 bg-gray-100">
              아니오
            </Badge>
          ),
        filterValueGetter: ({ data }) => (data?.majorYn === 1 ? '예' : '아니오'),
      },
      {
        headerName: '버전상태',
        colId: 'lastFlag',
        width: 100,
        cellRenderer: (p: ICellRendererParams<MenuTreeRow>) =>
          p.data?.lastFlag === 1 ? (
            <Badge variant="secondary" className="text-[13px] leading-[13px] font-medium !h-6 text-emerald-600 bg-emerald-50">
              활성
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[13px] leading-[13px] font-medium !h-6 text-gray-500 bg-gray-100">
              이전
            </Badge>
          ),
        filterValueGetter: ({ data }) => (data?.lastFlag === 1 ? '활성' : '이전'),
      },
    ],
    [],
  );

  const getDataPath: GetDataPath<MenuTreeRow> = (data) => data.path;

  // AG-Grid React는 gridOptions 객체 안의 콜백(onRowDoubleClicked 등)은 그리드 최초 생성 시점에만 읽고
  // 이후 gridOptions 참조가 바뀌어도 다시 바인딩하지 않는다 — 최신 rows/scenarioName을 보려면
  // <AgGridReact> 최상위 prop으로 직접 전달해야 한다(아래 handleRowDoubleClicked).
  const handleRowDoubleClicked = (event: RowDoubleClickedEvent<MenuTreeRow>) => {
    if (!event.data) return;
    const { path, ...menuRow } = event.data;
    const priorMenuName = menuRow.priorMenuId ? (rows.find((r) => r.menuId === menuRow.priorMenuId)?.menuName ?? null) : null;
    drawerRef.current?.open({ ...menuRow, scenarioName, priorMenuName });
  };

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
                <span className="truncate">{p.value ?? p.data?.menuId}</span>
              </span>
            );
          },
        },
      },
    }),
    [gridOptions],
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">시나리오별 메뉴관리{scenarioName && <span className="text-[#405189]"> — {scenarioName}</span>}</h3>
        <div className="flex items-center gap-2">
          <Select value={selectedVersion} onChange={setSelectedVersion} options={versionOptions} style={{ width: 160 }} placeholder="버전" disabled={!serviceId} />
          <span className="text-[11px] text-gray-400 whitespace-nowrap">(DNIS 에서 시나리오 되고 있는 버전은 (+) 표시됩니다.)</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {!serviceId || !selectedVersion ? (
          <div className="flex items-center justify-center h-full">
            <Empty description="시나리오와 버전을 선택하세요" />
          </div>
        ) : rows.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Empty description="분석된 메뉴가 없습니다" />
          </div>
        ) : (
          <AgGridReact<MenuTreeRow>
            rowData={treeRows}
            columnDefs={columnDefs}
            gridOptions={treeGridOptions}
            loading={isLoading}
            getRowId={(p) => p.data.menuId}
            onRowDoubleClicked={handleRowDoubleClicked}
            defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
          />
        )}
      </div>
      <ScenarioAnalysisMenuDrawer ref={drawerRef} />
    </div>
  );
}
