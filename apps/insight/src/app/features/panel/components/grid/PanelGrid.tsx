import { useCallback, useMemo } from 'react';
import type { ColDef, RowClassParams, ValueFormatterParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useGetDataSourceFields } from '../../../dataset/hooks/useDatasetQueries';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { ColumnFormat, PanelDetail } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface PanelGridProps {
  panel: PanelDetail;
  reportId: number;
}

function formatValue(value: unknown, format: ColumnFormat | undefined): string {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  switch (format) {
    case 'Decimal':
      return num.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'Rate':
      return `${num.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`;
    case 'Time': {
      const h = Math.floor(num / 3600)
        .toString()
        .padStart(2, '0');
      const m = Math.floor((num % 3600) / 60)
        .toString()
        .padStart(2, '0');
      const s = (num % 60).toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
    default:
      return num.toLocaleString('ko-KR');
  }
}

export default function PanelGrid({ panel, reportId }: PanelGridProps) {
  const { gridOptions } = useAggridOptions();
  const { committedFilter, queryTrigger } = useReportViewStore();
  // 데이터셋은 패널별(N:M) — 보고서 단위가 아니라 panel.datasetId 로 표시명 로드
  const { data: fields = [] } = useGetDataSourceFields({
    params: { datasetId: panel.datasetId ?? 0 },
    queryOptions: { enabled: !!panel.datasetId },
  });
  const displayNameMap = useMemo(() => new Map(fields.map((f) => [f.fieldName, f.displayName])), [fields]);

  const rowFields = panel.fieldMap.filter((f) => f.slotType === 'ROW');
  const valueFields = panel.fieldMap.filter((f) => f.slotType === 'VALUE');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = rowFields.length > 0 || valueFields.length > 0;

  const { data: queryResult, isFetching } = usePanelData({
    params: {
      reportId,
      panelId: panel.panelId,
      period: { from: committedFilter.period.from, to: committedFilter.period.to, unit: committedFilter.timeUnit },
      searchValues: committedFilter.searchValues,
      comparison: committedFilter.comparison,
      conditions: committedFilter.conditions,
    },
    queryTrigger,
    queryOptions: { enabled: !isDraft && hasMapping && queryTrigger > 0 },
  });

  const columnDefs: ColDef[] = useMemo(() => {
    const dimCols: ColDef[] = rowFields.map((f) => ({
      field: f.fieldName,
      headerName: displayNameMap.get(f.fieldName) ?? f.fieldName,
      sortable: true,
      minWidth: 100,
    }));
    const msrCols: ColDef[] = valueFields.map((f) => ({
      field: f.fieldName,
      headerName: displayNameMap.get(f.fieldName) ?? f.fieldName,
      sortable: true,
      type: 'numericColumn',
      minWidth: 100,
      valueFormatter: (params: ValueFormatterParams) => formatValue(params.value, f.columnFormat),
    }));
    return [...dimCols, ...msrCols];
  }, [rowFields, valueFields, displayNameMap]);

  const rowData = useMemo(() => queryResult?.current ?? [], [queryResult]);
  const showSumRow = (panel.chartOptions as { showSumRow?: boolean } | undefined)?.showSumRow ?? true;
  const summaryRow = useMemo(() => {
    if (!showSumRow || rowData.length === 0) return null;
    const row: Record<string, unknown> = {};
    rowFields.forEach((f, i) => {
      row[f.fieldName] = i === 0 ? '합계' : '';
    });
    valueFields.forEach((f) => {
      // aggFunc 미지정(없음)인 컬럼은 합계 행에서 빈칸 처리
      if (!f.aggFunc) {
        row[f.fieldName] = null;
        return;
      }
      const vals = rowData.map((r: Record<string, unknown>) => Number(r[f.fieldName])).filter((v: number) => !isNaN(v));
      if (vals.length === 0) {
        row[f.fieldName] = null;
        return;
      }
      // 행 데이터는 백엔드에서 이미 그룹별 집계됨 → 컬럼 aggFunc로 그룹 간 롤업
      switch (f.aggFunc) {
        // SUM/COUNT: 그룹별 값(합/카운트)을 다시 합산 → 전체 합계/전체 카운트
        case 'SUM':
        case 'COUNT':
          row[f.fieldName] = vals.reduce((a: number, b: number) => a + b, 0);
          break;
        // AVG: 그룹별 평균을 다시 평균
        case 'AVG':
          row[f.fieldName] = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
          break;
        case 'MAX':
          row[f.fieldName] = Math.max(...vals);
          break;
        case 'MIN':
          row[f.fieldName] = Math.min(...vals);
          break;
        default:
          row[f.fieldName] = null;
      }
    });
    return row;
  }, [showSumRow, rowData, rowFields, valueFields]);

  // 안정적인 ref 유지 — 매 렌더 새 배열/함수면 ag-grid가 갱신 루프에 빠짐
  const pinnedBottomRowData = useMemo(() => (!isDraft && summaryRow ? [summaryRow] : undefined), [isDraft, summaryRow]);
  const getRowStyle = useCallback((params: RowClassParams) => (params.node.rowPinned === 'bottom' ? { background: '#f6f7f9', fontWeight: '600' } : undefined), []);

  if (!hasMapping) {
    return (
      <div className="flex min-h-[120px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 필드를 매핑하세요</p>
      </div>
    );
  }

  return (
    <AgGridReact
      {...gridOptions}
      rowData={isDraft ? [] : rowData}
      columnDefs={columnDefs}
      loading={!isDraft && isFetching}
      pagination={false}
      domLayout="autoHeight"
      pinnedBottomRowData={pinnedBottomRowData}
      getRowStyle={getRowStyle}
    />
  );
}
