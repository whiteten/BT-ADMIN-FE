import { useCallback, useMemo } from 'react';
import type { ColDef, ColGroupDef, RowClassParams, ValueFormatterParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { fieldMeta, formatValue } from './widgetFormat';
import type { DatasetDetail, GridOptions } from '../../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface WidgetGridProps {
  detail: DatasetDetail;
  /** 표시할 컬럼(필드명) 순서 — 위젯이 다루는 데이터의 기준 */
  columns: string[];
  /** 행 그룹화(트리, 접기/펼치기) 기준 DIM 필드명 (순서대로 계층) */
  groupBy?: string[];
  rows: Record<string, unknown>[];
  /** 표시 옵션 — 통계 PanelGrid 와 동일(합계행). */
  options?: GridOptions;
}

/**
 * 위젯 그리드 — ag-Grid. 그리드가 위젯 데이터 뷰의 기준이며,
 * groupBy가 있으면 행 트리(접기/펼치기)로, 측정값은 그룹 단위 합계로 집계한다.
 */
export default function WidgetGrid({ detail, columns, groupBy, rows, options }: WidgetGridProps) {
  const { gridOptions } = useAggridOptions();
  const groupSet = useMemo(() => new Set(groupBy ?? []), [groupBy]);
  const showSumRow = options?.showSumRow ?? false;

  const columnDefs = useMemo<(ColDef | ColGroupDef)[]>(() => {
    const defs: (ColDef | ColGroupDef)[] = [];

    // 1) 그룹 기준 컬럼 — rowGroup으로 트리 구성(컬럼 자체는 숨기고 autoGroupColumn에 표시)
    (groupBy ?? []).forEach((name, i) => {
      const m = fieldMeta(detail, name);
      defs.push({ field: name, headerName: m?.displayName ?? name, rowGroup: true, rowGroupIndex: i, hide: true });
    });

    // 2) 표시 컬럼 — 그룹 기준은 제외(트리에 노출). 차원/측정값 헤더 그룹으로 묶음
    const dimCols: ColDef[] = [];
    const msrCols: ColDef[] = [];
    for (const name of columns) {
      if (groupSet.has(name)) continue;
      const m = fieldMeta(detail, name);
      const isMsr = m?.classification === 'MSR';
      const col: ColDef = {
        field: name,
        headerName: m?.displayName ?? name,
        minWidth: 110,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams) => formatValue(p.value, m?.columnFormat),
        ...(isMsr ? { type: 'numericColumn', aggFunc: 'sum' } : {}),
      };
      if (isMsr) msrCols.push(col);
      else dimCols.push(col);
    }
    if (dimCols.length) defs.push({ headerName: '차원', children: dimCols });
    if (msrCols.length) defs.push({ headerName: '측정값', children: msrCols });
    return defs;
  }, [detail, columns, groupBy, groupSet]);

  // 합계 행 — MSR 컬럼만 합산, 첫 비측정 컬럼에 '합계' 라벨(그룹 모드는 라벨 생략, 합계만).
  // 빈 데이터에서도 토글이 보이도록 항상 한 행을 만든다(값=0).
  const pinnedBottomRowData = useMemo(() => {
    if (!showSumRow) return undefined;
    const row: Record<string, unknown> = {};
    let labelDone = (groupBy ?? []).length > 0;
    for (const name of columns) {
      if (groupSet.has(name)) continue;
      const m = fieldMeta(detail, name);
      if (m?.classification === 'MSR') {
        const nums = rows.map((r) => Number(r[name])).filter((v) => !isNaN(v));
        row[name] = nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0);
      } else if (!labelDone) {
        row[name] = '합계';
        labelDone = true;
      }
    }
    return [row];
  }, [showSumRow, columns, groupBy, groupSet, detail, rows]);

  const getRowStyle = useCallback((params: RowClassParams) => (params.node.rowPinned === 'bottom' ? { background: '#f6f7f9', fontWeight: '600' } : undefined), []);

  if (columns.length === 0) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-bt-fg-muted)]">표시할 컬럼을 추가하세요.</div>;
  }

  const hasGroup = (groupBy ?? []).length > 0;

  return (
    <div className="h-full w-full">
      <AgGridReact
        {...gridOptions}
        columnDefs={columnDefs}
        rowData={rows}
        autoGroupColumnDef={hasGroup ? { headerName: '그룹', minWidth: 200, pinned: 'left', cellRendererParams: { suppressCount: false } } : undefined}
        groupDefaultExpanded={hasGroup ? 1 : undefined}
        pinnedBottomRowData={pinnedBottomRowData}
        getRowStyle={getRowStyle}
        pagination={false}
        statusBar={undefined}
        sideBar={false}
      />
    </div>
  );
}
