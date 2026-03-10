import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { ScenarioSummary } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface SummaryRow {
  category: string;
  count: number;
  rate: number;
  rateDiff: number;
}

const columnDefs: ColDef<SummaryRow>[] = [
  { headerName: '구분', field: 'category' },
  { headerName: '건수', field: 'count' },
  { headerName: '비율(%)', field: 'rate' },
  { headerName: '전일대비(%p)', field: 'rateDiff' },
];

const toRows = (data: ScenarioSummary): SummaryRow[] => [
  { category: '완결', count: data.completeCnt, rate: data.completeRate, rateDiff: data.completeRateDiff },
  { category: '미완결', count: data.incompleteCnt, rate: data.incompleteRate, rateDiff: data.incompleteRateDiff },
  { category: '상담원 전환', count: data.agentReqCnt, rate: data.agentTransferRate, rateDiff: data.agentTransferRateDiff },
];

interface ScenarioSummaryGridProps {
  data?: ScenarioSummary;
}

export default function ScenarioSummaryGrid({ data }: ScenarioSummaryGridProps) {
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
