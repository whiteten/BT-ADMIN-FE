import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { IntentTopItem } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<IntentTopItem>[] = [
  { headerName: '순위', field: 'rank', maxWidth: 80 },
  { headerName: '의도명', field: 'intent' },
  { headerName: '검출 횟수', field: 'detectCnt', valueFormatter: (p) => (p.value != null ? `${p.value}건` : '') },
];

interface IntentTopGridProps {
  data?: IntentTopItem[];
}

export default function IntentTopGrid({ data }: IntentTopGridProps) {
  const { gridOptions } = useAggridOptions();

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<IntentTopItem>
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
