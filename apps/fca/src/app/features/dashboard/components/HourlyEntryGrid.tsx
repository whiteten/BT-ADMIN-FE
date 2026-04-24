import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { HourlyEntryItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface PivotedRow {
  hour: string;
  [serviceId: string]: number | string;
}

const buildColumnDefs = (data: HourlyEntryItem[]): ColDef<PivotedRow>[] => [
  { headerName: '시간대', field: 'hour', pinned: 'left', maxWidth: 80 },
  ...data.map((item) => ({
    headerName: item.serviceName,
    field: String(item.serviceId),
    valueFormatter: (p: { value?: number }) => (p.value != null ? `${p.value}건` : ''),
  })),
];

const pivotData = (data?: HourlyEntryItem[]): PivotedRow[] => {
  if (!data?.length) return [];
  const hours = data[0].hourlyStats;
  return hours.map((_, hourIndex) => {
    const row: PivotedRow = { hour: `${data[0].hourlyStats[hourIndex].hour}시` };
    for (const item of data) {
      row[String(item.serviceId)] = item.hourlyStats[hourIndex].entryCnt;
    }
    return row;
  });
};

interface HourlyEntryGridProps {
  data?: HourlyEntryItem[];
}

export default function HourlyEntryGrid({ data }: HourlyEntryGridProps) {
  const { gridOptions } = useAggridOptions();
  const rowData = pivotData(data);
  const columnDefs = buildColumnDefs(data ?? []);

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<PivotedRow>
        rowData={rowData}
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
