import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { SlotRetryDistTopItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<SlotRetryDistTopItem>[] = [
  { headerName: '순위', field: 'rank', maxWidth: 80 },
  { headerName: '시나리오명', field: 'serviceName' },
  { headerName: '대화명', field: 'dialogName' },
  { headerName: '슬롯명', field: 'slotName' },
  { headerName: '진입수', field: 'entryCnt' },
  { headerName: '완결수', field: 'completeCnt' },
  { headerName: '1회이하 완결수', field: 'oneTimeCompleteCnt' },
  { headerName: '1회이하 비율 (%)', field: 'oneTimeCompleteRate' },
  { headerName: '2회 완결수', field: 'twoTimeCompleteCnt' },
  { headerName: '2회 비율 (%)', field: 'twoTimeCompleteRate' },
  { headerName: '3회이상 완결수', field: 'threeOrMoreCompleteCnt' },
  { headerName: '3회이상 비율 (%)', field: 'threeOrMoreCompleteRate' },
  { headerName: '평균 재시도', field: 'avgRetryCount' },
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
