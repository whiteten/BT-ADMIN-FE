import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { DialogIncompleteTopItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<DialogIncompleteTopItem>[] = [
  { headerName: '순위', field: 'rank', maxWidth: 80 },
  { headerName: '시나리오명', field: 'serviceName' },
  { headerName: '대화명', field: 'dialogName' },
  { headerName: '진입수', field: 'entryCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '완료수', field: 'completeCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '완료율', field: 'completeRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  { headerName: '미완료수', field: 'incompleteCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '미완료율', field: 'incompleteRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
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
