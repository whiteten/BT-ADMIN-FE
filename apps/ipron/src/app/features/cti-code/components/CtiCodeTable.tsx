/**
 * CtiCodeTable — ag-Grid 기반 사유 코드 목록 테이블.
 */
import { useRef } from 'react';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { ReasonCodeResponse } from '../types';

interface Props {
  rowData: ReasonCodeResponse[];
  isLoading: boolean;
  onRowDoubleClicked: (row: ReasonCodeResponse) => void;
  onSelectionChanged: (rows: ReasonCodeResponse[]) => void;
  showTenantColumn: boolean;
}

export default function CtiCodeTable({ rowData, isLoading, onRowDoubleClicked, onSelectionChanged, showTenantColumn }: Props) {
  const gridRef = useRef(null);

  const colDefs: ColDef<ReasonCodeResponse>[] = [
    ...(showTenantColumn ? [{ field: 'tenantName' as const, headerName: '테넌트', minWidth: 140, flex: 1 }] : []),
    { field: 'reasonCode' as const, headerName: '사유코드', width: 110, maxWidth: 130 },
    { field: 'reasonName' as const, headerName: '사유코드명', flex: 2, minWidth: 160 },
    { field: 'reasonDesc' as const, headerName: '사유코드설명', flex: 3, minWidth: 200 },
  ];

  const gridOptions: GridOptions<ReasonCodeResponse> = {
    defaultColDef: { sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true },
    rowSelection: { mode: 'multiRow', checkboxes: true, headerCheckbox: true },
    onSelectionChanged: (e) => onSelectionChanged(e.api.getSelectedRows()),
    onRowDoubleClicked: (e) => e.data && onRowDoubleClicked(e.data),
  };

  return (
    <div className="flex-1 ag-theme-quartz h-full">
      <AgGridReact<ReasonCodeResponse> ref={gridRef} rowData={rowData} columnDefs={colDefs} gridOptions={gridOptions} loading={isLoading} />
    </div>
  );
}
