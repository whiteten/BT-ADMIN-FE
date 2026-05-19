import { useMemo } from 'react';
import { type GridOptions, type SideBarDef, type StatusPanelDef, themeQuartz } from 'ag-grid-community';
import { localeKr } from '../assets/json/aggrid_kr';
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
  const defaultColDef = useMemo(
    () => ({
      flex: 1,
      resizable: true,
      minWidth: 100,
      enableValue: true,
      enableRowGroup: false,
      enablePivot: false,
      sortable: true,
      filter: false,
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
    }),
    [],
  );
  const gridOptions = useMemo<GridOptions>(
    () => ({
      defaultColDef,
      theme,
      sideBar,
      statusBar,
      components,
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
    [defaultColDef, theme, sideBar, statusBar, components],
  );
  return { gridOptions, defaultColDef, theme, sideBar, statusBar };
}
