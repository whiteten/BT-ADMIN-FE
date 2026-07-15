import { formatCell } from '../../../../utils/columnFormat';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { PanelDetail } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';

interface PanelKpiCardProps {
  panel: PanelDetail;
  reportId: number;
}

export default function PanelKpiCard({ panel, reportId }: PanelKpiCardProps) {
  const { committedFilter, queryTrigger } = useReportViewStore();

  const valueField = panel.fieldMap.find((f) => f.slotType === 'VALUE' || f.slotType === 'Y_AXIS');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = !!valueField;

  const { data: queryResult, isFetching } = usePanelData({
    params: {
      reportId,
      panelId: panel.panelId,
      period: { from: committedFilter.period.from, to: committedFilter.period.to, unit: committedFilter.timeUnit },
      searchValues: committedFilter.searchValues,
      comparison: committedFilter.comparison,
      conditions: committedFilter.conditions,
      tenantId: committedFilter.tenantId ?? null,
    },
    queryTrigger,
    queryOptions: { enabled: !isDraft && hasMapping && queryTrigger > 0 },
  });

  if (!hasMapping) {
    return (
      <div className="flex min-h-[80px] flex-col items-start justify-center gap-1 p-2">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 지표 필드를 설정하세요</p>
      </div>
    );
  }

  const fmtMeta = queryResult?.columns?.find((c) => c.name === valueField.fieldName)?.format;
  const row = queryResult?.current?.[0];
  const rawValue = row ? row[valueField.fieldName] : undefined;
  const displayValue = rawValue !== undefined && rawValue !== null ? formatCell(rawValue, fmtMeta, valueField.columnFormat) : '—';

  return (
    <div className="flex h-full flex-col items-start justify-center gap-1 p-2">
      <p className="text-xs text-[var(--color-bt-fg-muted)]">
        {valueField.fieldName} · {valueField.aggFunc ?? 'SUM'}
      </p>
      <p className="font-mono text-3xl font-bold text-[var(--color-bt-fg)]">{isDraft || isFetching ? '—' : displayValue}</p>
      {queryResult?.compare?.[0] && (
        <p className="text-xs text-[var(--color-bt-fg-muted)]">비교: {formatCell(queryResult.compare[0][valueField.fieldName] ?? 0, fmtMeta, valueField.columnFormat)}</p>
      )}
    </div>
  );
}
