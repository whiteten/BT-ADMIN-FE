import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { HourlyEntryItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface FlatHourlyEntryRow {
  serviceName: string;
  hour: string;
  entryCnt: number;
}

const columnDefs: ColDef<FlatHourlyEntryRow>[] = [
  { headerName: '시나리오명', field: 'serviceName' },
  { headerName: '시간대', field: 'hour' },
  { headerName: '진입수', field: 'entryCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
];

const flattenData = (data?: HourlyEntryItem[]): FlatHourlyEntryRow[] => {
  if (!data) return [];
  return data.flatMap((item) =>
    item.hourlyStats.map((stat) => ({
      serviceName: item.serviceName,
      hour: stat.hour,
      entryCnt: stat.entryCnt,
    })),
  );
};

interface HourlyEntryGridProps {
  data?: HourlyEntryItem[];
}

export default function HourlyEntryGrid({ data }: HourlyEntryGridProps) {
  const { gridOptions } = useAggridOptions();
  const rowData = flattenData(data);

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<FlatHourlyEntryRow>
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
