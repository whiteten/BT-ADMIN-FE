/**
 * WorktimeTable — ag-Grid 기반 IVR 업무시간 목록 테이블 (마스터+단일슬롯 flatten, 균일 행).
 *
 * getRowId + focusId: 저장 후 refetch 로 rowData 가 교체돼도 저장된 행 선택/스크롤 유지.
 */
import { useCallback, useMemo } from 'react';
import type { ColDef, GetRowIdParams, RowDataUpdatedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { IrWorktime } from '../types';
import { byteToLabels, displayHHMM } from '../utils/weekday';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  rowData: IrWorktime[];
  isLoading: boolean;
  focusId?: number | null; // rowData 갱신 시 선택/노출할 행
  onRowDoubleClicked: (row: IrWorktime) => void;
  onSelectionChanged: (rows: IrWorktime[]) => void;
}

export default function WorktimeTable({ rowData, isLoading, focusId, onRowDoubleClicked, onSelectionChanged }: Props) {
  const { gridOptions } = useAggridOptions();

  const getRowId = useCallback((p: GetRowIdParams<IrWorktime>) => String(p.data.worktimeId), []);

  const handleRowDataUpdated = useCallback(
    (e: RowDataUpdatedEvent<IrWorktime>) => {
      if (focusId == null) return;
      const node = e.api.getRowNode(String(focusId));
      if (node && !node.isSelected()) {
        node.setSelected(true, true);
      }
      if (node) {
        e.api.ensureNodeVisible(node, 'middle');
      }
    },
    [focusId],
  );

  const defaultColDef: ColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }),
    [],
  );

  const colDefs: ColDef<IrWorktime>[] = useMemo(
    () => [
      { field: 'tenantName', headerName: '테넌트명', flex: 1, minWidth: 120, valueGetter: (p) => p.data?.tenantName ?? '-', tooltipField: 'tenantName' },
      { field: 'worktimeName', headerName: '업무시간명', flex: 2, minWidth: 160, tooltipField: 'worktimeName' },
      { field: 'groupKey', headerName: '업무시간KEY', flex: 1, minWidth: 130, tooltipField: 'groupKey' },
      {
        headerName: '적용요일',
        minWidth: 150,
        flex: 1,
        valueGetter: (p) => byteToLabels(p.data?.weekdayByte).join('·') || '-',
      },
      {
        headerName: '업무시간대',
        width: 140,
        valueGetter: (p) => (p.data?.startTime ? `${displayHHMM(p.data.startTime)} ~ ${displayHHMM(p.data.finishTime)}` : '-'),
      },
      {
        field: 'useYn',
        headerName: '사용여부',
        width: 100,
        cellRenderer: (p: { value: number | null }) => (p.value === 1 ? <span className="text-blue-600 font-medium">사용</span> : <span className="text-gray-400">미사용</span>),
      },
      { field: 'worktimeDesc', headerName: '설명', flex: 3, minWidth: 180, tooltipField: 'worktimeDesc' },
    ],
    [],
  );

  const rowSelection = useMemo(() => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }), []);

  return (
    <AgGridReact<IrWorktime>
      rowData={rowData}
      columnDefs={colDefs}
      defaultColDef={defaultColDef}
      rowSelection={rowSelection}
      getRowId={getRowId}
      gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
      loading={isLoading}
      onRowDataUpdated={handleRowDataUpdated}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
      onSelectionChanged={(e) => onSelectionChanged(e.api.getSelectedRows())}
    />
  );
}
