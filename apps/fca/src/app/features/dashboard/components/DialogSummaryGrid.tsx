import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { DialogSummary } from '../types/dashboard.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface SummaryRow {
  category: string;
  count: number;
  rate: number;
  prevRate: number;
  rateDiff: number;
}

const columnDefs: ColDef<SummaryRow>[] = [
  { headerName: '구분', field: 'category' },
  { headerName: '금일', field: 'count', valueFormatter: (p) => (p.value != null ? `${p.value.toLocaleString()}건` : '') },
  { headerName: '비율', field: 'rate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  { headerName: '전일 비율', field: 'prevRate', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  {
    headerName: '증감',
    field: 'rateDiff',
    valueFormatter: (p) => {
      if (p.value == null) return '';
      if (p.value === 0) return '- 0%p';
      const arrow = p.value > 0 ? '▲' : '▼';
      return `${arrow} ${Math.abs(p.value)}%p`;
    },
    cellStyle: (p) => {
      if (p.value > 0) return { color: '#10B981' };
      if (p.value < 0) return { color: '#F06548' };
      return { color: '#999' };
    },
  },
];

const calcPrevRate = (rate: number, rateDiff: number) => Math.round((rate - rateDiff) * 10) / 10;

const toRows = (data: DialogSummary): SummaryRow[] => [
  { category: '완료', count: data.completeCnt, rate: data.completeRate, prevRate: calcPrevRate(data.completeRate, data.completeRateDiff), rateDiff: data.completeRateDiff },
  {
    category: '미완료',
    count: data.incompleteCnt,
    rate: data.incompleteRate,
    prevRate: calcPrevRate(data.incompleteRate, data.incompleteRateDiff),
    rateDiff: data.incompleteRateDiff,
  },
];

interface DialogSummaryGridProps {
  data?: DialogSummary;
}

export default function DialogSummaryGrid({ data }: DialogSummaryGridProps) {
  const { gridOptions } = useAggridOptions();

  return (
    <div className="h-full w-full p-2">
      <AgGridReact<SummaryRow>
        rowData={data ? toRows(data) : []}
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
