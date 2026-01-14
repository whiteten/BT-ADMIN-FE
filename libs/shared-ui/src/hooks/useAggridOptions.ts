import { useMemo } from 'react';
import { type GridOptions, type SideBarDef, type StatusPanelDef, themeQuartz } from 'ag-grid-community';
import { localeKr } from '../assets/json/aggrid_kr';
import AggridNoRowsOverlay from '../components/custom/AggridNoRowsOverlay';
import AggridPagination from '../components/custom/AggridPagination';
import AggridRowDataSidebar from '../components/custom/AggridRowDataSidebar';
import { FallbackSpinner } from '../components/custom/FallbackSpinner';

export default function useAggridOptions() {
  const theme = themeQuartz.withParams({
    browserColorScheme: 'light',
    cellHorizontalPaddingScale: 1,
    fontSize: 13,
    headerFontSize: 13,
    rowVerticalPaddingScale: 1,
    spacing: 6,
  });
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
  const gridOptions = useMemo<GridOptions>(
    () => ({
      defaultColDef,
      theme,
      sideBar,
      reactiveCustomComponents: true,
      columnHoverHighlight: true,
      animateRows: true,
      multiSortKey: 'ctrl',
      rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
      pagination: true,
      paginationPageSize: 20,
      suppressPaginationPanel: true,
      statusBar: {
        statusPanels: [
          {
            statusPanel: AggridPagination,
            align: 'left',
          } as StatusPanelDef,
        ],
      },
      rowNumbers: true,
      noRowsOverlayComponent: AggridNoRowsOverlay,
      noRowsOverlayComponentParams: {
        message: '검색된 데이터가 없습니다.',
      },
      loadingOverlayComponent: FallbackSpinner,
      localeText: localeKr,
    }),
    [defaultColDef, theme, sideBar],
  );
  return { gridOptions, defaultColDef, theme, sideBar };
}
