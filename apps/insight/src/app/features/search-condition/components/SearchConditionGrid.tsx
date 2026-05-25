import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useSearchConditionStore } from '../hooks/useSearchConditionStore';
import { CATEGORY_OPTIONS, type SearchConditionListItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface SearchConditionGridProps {
  conditions: SearchConditionListItem[];
}

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label]));

const INPUT_TYPE_COLORS: Record<string, string> = {
  TREE_MULTI_SELECT: 'text-bt-warn bg-bt-warn-soft',
  MULTI_SELECT: 'text-bt-primary bg-bt-primary-soft',
  SELECT: 'text-bt-primary bg-bt-primary-soft',
  RADIO: 'text-bt-primary bg-bt-primary-soft',
};

const INPUT_TYPE_SHORT_LABEL: Record<string, string> = {
  SELECT: '단일 선택',
  MULTI_SELECT: '복수 선택',
  TREE_MULTI_SELECT: '계층 복수',
  RADIO: '라디오',
};

export default function SearchConditionGrid({ conditions }: SearchConditionGridProps) {
  const { gridOptions } = useAggridOptions();
  const { openEditorById } = useSearchConditionStore();

  const columnDefs: ColDef<SearchConditionListItem>[] = [
    {
      headerName: '조건 코드',
      field: 'nodes',
      colId: 'nodeCode',
      width: 160,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => {
        const firstNode = params.data?.nodes[0];
        return <span className="font-mono">{firstNode?.nodeCode ?? '-'}</span>;
      },
    },
    {
      headerName: '묶음명',
      field: 'title',
      flex: 1,
    },
    {
      headerName: '카테고리',
      field: 'categoryCode',
      width: 100,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) =>
        params.value ? <span className="rounded bg-bt-bg-muted px-1.5 py-0.5">{CATEGORY_LABEL[params.value] ?? params.value}</span> : '-',
    },
    {
      headerName: '입력 유형',
      field: 'nodes',
      colId: 'inputType',
      width: 180,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => (
        <div className="flex flex-wrap gap-1 items-center h-full">
          {params.data?.nodes.map((n) => {
            const color = INPUT_TYPE_COLORS[n.inputType] ?? 'text-bt-fg-muted bg-bt-bg-muted';
            return (
              <span key={n.nodeCode} className={`rounded ${color} px-1.5 py-0.5`}>
                {INPUT_TYPE_SHORT_LABEL[n.inputType] ?? n.inputType}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      headerName: '묶음',
      field: 'isBundle',
      width: 70,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => (params.value ? <span className="text-bt-success">묶음</span> : null),
    },
    {
      headerName: '노드 수',
      field: 'nodes',
      colId: 'nodeCount',
      width: 80,
      type: 'numericColumn',
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => params.data?.nodes.length ?? 0,
    },
    {
      headerName: '사용 보고서',
      field: 'usedReportCount',
      width: 110,
      type: 'numericColumn',
    },
  ];

  const handleRowDoubleClick = (event: { data?: SearchConditionListItem }) => {
    if (event.data) {
      openEditorById(event.data.searchCondId);
    }
  };

  return <AgGridReact<SearchConditionListItem> {...gridOptions} rowData={conditions} columnDefs={columnDefs} onRowDoubleClicked={handleRowDoubleClick} />;
}
