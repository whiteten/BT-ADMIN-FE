/**
 * CtiCodeTable — ag-Grid 기반 사유 코드 목록 테이블.
 */
import { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { ReasonCodeResponse } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  rowData: ReasonCodeResponse[];
  isLoading: boolean;
  onRowDoubleClicked: (row: ReasonCodeResponse) => void;
  onSelectionChanged: (rows: ReasonCodeResponse[]) => void;
  showTenantColumn: boolean;
}

export default function CtiCodeTable({ rowData, isLoading, onRowDoubleClicked, onSelectionChanged, showTenantColumn }: Props) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }),
    [],
  );

  const colDefs: ColDef<ReasonCodeResponse>[] = useMemo(
    () => [
      ...(showTenantColumn ? [{ field: 'tenantName' as const, headerName: '테넌트', minWidth: 140, flex: 1 }] : []),
      { field: 'reasonCode' as const, headerName: '사유코드', width: 110, maxWidth: 130, filter: 'agNumberColumnFilter' },
      { field: 'reasonName' as const, headerName: '사유코드명', flex: 2, minWidth: 160, tooltipField: 'reasonName' },
      { field: 'reasonDesc' as const, headerName: '사유코드설명', flex: 3, minWidth: 200, tooltipField: 'reasonDesc' },
    ],
    [showTenantColumn],
  );

  const rowSelection = useMemo(() => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }), []);

  return (
    <AgGridReact<ReasonCodeResponse>
      rowData={rowData}
      columnDefs={colDefs}
      defaultColDef={defaultColDef}
      rowSelection={rowSelection}
      gridOptions={{
        ...gridOptions,
        statusBar: undefined,
        pagination: false,
        sideBar: false,
      }}
      loading={isLoading}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
      onSelectionChanged={(e) => onSelectionChanged(e.api.getSelectedRows())}
    />
  );
}
