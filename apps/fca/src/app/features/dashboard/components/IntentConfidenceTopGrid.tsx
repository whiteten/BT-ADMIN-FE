import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { IntentConfidenceTopItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<IntentConfidenceTopItem>[] = [
  { headerName: '순위', field: 'rank', maxWidth: 80 },
  { headerName: '시나리오명', field: 'serviceName' },
  { headerName: '모델명', field: 'modelName' },
  { headerName: '인텐트명', field: 'intent' },
  { headerName: '인식수', field: 'detectCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '평균 신뢰도', field: 'avgConfidence', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  { headerName: 'Pass 비율', field: 'passRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  { headerName: 'Check 비율', field: 'checkRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  { headerName: 'Fail 비율', field: 'failRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
];

interface IntentConfidenceTopGridProps {
  data?: IntentConfidenceTopItem[];
}

export default function IntentConfidenceTopGrid({ data }: IntentConfidenceTopGridProps) {
  const { gridOptions } = useAggridOptions();

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<IntentConfidenceTopItem>
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
