import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { HourlyBusyTimeItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface FlatHourlyBusyTimeRow {
  serviceName: string;
  hour: string;
  sumBusyTime: number;
}

const columnDefs: ColDef<FlatHourlyBusyTimeRow>[] = [
  { headerName: '시나리오명', field: 'serviceName' },
  { headerName: '시간대', field: 'hour' },
  { headerName: '점유시간', field: 'sumBusyTime', valueFormatter: (p) => (p.value != null ? `${p.value}초` : '') },
];

const flattenData = (data?: HourlyBusyTimeItem[]): FlatHourlyBusyTimeRow[] => {
  if (!data) return [];
  return data.flatMap((item) =>
    item.hourlyStats.map((stat) => ({
      serviceName: item.serviceName,
      hour: stat.hour,
      sumBusyTime: stat.sumBusyTime,
    })),
  );
};

interface HourlyBusyTimeGridProps {
  data?: HourlyBusyTimeItem[];
}

export default function HourlyBusyTimeGrid({ data }: HourlyBusyTimeGridProps) {
  const { gridOptions } = useAggridOptions();
  const rowData = flattenData(data);

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<FlatHourlyBusyTimeRow>
        rowData={rowData}
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
