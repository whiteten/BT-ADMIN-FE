/**
 * 미디어타입 ag-Grid — 다중 선택 + 일괄 삭제(툴바) + 더블클릭 수정.
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { MediaTypeResponse } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  rowData: MediaTypeResponse[];
  isLoading?: boolean;
  onRowDoubleClicked: (row: MediaTypeResponse) => void;
  onSelectionChanged?: (selected: MediaTypeResponse[]) => void;
}

export default function MediaTypeTable({ rowData, isLoading, onRowDoubleClicked, onSelectionChanged }: Props) {
  const { gridOptions } = useAggridOptions();
  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  const columnDefs: ColDef<MediaTypeResponse>[] = useMemo(
    () => [
      {
        headerName: '코드',
        field: 'mediaType',
        width: 100,
        maxWidth: 120,
        cellStyle: { textAlign: 'right' } as CellStyle,
      },
      {
        headerName: '미디어 코드명',
        field: 'mediaTypeName',
        flex: 1,
        minWidth: 180,
        valueFormatter: (p) => p.value ?? '-',
      },
      {
        headerName: '표시 이름',
        field: 'mediaAlias',
        flex: 1.2,
        minWidth: 200,
      },
      {
        headerName: '최종 수정',
        field: 'workTime',
        width: 170,
        valueFormatter: (p) => (p.value ? String(p.value).replace('T', ' ').slice(0, 16) : '-'),
      },
    ],
    [],
  );

  return (
    <AgGridReact<MediaTypeResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      gridOptions={{
        ...gridOptions,
        statusBar: undefined,
        pagination: false,
        sideBar: false,
        rowSelection: { mode: 'multiRow', checkboxes: true, headerCheckbox: true },
      }}
      loading={isLoading}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
      onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
    />
  );
}
