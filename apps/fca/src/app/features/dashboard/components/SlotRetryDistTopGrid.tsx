import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { SlotRetryDistTopItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<SlotRetryDistTopItem>[] = [
  { headerName: '순위', field: 'rank', maxWidth: 80 },
  { headerName: '시나리오명', field: 'serviceName' },
  { headerName: '슬롯명', field: 'slotName' },
  { headerName: '진입수', field: 'entryCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '완료수', field: 'completeCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '1회 재시도', field: 'oneTimeCompleteCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '1회 비율', field: 'oneTimeCompleteRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  { headerName: '2회 재시도', field: 'twoTimeCompleteCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '2회 비율', field: 'twoTimeCompleteRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  { headerName: '3회 이상 재시도', field: 'threeOrMoreCompleteCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
  { headerName: '3회 이상 비율', field: 'threeOrMoreCompleteRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  { headerName: '평균 재시도', field: 'avgRetryCount', valueFormatter: (p) => (p.value != null ? `${p.value}회` : '') },
];

interface SlotRetryDistTopGridProps {
  data?: SlotRetryDistTopItem[];
}

export default function SlotRetryDistTopGrid({ data }: SlotRetryDistTopGridProps) {
  const { gridOptions } = useAggridOptions();

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<SlotRetryDistTopItem>
        rowData={data ?? []}
        columnDefs={columnDefs}
        gridOptions={{ ...gridOptions, statusBar: undefined }}
        pagination={false}
        sideBar={false}
        rowNumbers={false}
        headerHeight={32}
        rowHeight={28}
      />
    </div>
  );
}
