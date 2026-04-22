import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { IntentCheckFailTopItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<IntentCheckFailTopItem>[] = [
  { headerName: '순위', field: 'rank', maxWidth: 80 },
  { headerName: '시나리오명', field: 'serviceName' },
  { headerName: '모델명', field: 'modelName' },
  { headerName: '인텐트명', field: 'intent' },
  { headerName: '인식수', field: 'detectCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '성공 건수', field: 'passCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '성공 비율', field: 'passRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  { headerName: '재확인 건수', field: 'checkCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '재확인 비율', field: 'checkRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  { headerName: '실패 건수', field: 'failCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '실패 비율', field: 'failRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
];

interface IntentCheckFailTopGridProps {
  data?: IntentCheckFailTopItem[];
}

export default function IntentCheckFailTopGrid({ data }: IntentCheckFailTopGridProps) {
  const { gridOptions } = useAggridOptions();

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<IntentCheckFailTopItem>
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
