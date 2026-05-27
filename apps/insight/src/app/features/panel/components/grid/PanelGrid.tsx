import { useMemo } from 'react';
import type { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useGetDataSourceFields } from '../../../dataset/hooks/useDatasetQueries';
import { useReportEditorStore } from '../../../report/hooks/useReportEditorStore';
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
  const { globalFilter } = useReportViewStore();
  const { report } = useReportEditorStore();
  const { data: fields = [] } = useGetDataSourceFields({
    params: { datasourceKey: report?.datasourceKey ?? '' },
    queryOptions: { enabled: !!report?.datasourceKey },
  });
  const displayNameMap = useMemo(() => new Map(fields.map((f) => [f.fieldName, f.displayName])), [fields]);

  const rowFields = panel.fieldMap.filter((f) => f.slotType === 'ROW');
  const valueFields = panel.fieldMap.filter((f) => f.slotType === 'VALUE');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = rowFields.length > 0 || valueFields.length > 0;

  const { data: queryResult, isPending } = usePanelData({
    params: {
      reportId,
      panelId: panel.panelId,
      period: { from: globalFilter.period.from, to: globalFilter.period.to, unit: globalFilter.timeUnit },
      searchValues: globalFilter.searchValues,
      comparison: globalFilter.comparison,
    },
    queryOptions: { enabled: !isDraft && hasMapping },
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

  const rowData = queryResult?.current ?? [];

  if (!hasMapping) {
    return (
      <div className="flex min-h-[120px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 필드를 매핑하세요</p>
      </div>
    );
  }

  return <AgGridReact {...gridOptions} rowData={isDraft ? [] : rowData} columnDefs={columnDefs} loading={!isDraft && isPending} pagination={false} domLayout="autoHeight" />;
}
