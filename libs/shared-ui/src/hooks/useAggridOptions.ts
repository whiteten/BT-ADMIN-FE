import { createElement, useMemo } from 'react';
import { type GridOptions, type SideBarDef, type StatusPanelDef, themeQuartz } from 'ag-grid-community';
import { localeKr } from '../assets/json/aggrid_kr';
import AggridNoRowsOverlay from '../components/custom/AggridNoRowsOverlay';
import AggridPagination from '../components/custom/AggridPagination';
import AggridPercentBarRenderer from '../components/custom/AggridPercentBarRenderer';
import AggridRowDataSidebar from '../components/custom/AggridRowDataSidebar';
import { FallbackSpinner } from '../components/custom/FallbackSpinner';

/**
 * AG-Grid 로딩 오버레이 래퍼 — AG-Grid가 커스텀 오버레이에 주입하는 내부 prop(reactContainer 등)이
 * FallbackSpinner → Spinner → svg(DOM)로 새어나가 React 경고("does not recognize the `reactContainer` prop")가
 * 발생하는 것을 막는다. AG-Grid가 넘기는 props를 받지 않고 FallbackSpinner를 그대로 렌더.
 */
const GridLoadingOverlay = () => createElement(FallbackSpinner);

export default function useAggridOptions() {
  // theme도 useMemo로 메모이제이션 (무한 리렌더링 방지)
  // 2026-07-21: 국선관리(EndpointList) 리스트형 표기의 룩을 전역 그리드 테마로 이식.
  //   기준 마크업 — 헤더 `bg-gray-50 border-y border-gray-200 text-xs font-semibold text-gray-500`,
  //   행 `px-3 py-2.5 text-xs text-gray-600 divide-y divide-gray-100`,
  //   hover `bg-gray-50`, 선택행 `bg-[#405189]/5`.
  //   Tailwind 색상 토큰은 ag-Grid 파라미터가 클래스를 못 받으므로 hex 로 환산해 둔다.
  const theme = useMemo(
    () =>
      themeQuartz.withParams({
        browserColorScheme: 'light',
        // 셀 — text-xs(12px) / text-gray-600 / px-3(12px)
        fontSize: 12,
        cellTextColor: '#4b5563',
        cellHorizontalPadding: 12,
        cellHorizontalPaddingScale: 1,
        // 행 — py-2.5(10px) 상하 + 18px 라인 = 38px, 구분선은 divide-gray-100
        rowHeight: 38,
        rowVerticalPaddingScale: 1,
        rowBorder: { style: 'solid', width: 1, color: '#f3f4f6' },
        rowHoverColor: '#f9fafb',
        selectedRowBackgroundColor: 'rgba(64, 81, 137, 0.05)',
        oddRowBackgroundColor: 'transparent',
        // 헤더 — bg-gray-50 / text-xs semibold gray-500 / 하단 border-gray-200, 컬럼 구분선 없음
        headerHeight: 38,
        headerFontSize: 12,
        headerFontWeight: 600,
        headerTextColor: '#6b7280',
        headerBackgroundColor: '#f9fafb',
        headerRowBorder: { style: 'solid', width: 1, color: '#e5e7eb' },
        headerColumnBorder: false,
        // 리스트형에는 바깥 테두리·세로 구분선이 없다.
        // 행번호·체크박스 컬럼은 pinned:'left' 라 columnBorder 가 아니라 pinnedColumnBorder 가 그린다.
        columnBorder: false,
        pinnedColumnBorder: false,
        wrapperBorder: false,
        borderColor: '#e5e7eb',
        spacing: 6,
      }),
    [],
  );
  // 2026-06-12 사용자 확정: 컬럼 필터 전면 활성
  // 2026-06-16: 헤더 폭 잘림 차단 — wrapHeaderText+autoHeaderHeight 전역 적용.
  //   좁은 컬럼에서 헤더 텍스트가 '우선순...' 처럼 말줄임되던 문제를 줄바꿈+행높이 자동확장으로 해소.
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
      wrapHeaderText: true,
      autoHeaderHeight: true,
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
      // 단, 여러 앱이 실제로 공유하는 렌더러만 등록한다 — 특정 화면 전용 렌더러는 사용처에서 직접 참조.
      percentBarRenderer: AggridPercentBarRenderer,
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
      // 컬럼 헤더를 그리드 밖으로 드래그해도 컬럼이 숨겨지지 않게 (이동·재정렬은 그대로 허용)
      suppressDragLeaveHidesColumns: true,
      animateRows: true,
      multiSortKey: 'ctrl',
      rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
      pagination: true,
      paginationPageSize: 20,
      suppressPaginationPanel: true,
      rowNumbers: false,
      noRowsOverlayComponent: AggridNoRowsOverlay,
      noRowsOverlayComponentParams: {
        message: '검색된 데이터가 없습니다.',
      },
      loadingOverlayComponent: GridLoadingOverlay,
      localeText: localeKr,
      tooltipShowDelay: 0,
      tooltipHideDelay: 10000,
    }),
    [defaultColDef, theme, sideBar, statusBar, components, selectionColumnDef],
  );
  return { gridOptions, defaultColDef, theme, sideBar, statusBar, selectionColumnDef };
}
