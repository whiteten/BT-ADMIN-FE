/**
 * PbxWorktimeMasterTable — ag-Grid 기반 교환기 업무시간 마스터 목록 (상단 영역).
 *
 * 단일 선택: 행 선택 시 하단 슬롯(시간대) 영역이 해당 마스터 기준으로 로드된다.
 * getRowId + focusId: 저장 후 refetch 로 rowData 가 교체돼도 저장된 행 선택/스크롤 유지.
 */
import { useCallback, useMemo } from 'react';
import type { ColDef, GetRowIdParams, RowDataUpdatedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { IeWorktimeMaster } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  rowData: IeWorktimeMaster[];
  isLoading: boolean;
  focusId?: number | null; // rowData 갱신 시 선택/노출 유지할 행
  onRowDoubleClicked: (row: IeWorktimeMaster) => void;
  onSelectionChanged: (rows: IeWorktimeMaster[]) => void;
}

export default function PbxWorktimeMasterTable({ rowData, isLoading, focusId, onRowDoubleClicked, onSelectionChanged }: Props) {
  const { gridOptions } = useAggridOptions();

  const getRowId = useCallback((p: GetRowIdParams<IeWorktimeMaster>) => String(p.data.worktimeId), []);

  const handleRowDataUpdated = useCallback(
    (e: RowDataUpdatedEvent<IeWorktimeMaster>) => {
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

  const colDefs: ColDef<IeWorktimeMaster>[] = useMemo(
    () => [
      { field: 'tenantName', headerName: '테넌트명', flex: 1, minWidth: 120, valueGetter: (p) => p.data?.tenantName ?? '-', tooltipField: 'tenantName' },
      { field: 'worktimeName', headerName: '업무시간명', flex: 2, minWidth: 160, tooltipField: 'worktimeName' },
      { field: 'groupKey', headerName: '업무시간KEY', flex: 1, minWidth: 130, tooltipField: 'groupKey' },
      { field: 'worktimeDesc', headerName: '설명', flex: 3, minWidth: 180, tooltipField: 'worktimeDesc' },
    ],
    [],
  );

  const rowSelection = useMemo(() => ({ mode: 'singleRow' as const, checkboxes: false, enableClickSelection: true }), []);

  return (
    <AgGridReact<IeWorktimeMaster>
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
