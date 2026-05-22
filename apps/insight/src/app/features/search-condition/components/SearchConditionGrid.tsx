import type { ColDef, ICellRendererParams } from 'ag-grid-community';
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
      headerName: 'KEY',
      field: 'nodes',
      colId: 'nodeCode',
      width: 160,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => {
        const firstNode = params.data?.nodes[0];
        return <span className="font-mono">{firstNode?.nodeCode ?? '-'}</span>;
      },
    },
    {
      headerName: '표시명',
      field: 'title',
      flex: 1,
    },
    {
      headerName: 'GROUP',
      field: 'categoryCode',
      width: 100,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => (params.value ? <span className="rounded bg-bt-bg-muted px-1.5 py-0.5">{params.value}</span> : '-'),
    },
    {
      headerName: 'INPUT_TYPE',
      field: 'nodes',
      colId: 'inputType',
      width: 180,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => (
        <div className="flex flex-wrap gap-1 items-center h-full">
          {params.data?.nodes.map((n) => {
            const color = INPUT_TYPE_COLORS[n.inputType] ?? 'text-bt-fg-muted bg-bt-bg-muted';
            return (
              <span key={n.nodeCode} className={`rounded ${color} px-1.5 py-0.5`}>
                {n.inputType}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      headerName: '번들',
      field: 'isBundle',
      width: 70,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => (params.value ? <span className="text-bt-success">묶음</span> : null),
    },
    {
      headerName: '사용 보고서',
      field: 'usedReportCount',
      width: 110,
      type: 'numericColumn',
    },
    {
      headerName: '',
      colId: 'action',
      width: 40,
      sortable: false,
      suppressHeaderMenuButton: true,
      cellRenderer: () => <span className="text-bt-fg-muted cursor-pointer">⋯</span>,
    },
  ];

  const handleRowDoubleClick = (event: { data?: SearchConditionListItem }) => {
    if (event.data) {
      openEditorById(event.data.searchCondId);
    }
  };

  return <AgGridReact<SearchConditionListItem> {...gridOptions} rowData={conditions} columnDefs={columnDefs} onRowDoubleClicked={handleRowDoubleClick} />;
}
