import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useSearchConditionStore } from '../hooks/useSearchConditionStore';
import type { SearchConditionListItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface SearchConditionGridProps {
  conditions: SearchConditionListItem[];
}

const INPUT_TYPE_COLORS: Record<string, string> = {
  TREE_MULTI_SELECT: 'text-bt-warn bg-bt-warn-soft',
  MULTI_SELECT: 'text-bt-primary bg-bt-primary-soft',
  SELECT: 'text-bt-primary bg-bt-primary-soft',
  RADIO: 'text-bt-primary bg-bt-primary-soft',
};

export default function SearchConditionGrid({ conditions }: SearchConditionGridProps) {
  const { gridOptions } = useAggridOptions();
  const { openEditorById } = useSearchConditionStore();

  const columnDefs: ColDef<SearchConditionListItem>[] = [
    {
      field: 'nodes',
      headerName: 'KEY',
      width: 160,
      cellRenderer: (params: { data: SearchConditionListItem }) => {
        const firstNode = params.data.nodes[0];
        return `<span class="font-mono text-[11px] font-semibold">${firstNode?.nodeCode ?? '-'}</span>`;
      },
    },
    {
      field: 'title',
      headerName: '표시명',
      flex: 1,
      cellRenderer: (params: { value: string }) => `<span class="font-medium">${params.value}</span>`,
    },
    {
      field: 'categoryCode',
      headerName: 'GROUP',
      width: 100,
      cellRenderer: (params: { value?: string }) => (params.value ? `<span class="rounded bg-bt-bg-muted px-1.5 py-0.5 text-[10px]">${params.value}</span>` : '-'),
    },
    {
      field: 'nodes',
      headerName: 'INPUT_TYPE',
      width: 180,
      cellRenderer: (params: { data: SearchConditionListItem }) => {
        return params.data.nodes
          .map((n) => {
            const color = INPUT_TYPE_COLORS[n.inputType] ?? 'text-bt-fg-muted bg-bt-bg-muted';
            return `<span class="rounded ${color} px-1.5 py-0.5 text-[10px] font-semibold mr-1">${n.inputType}</span>`;
          })
          .join('');
      },
    },
    {
      field: 'isBundle',
      headerName: '번들',
      width: 70,
      cellRenderer: (params: { value: boolean }) => (params.value ? `<span class="text-[10px] text-bt-success">묶음</span>` : ''),
    },
    {
      field: 'usedReportCount',
      headerName: '사용 보고서',
      width: 100,
      type: 'numericColumn',
      cellRenderer: (params: { value: number }) => `<span class="font-mono">${params.value}</span>`,
    },
    {
      headerName: '',
      width: 40,
      cellRenderer: () => `<span class="text-bt-fg-muted cursor-pointer">⋯</span>`,
      sortable: false,
    },
  ];

  const handleRowDoubleClick = (event: { data?: SearchConditionListItem }) => {
    if (event.data) {
      openEditorById(event.data.searchCondId);
    }
  };

  return <AgGridReact<SearchConditionListItem> {...gridOptions} rowData={conditions} columnDefs={columnDefs} onRowDoubleClicked={handleRowDoubleClick} />;
}
