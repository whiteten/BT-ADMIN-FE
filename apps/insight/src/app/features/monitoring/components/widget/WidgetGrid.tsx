import { useMemo } from 'react';
import type { ColDef, ColGroupDef, ValueFormatterParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { fieldMeta, formatValue } from './widgetFormat';
import type { DatasetDetail } from '../../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface WidgetGridProps {
  detail: DatasetDetail;
  /** 표시할 컬럼(필드명) 순서 — 위젯이 다루는 데이터의 기준 */
  columns: string[];
  /** 행 그룹화(트리, 접기/펼치기) 기준 DIM 필드명 (순서대로 계층) */
  groupBy?: string[];
  rows: Record<string, unknown>[];
}

/**
 * 위젯 그리드 — ag-Grid. 그리드가 위젯 데이터 뷰의 기준이며,
 * groupBy가 있으면 행 트리(접기/펼치기)로, 측정값은 그룹 단위 합계로 집계한다.
 */
export default function WidgetGrid({ detail, columns, groupBy, rows }: WidgetGridProps) {
  const { gridOptions } = useAggridOptions();
  const groupSet = useMemo(() => new Set(groupBy ?? []), [groupBy]);

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
        pagination={false}
        statusBar={undefined}
        sideBar={false}
      />
    </div>
  );
}
