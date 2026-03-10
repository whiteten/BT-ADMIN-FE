import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { DialogIncompleteTopItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<DialogIncompleteTopItem>[] = [
  { headerName: '순위', field: 'rank', maxWidth: 80 },
  { headerName: '시나리오명', field: 'serviceName' },
  { headerName: '대화명', field: 'dialogName' },
  { headerName: '진입수', field: 'entryCnt' },
  { headerName: '완결수', field: 'completeCnt' },
  { headerName: '완결률 (%)', field: 'completeRate' },
  { headerName: '미완결수', field: 'incompleteCnt' },
  { headerName: '미완결률 (%)', field: 'incompleteRate' },
];

interface DialogIncompleteTopGridProps {
  data?: DialogIncompleteTopItem[];
}

export default function DialogIncompleteTopGrid({ data }: DialogIncompleteTopGridProps) {
  const { gridOptions } = useAggridOptions();

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<DialogIncompleteTopItem>
        rowData={data ?? []}
        columnDefs={columnDefs}
        gridOptions={gridOptions}
        pagination={false}
        statusBar={{ statusPanels: [] }}
        sideBar={false}
        rowNumbers={false}
        headerHeight={32}
        rowHeight={28}
      />
    </div>
  );
}
