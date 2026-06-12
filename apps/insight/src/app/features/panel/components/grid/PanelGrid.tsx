import { useCallback, useMemo } from 'react';
import type { ColDef, RowClassParams, ValueFormatterParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { evaluateRowExpression, extractFieldRefs } from '../../../../utils/rowExpression';
import { formatTimeKey } from '../../../../utils/timeKeyFormat';
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
  // 계산컬럼(CALC) 수식 맵 — 합계 행 재계산용 (formatterOptions JSON 의 rowExpression)
  const calcExprMap = useMemo(() => {
    const map = new Map<string, string>();
    fields
      .filter((f) => f.fieldRole === 'CALC' && f.formatterOptions)
      .forEach((f) => {
        try {
          const expr = (JSON.parse(f.formatterOptions as string) as { rowExpression?: string }).rowExpression;
          if (expr) map.set(f.fieldName, expr);
        } catch {
          /* 수식 JSON 파싱 실패 → 합계 빈칸 */
        }
      });
    return map;
  }, [fields]);

  // 숨김 차원(isHidden)은 GROUP BY 전용 — 그리드 컬럼에서 제외
  const rowFields = panel.fieldMap.filter((f) => f.slotType === 'ROW' && !f.isHidden);
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
      // 시간축 키(yyyyMMdd...)는 단위별 구분자 포맷으로 표시 (합계 행 등 비숫자는 원본 유지)
      ...(f.fieldName === 'PSR_TIME_KEY' ? { valueFormatter: (params: ValueFormatterParams) => formatTimeKey(params.value) } : {}),
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
      // 계산컬럼: 수식 값을 단순 합산하면 율/평균 의미가 깨진다.
      // AS-IS 동일하게 베이스 컬럼(숨은 측정값 — 결과 행에 포함됨)을 집계한 뒤 수식을 재계산.
      // 집계 방식은 계산컬럼의 aggFunc(MAX → 베이스도 MAX, 그 외 SUM)를 따른다.
      if (f.isCalcField) {
        const expr = calcExprMap.get(f.fieldName);
        if (!expr) {
          row[f.fieldName] = null;
          return;
        }
        const useMax = f.aggFunc === 'MAX';
        const baseValues: Record<string, number> = {};
        extractFieldRefs(expr).forEach((ref) => {
          const nums = rowData.map((r: Record<string, unknown>) => Number(r[ref])).filter((v: number) => !isNaN(v));
          baseValues[ref] = nums.length === 0 ? 0 : useMax ? Math.max(...nums) : nums.reduce((a: number, b: number) => a + b, 0);
        });
        row[f.fieldName] = evaluateRowExpression(expr, baseValues);
        return;
      }
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
  }, [showSumRow, rowData, rowFields, valueFields, calcExprMap]);

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

  // 편집 미리보기(draft) → 선택된 컬럼 구조만 깔끔히 표시 (데이터/합계/페이저/상태바 없음, autoHeight)
  if (isDraft) {
    return <AgGridReact {...gridOptions} rowData={[]} columnDefs={columnDefs} domLayout="autoHeight" pagination={false} statusBar={undefined} pinnedBottomRowData={undefined} />;
  }

  // 실제 뷰 → 패널 영역을 꽉 채우는 고정 높이 + 영역 내부 세로 스크롤. 페이징 없음.
  // 통계는 그리드 값과 하단 푸터(합계)를 함께 검증하므로, 합계는 하단 고정(pinnedBottom)으로
  // 항상 보이게 하고 데이터 행만 스크롤한다. domLayout="normal" 이라 패널 높이만큼 보인다.
  return (
    <div className="h-full w-full" style={{ minHeight: 220 }}>
      <AgGridReact
        {...gridOptions}
        rowData={rowData}
        columnDefs={columnDefs}
        loading={isFetching}
        pagination={false}
        domLayout="normal"
        pinnedBottomRowData={pinnedBottomRowData}
        getRowStyle={getRowStyle}
      />
    </div>
  );
}
