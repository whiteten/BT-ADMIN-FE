import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { SlotRetryAvgTopItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<SlotRetryAvgTopItem>[] = [
  { headerName: '순위', field: 'rank', maxWidth: 80 },
  { headerName: '시나리오명', field: 'serviceName' },
  { headerName: '슬롯명', field: 'slotName' },
  { headerName: '진입수', field: 'entryCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '완결수', field: 'completeCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '총 재시도수', field: 'retryCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '평균 재시도', field: 'avgRetryCount', valueFormatter: (p) => (p.value != null ? `${p.value}회` : '') },
  { headerName: '1회이하 완결수', field: 'oneTimeCompleteCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '2회 완결수', field: 'twoTimeCompleteCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '3회이상 완결수', field: 'threeOrMoreCompleteCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
];

interface SlotRetryAvgTopGridProps {
  data?: SlotRetryAvgTopItem[];
}

export default function SlotRetryAvgTopGrid({ data }: SlotRetryAvgTopGridProps) {
  const { gridOptions } = useAggridOptions();

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<SlotRetryAvgTopItem>
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
