import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { SlotSummary } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface SummaryRow {
  category: string;
  count: number;
  rate: number;
}

const columnDefs: ColDef<SummaryRow>[] = [
  { headerName: '구분', field: 'category' },
  { headerName: '건수', field: 'count' },
  { headerName: '비율(%)', field: 'rate' },
];

const toRows = (data: SlotSummary): SummaryRow[] => [
  { category: '완결', count: data.completeCnt, rate: data.completeRate },
  { category: '미완결', count: data.incompleteCnt, rate: data.incompleteRate },
];

interface SlotSummaryGridProps {
  data?: SlotSummary;
}

export default function SlotSummaryGrid({ data }: SlotSummaryGridProps) {
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
