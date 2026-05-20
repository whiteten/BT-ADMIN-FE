import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { OccupancyItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<OccupancyItem>[] = [
  { headerName: '명칭', field: 'key' },
  { headerName: '실시간 콜수', field: 'callCount', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
];

interface OccupancyGridProps {
  data?: OccupancyItem[];
}

export default function OccupancyGrid({ data }: OccupancyGridProps) {
  const { gridOptions } = useAggridOptions();

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<OccupancyItem>
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
