import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { DialogSummary } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface SummaryRow {
  category: string;
  count: number;
  rate: number;
  prevCount: number;
}

const columnDefs: ColDef<SummaryRow>[] = [
  { headerName: '구분', field: 'category' },
  { headerName: '금일', field: 'count', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '전일', field: 'prevCount', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '비율', field: 'rate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
];

const toRows = (data: DialogSummary): SummaryRow[] => [
  { category: '완결', count: data.completeCnt, rate: data.completeRate, prevCount: data.prevCompleteCnt },
  { category: '미완결', count: data.incompleteCnt, rate: data.incompleteRate, prevCount: data.prevIncompleteCnt },
];

interface DialogSummaryGridProps {
  data?: DialogSummary;
}

export default function DialogSummaryGrid({ data }: DialogSummaryGridProps) {
  const { gridOptions } = useAggridOptions();

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<SummaryRow>
        rowData={data ? toRows(data) : []}
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
