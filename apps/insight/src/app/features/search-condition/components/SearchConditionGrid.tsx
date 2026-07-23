import { useMemo } from 'react';
import type { ColDef, ICellRendererParams, SideBarDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Popover } from 'antd';
import { Eye } from 'lucide-react';
import { format as formatSql } from 'sql-formatter';
import { useSearchConditionStore } from '../hooks/useSearchConditionStore';
import { CATEGORY_OPTIONS, type InputType, type SearchConditionListItem } from '../types';
import SearchConditionDetailPanel from './SearchConditionDetailPanel';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface SearchConditionGridProps {
  conditions: SearchConditionListItem[];
}

// 공통 배지 스타일 (사용자 계정 화면 AccountStatusBadge와 동일 규격)
const BADGE_BASE = 'text-[13px] leading-[13px] font-medium !h-6';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label]));

// 모니터링 데이터셋 편집 화면과 동일한 SQL 정렬 규격 (sql-formatter)
function prettySql(sql: string): string {
  try {
    return formatSql(sql, { language: 'plsql', keywordCase: 'upper', tabWidth: 2 });
  } catch {
    return sql;
  }
}

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
      headerName: '검색조건명',
      field: 'title',
      flex: 1,
      minWidth: 180,
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
      headerName: '쿼리',
      colId: 'sqlPreview',
      width: 64,
      sortable: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => {
        const nodes = params.data?.nodes ?? [];
        const hasSql = nodes.some((n) => n.optionSqlPreview);
        if (!hasSql) return <Eye className="w-[18px] h-[18px] text-bt-fg-muted/30" />;
        return (
          <Popover
            trigger="click"
            placement="left"
            title="옵션 SQL 미리보기"
            styles={{ root: { maxWidth: 'none' } }}
            content={
              <div className="max-h-[480px] w-[560px] max-w-[80vw] space-y-3 overflow-auto">
                {nodes.map((n, i) => (
                  <div key={`${n.nodeCode}-${i}`} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-bt-fg-muted">{i + 1}</span>
                      <span className="font-mono text-xs font-semibold">{n.nodeCode}</span>
                      <Badge variant="secondary" className={cn(BADGE_BASE, '!h-5 !text-[11px]', INPUT_TYPE_META[n.inputType]?.className)}>
                        {INPUT_TYPE_META[n.inputType]?.label ?? n.inputType}
                      </Badge>
                    </div>
                    <pre className="m-0 min-h-[6.5em] overflow-x-auto whitespace-pre rounded bg-bt-bg-muted px-2.5 py-2 font-mono text-xs leading-relaxed text-bt-fg">
                      {n.optionSqlPreview ? prettySql(n.optionSqlPreview) : '—'}
                    </pre>
                  </div>
                ))}
              </div>
            }
          >
            <button type="button" className="flex items-center justify-center text-bt-primary hover:opacity-70" onClick={(e) => e.stopPropagation()} aria-label="옵션 SQL 미리보기">
              <Eye className="w-[18px] h-[18px]" />
            </button>
          </Popover>
        );
      },
    },
    {
      headerName: '대표 코드',
      colId: 'nodeCode',
      width: 150,
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => {
        const firstNode = params.data?.nodes[0];
        return <span className="font-mono text-bt-fg-muted">{firstNode?.nodeCode ?? '-'}</span>;
      },
    },
    {
      headerName: '단계 수',
      colId: 'nodeCount',
      width: 84,
      type: 'numericColumn',
      cellRenderer: (params: ICellRendererParams<SearchConditionListItem>) => params.data?.nodes.length ?? 0,
    },
  ];

  const handleRowDoubleClick = (event: { data?: SearchConditionListItem }) => {
    if (event.data) {
      openEditorById(event.data.searchCondId);
    }
  };

  // 공통 rowData 패널(검색조건명·카테고리만 노출) 대신 단계 구성까지 보여주는 전용 상세 패널 사용
  const sideBar = useMemo<SideBarDef>(
    () => ({
      toolPanels: [
        {
          id: 'rowData',
          labelDefault: '상세정보',
          labelKey: 'rowData',
          iconKey: 'columns',
          toolPanel: SearchConditionDetailPanel,
        },
      ],
      defaultToolPanel: '',
    }),
    [],
  );

  return <AgGridReact<SearchConditionListItem> {...gridOptions} sideBar={sideBar} rowData={conditions} columnDefs={columnDefs} onRowDoubleClicked={handleRowDoubleClick} />;
}
