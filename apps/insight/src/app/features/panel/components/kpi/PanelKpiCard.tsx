import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { PanelDetail } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';

interface PanelKpiCardProps {
  panel: PanelDetail;
  reportId: number;
}

export default function PanelKpiCard({ panel, reportId }: PanelKpiCardProps) {
  const { globalFilter } = useReportViewStore();

  const valueField = panel.fieldMap.find((f) => f.slotType === 'VALUE' || f.slotType === 'Y_AXIS');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = !!valueField;

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

  if (!hasMapping) {
    return (
      <div className="flex min-h-[80px] flex-col items-start justify-center gap-1 p-2">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 지표 필드를 설정하세요</p>
      </div>
    );
  }

  const row = queryResult?.current?.[0];
  const rawValue = row ? row[valueField.fieldName] : undefined;
  const numValue = rawValue !== undefined && rawValue !== null ? Number(rawValue) : null;
  const displayValue = numValue !== null && !isNaN(numValue) ? numValue.toLocaleString('ko-KR') : '—';

  return (
    <div className="flex h-full flex-col items-start justify-center gap-1 p-2">
      <p className="text-xs text-[var(--color-bt-fg-muted)]">
        {valueField.fieldName} · {valueField.aggFunc ?? 'SUM'}
      </p>
      <p className="font-mono text-3xl font-bold text-[var(--color-bt-fg)]">{isDraft || isPending ? '—' : displayValue}</p>
      {queryResult?.compare?.[0] && (
        <p className="text-xs text-[var(--color-bt-fg-muted)]">비교: {Number(queryResult.compare[0][valueField.fieldName] ?? 0).toLocaleString('ko-KR')}</p>
      )}
    </div>
  );
}
