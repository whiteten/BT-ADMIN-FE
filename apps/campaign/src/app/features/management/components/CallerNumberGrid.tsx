import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
import type { CallerNumberListItem } from '../types/callerNumber';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');

const columnDefs: ColDef<CallerNumberListItem>[] = [
  { headerName: '발신번호', field: 'callerNumber', flex: 1, minWidth: 140 },
  { headerName: '발신번호명', field: 'callerNumberName', flex: 1, minWidth: 140 },
  { headerName: '작업자', field: 'worker', width: 140 },
  {
    headerName: '작업시간',
    field: 'workDateTime',
    width: 180,
    valueFormatter: (params) => formatDateTime(params.value),
  },
];

type CallerNumberGridProps = {
  rowData: CallerNumberListItem[];
  selectedCallerNumberId: string | null;
  onRowSelect: (callerNumberId: string) => void;
};

export default function CallerNumberGrid({ rowData, selectedCallerNumberId, onRowSelect }: CallerNumberGridProps) {
  const { gridOptions } = useAggridOptions();

  return (
    <div className="w-full h-[420px]">
      <AgGridReact<CallerNumberListItem>
        rowModelType="clientSide"
        rowData={rowData}
        getRowId={(params) => params.data.callerNumberId}
        columnDefs={columnDefs}
        gridOptions={{
          ...gridOptions,
          sideBar: false,
          rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
          getRowClass: (params) => (params.data?.callerNumberId === selectedCallerNumberId ? 'ag-row-selected' : undefined),
        }}
        onRowClicked={(event) => {
          if (event.data) {
            onRowSelect(event.data.callerNumberId);
          }
        }}
      />
    </div>
  );
}
