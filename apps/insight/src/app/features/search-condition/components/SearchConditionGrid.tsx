import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useSearchConditionStore } from '../hooks/useSearchConditionStore';
import { CATEGORY_OPTIONS, type InputType, type SearchConditionListItem } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface SearchConditionGridProps {
  conditions: SearchConditionListItem[];
}

// 공통 배지 스타일 (사용자 계정 화면 AccountStatusBadge와 동일 규격)
const BADGE_BASE = 'text-[13px] leading-[13px] font-medium !h-6';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label]));

const INPUT_TYPE_META: Record<InputType, { label: string; className: string }> = {
  SELECT: { label: '단일 선택', className: 'text-[#0AB39C] bg-[#0AB39C1A]' },
  MULTI_SELECT: { label: '복수 선택', className: 'text-[#4B92F7] bg-[#4B92F71A]' },
  TREE_MULTI_SELECT: { label: '계층 복수', className: 'text-[#F7B84B] bg-[#F7B84B1A]' },
  RADIO: { label: '라디오', className: 'text-[#878A99] bg-[#878A991A]' },
};

export default function SearchConditionGrid({ conditions }: SearchConditionGridProps) {
  const { gridOptions } = useAggridOptions();
  const { openEditorById } = useSearchConditionStore();

  const columnDefs: ColDef<SearchConditionListItem>[] = [
    {
      headerName: '조건 코드',
      colId: 'nodeCode',
      width: 160,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => {
        const firstNode = params.data?.nodes[0];
        return <span className="font-mono">{firstNode?.nodeCode ?? '-'}</span>;
      },
    },
    {
      headerName: '검색조건명',
      field: 'title',
      flex: 1,
    },
    {
      headerName: '카테고리',
      field: 'categoryCode',
      width: 100,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) =>
        params.value ? (
          <Badge variant="secondary" className={BADGE_BASE}>
            {CATEGORY_LABEL[params.value] ?? params.value}
          </Badge>
        ) : (
          '-'
        ),
    },
    {
      headerName: '입력 유형',
      colId: 'inputType',
      width: 180,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => {
        // 노드별 입력 유형 중복 제거 (동일 유형 노드 다수여도 배지 1개)
        const uniqueTypes = [...new Set((params.data?.nodes ?? []).map((n) => n.inputType))];
        if (uniqueTypes.length === 0) return '-';
        return (
          <div className="flex flex-wrap gap-1 items-center h-full">
            {uniqueTypes.map((t) => {
              const meta = INPUT_TYPE_META[t];
              return (
                <Badge key={t} variant="secondary" className={cn(BADGE_BASE, meta?.className)}>
                  {meta?.label ?? t}
                </Badge>
              );
            })}
          </div>
        );
      },
    },
    {
      headerName: '노드 수',
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
