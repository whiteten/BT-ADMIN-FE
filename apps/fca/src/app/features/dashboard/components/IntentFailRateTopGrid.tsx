import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { IntentFailRateTopItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<IntentFailRateTopItem>[] = [
  { headerName: '순위', field: 'rank', maxWidth: 80 },
  { headerName: '시나리오명', field: 'serviceName' },
  { headerName: '모델명', field: 'modelName' },
  { headerName: '인텐트명', field: 'intent' },
  { headerName: '인식수', field: 'detectCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '실패 수', field: 'failCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '신뢰도 실패율', field: 'failRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
];

interface IntentFailRateTopGridProps {
  data?: IntentFailRateTopItem[];
}

export default function IntentFailRateTopGrid({ data }: IntentFailRateTopGridProps) {
  const { gridOptions } = useAggridOptions();
  return (
    <div className="h-full w-full p-2">
      <AgGridReact<IntentFailRateTopItem>
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
