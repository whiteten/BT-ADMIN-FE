import { useMemo } from 'react';
import { type GridOptions, type SideBarDef, type StatusPanelDef, themeQuartz } from 'ag-grid-community';
import { localeKr } from '../assets/json/aggrid_kr';
import AggridAlarmLevelRenderer from '../components/custom/AggridAlarmLevelRenderer';
import AggridAlarmStatusRenderer from '../components/custom/AggridAlarmStatusRenderer';
import AggridAlarmSystemRenderer from '../components/custom/AggridAlarmSystemRenderer';
import AggridAlarmTimeRenderer from '../components/custom/AggridAlarmTimeRenderer';
import AggridNoRowsOverlay from '../components/custom/AggridNoRowsOverlay';
import AggridPagination from '../components/custom/AggridPagination';
import AggridPercentBarRenderer from '../components/custom/AggridPercentBarRenderer';
import AggridRowDataSidebar from '../components/custom/AggridRowDataSidebar';
import { FallbackSpinner } from '../components/custom/FallbackSpinner';

export default function useAggridOptions() {
  // theme도 useMemo로 메모이제이션 (무한 리렌더링 방지)
  const theme = useMemo(
    () =>
      themeQuartz.withParams({
        browserColorScheme: 'light',
        cellHorizontalPaddingScale: 1,
        fontSize: 13,
        headerFontSize: 13,
        rowVerticalPaddingScale: 1,
        spacing: 6,
      }),
    [],
  );
  // 2026-06-12 사용자 확정: 컬럼 필터 전면 활성
  const defaultColDef = useMemo(
    () => ({
      flex: 1,
      resizable: true,
      minWidth: 100,
      enableValue: true,
      enableRowGroup: false,
      enablePivot: false,
      sortable: true,
      filter: true,
      editable: false,
      suppressHeaderMenuButton: true,
    }),
    [],
  );
  const sideBar = useMemo<SideBarDef | string | string[] | boolean | null>(() => {
    return {
      toolPanels: [
        {
          id: 'rowData',
          labelDefault: '상세정보',
          labelKey: 'rowData',
          iconKey: 'columns',
          toolPanel: AggridRowDataSidebar,
        },
      ],
      defaultToolPanel: '',
    };
  }, []);
  const statusBar = useMemo(
    () => ({
      statusPanels: [
        {
          statusPanel: AggridPagination,
          align: 'left',
        } as StatusPanelDef,
      ],
    }),
    [],
  );
  const components = useMemo(
    () => ({
      // 공용 셀 렌더러는 여기서 문자열 키로 등록하고, 각 그리드에서 cellRenderer: '키' 로 참조.
      percentBarRenderer: AggridPercentBarRenderer,
      // 장애 이력(알람센터 등) 공용 셀 렌더러 — ERR_* 컬럼을 색상 배지·2줄 시각으로 표시.
      alarmTimeRenderer: AggridAlarmTimeRenderer,
      alarmSystemRenderer: AggridAlarmSystemRenderer,
      alarmLevelRenderer: AggridAlarmLevelRenderer,
      alarmStatusRenderer: AggridAlarmStatusRenderer,
    }),
    [],
  );
  // 체크박스 좌측고정 가드 (2026-06-15):
  // selection 활성(rowSelection.checkboxes=true) 시 selectionColumnDef 를 기본 주입해
  // ag-Grid selection 컬럼이 항상 pinned:'left' 로 맨 왼쪽에 위치하도록 강제한다.
  // 화면이 이미 selectionColumnDef 를 오버라이드 하면 spread 로 덮어쓰므로 자동 존중된다.
  const selectionColumnDef = useMemo<GridOptions['selectionColumnDef']>(() => ({ pinned: 'left', lockPinned: true, width: 44 }), []);

  const gridOptions = useMemo<GridOptions>(
    () => ({
      defaultColDef,
      theme,
      sideBar,
      statusBar,
      components,
      selectionColumnDef,
      reactiveCustomComponents: true,
      columnHoverHighlight: true,
      animateRows: true,
      multiSortKey: 'ctrl',
      rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
      pagination: true,
      paginationPageSize: 20,
      suppressPaginationPanel: true,
      rowNumbers: true,
      noRowsOverlayComponent: AggridNoRowsOverlay,
      noRowsOverlayComponentParams: {
        message: '검색된 데이터가 없습니다.',
      },
      loadingOverlayComponent: FallbackSpinner,
      localeText: localeKr,
      tooltipShowDelay: 0,
      tooltipHideDelay: 10000,
    }),
    [defaultColDef, theme, sideBar, statusBar, components, selectionColumnDef],
  );
  return { gridOptions, defaultColDef, theme, sideBar, statusBar, selectionColumnDef };
}
