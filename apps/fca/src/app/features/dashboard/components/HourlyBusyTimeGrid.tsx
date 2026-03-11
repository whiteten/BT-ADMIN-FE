import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { HourlyBusyTimeItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface PivotedRow {
  hour: string;
  [serviceId: string]: number | string;
}

const buildColumnDefs = (data: HourlyBusyTimeItem[]): ColDef<PivotedRow>[] => [
  { headerName: '시간대', field: 'hour', pinned: 'left', maxWidth: 80 },
  ...data.map((item) => ({
    headerName: item.serviceName,
    field: String(item.serviceId),
    valueFormatter: (p: { value?: number }) => (p.value != null ? `${p.value}초` : ''),
  })),
];

const pivotData = (data?: HourlyBusyTimeItem[]): PivotedRow[] => {
  if (!data?.length) return [];
  const hours = data[0].hourlyStats;
  return hours.map((_, hourIndex) => {
    const row: PivotedRow = { hour: `${data[0].hourlyStats[hourIndex].hour}시` };
    for (const item of data) {
      row[String(item.serviceId)] = item.hourlyStats[hourIndex].sumBusyTime;
    }
    return row;
  });
};

interface HourlyBusyTimeGridProps {
  data?: HourlyBusyTimeItem[];
}

export default function HourlyBusyTimeGrid({ data }: HourlyBusyTimeGridProps) {
  const { gridOptions } = useAggridOptions();
  const rowData = pivotData(data);
  const columnDefs = buildColumnDefs(data ?? []);

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<PivotedRow>
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
