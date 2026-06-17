/**
 * ACD 그룹DN 우측 멤버 통합 그리드 (v2 — acd-v2.html 우 패널).
 *
 * 멤버 풀(기배정 + 미배정)을 단일 ag-Grid 로 노출. multiRow 체크박스 선택 → 부모에서 배정/해제 bulk-bar.
 * 컬럼: 상태(pinned:left) / DN번호 / DN타입(EDN·ADN) / ADN(로그인ID) / 노드 / DR노드 / 테넌트 / 블록.
 * 갭1: memberPriority 인라인 편집 — 기배정 행만 editable, cellValueChanged → onPriorityChanged(updates).
 *
 * AcdGdnTable.tsx 동일 패턴: suppressHeaderMenuButton:true, floatingFilter 없음.
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { ROW_COLOR_PALETTE } from '../../../components/GridRowColorLegend';
import { type GdnMemberItem, type GdnMemberResponse, getDnTypeName } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface AcdGdnMemberGridProps {
  rowData: GdnMemberResponse[];
  isLoading?: boolean;
  onSelectionChanged?: (selected: GdnMemberResponse[]) => void;
  /** 갭1: memberPriority 인라인 편집 완료 시 호출 */
  onPriorityChanged?: (updates: GdnMemberItem[]) => void;
}

export default function AcdGdnMemberGrid({ rowData, isLoading, onSelectionChanged, onPriorityChanged }: AcdGdnMemberGridProps) {
  const { gridOptions } = useAggridOptions();

  // ag-Grid 34: rowSelection 은 gridOptions 밖 직접 prop 으로 (초기 마운트 1회 제한 우회)
  const rowSelection = useMemo(
    () => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, selectAll: 'filtered' as const, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );

  const defaultColDef: ColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }),
    [],
  );

  const columnDefs: ColDef<GdnMemberResponse>[] = useMemo(
    () => [
      {
        headerName: '상태',
        field: 'assigned',
        width: 90,
        maxWidth: 90,
        pinned: 'left',
        sortable: false,
        filterValueGetter: (p) => (p.data?.assigned ? '배정' : '미배정'),
        valueGetter: (p) => (p.data?.assigned ? '배정' : '미배정'),
        cellStyle: { display: 'flex', alignItems: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<GdnMemberResponse>) =>
          p.data?.assigned ? (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-green-700 bg-green-100">배정</span>
          ) : (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-500 bg-gray-100">미배정</span>
          ),
      },
      {
        headerName: 'DN번호',
        field: 'dnNo',
        width: 110,
        cellRenderer: (p: ICellRendererParams<GdnMemberResponse>) => <span className="font-mono font-semibold text-gray-800">{p.data?.dnNo ?? '-'}</span>,
      },
      {
        // 갭1: 우선순위 인라인 편집 (기배정 행만 editable — SWAT IPR20S3030 정합)
        headerName: '우선순위',
        field: 'memberPriority',
        width: 96,
        type: 'numericColumn',
        filter: 'agNumberColumnFilter',
        editable: (p) => p.data?.assigned === true,
        cellStyle: (p) =>
          p.data?.assigned
            ? ({ background: ROW_COLOR_PALETTE.editableCell, cursor: 'text', textAlign: 'right' } as CellStyle)
            : ({ color: '#ccc', textAlign: 'right' } as CellStyle),
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)),
        headerTooltip: '기배정 행만 편집 가능 (더블클릭)',
      },
      {
        headerName: 'DN타입',
        field: 'dnType',
        width: 100,
        filterValueGetter: (p) => getDnTypeName(p.data?.dnType),
        valueGetter: (p) => getDnTypeName(p.data?.dnType),
      },
      {
        headerName: 'ADN (로그인ID)',
        field: 'loginAdn',
        flex: 1,
        minWidth: 130,
        cellRenderer: (p: ICellRendererParams<GdnMemberResponse>) =>
          p.data?.loginAdn ? <span className="text-blue-700 font-semibold">{p.data.loginAdn}</span> : <span className="text-gray-300">-</span>,
      },
      { headerName: '노드', field: 'nodeName', width: 100, valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: 'DR노드',
        field: 'backUpNodeName',
        minWidth: 90,
        flex: 1,
        tooltipField: 'backUpNodeName',
        valueFormatter: (p) => (p.value == null || p.value === '' ? '-' : String(p.value)),
      },
      { headerName: '테넌트', field: 'tenantName', width: 120, valueFormatter: (p) => p.value ?? '-', tooltipField: 'tenantName' },
      {
        headerName: '블록',
        field: 'extBlockYn',
        width: 75,
        suppressHeaderMenuButton: true,
        filterValueGetter: (p) => (p.data?.extBlockYn === 1 ? 'ON' : 'OFF'),
        cellStyle: { textAlign: 'center' } as CellStyle,
        cellRenderer: (p: ICellRendererParams<GdnMemberResponse>) =>
          p.data?.extBlockYn === 1 ? <span className="text-red-500 text-[11px] font-semibold">ON</span> : <span className="text-gray-400 text-[11px]">OFF</span>,
      },
    ],
    [],
  );

  return (
    <AgGridReact<GdnMemberResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      gridOptions={{
        ...gridOptions,
        statusBar: undefined,
        pagination: false,
        sideBar: false,
        rowNumbers: false,
      }}
      rowSelection={rowSelection}
      loading={isLoading}
      getRowId={(p) => String(p.data.dnId ?? `${p.data.gdnId}-${p.data.dnNo}`)}
      onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
      onCellValueChanged={(e) => {
        // 갭1: memberPriority 편집 완료 → updates 1건 즉시 전송
        if (e.column.getColId() === 'memberPriority' && e.data?.dnId != null && onPriorityChanged) {
          const val = e.newValue == null || e.newValue === '' ? null : Number(e.newValue);
          onPriorityChanged([{ dnId: e.data.dnId as number, memberPriority: isNaN(val as number) ? null : val }]);
        }
      }}
    />
  );
}
