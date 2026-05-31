import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { BarChartOptions, PanelDetail } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';

interface PanelBarChartProps {
  panel: PanelDetail;
  reportId: number;
}

const CHART_COLORS = ['#085fb5', '#0a8a4a', '#b76e00', '#7a4e9e', '#c92a2a'];

export default function PanelBarChart({ panel, reportId }: PanelBarChartProps) {
  const { committedFilter, queryTrigger } = useReportViewStore();

  const xField = panel.fieldMap.find((f) => f.slotType === 'X_AXIS');
  const yFields = panel.fieldMap.filter((f) => f.slotType === 'Y_AXIS');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = !!xField && yFields.length > 0;

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

  const options = (panel.chartOptions ?? {}) as BarChartOptions;
  const isHorizontal = options.direction === 'horizontal';
  const showLegend = options.legend ?? yFields.length > 1;
  const showDataLabel = options.dataLabel ?? false;

  if (!hasMapping) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 X축·Y축 필드를 매핑하세요</p>
      </div>
    );
  }

  if (!isDraft && isFetching) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">데이터 조회 중…</p>
      </div>
    );
  }

  const data = (isDraft ? [] : (queryResult?.current ?? [])) as Record<string, unknown>[];

  const ChartComponent = isHorizontal ? (
    <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, bottom: 4, left: 60 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
      <XAxis type="number" tick={{ fontSize: 10 }} />
      <YAxis dataKey={xField.fieldName} type="category" tick={{ fontSize: 10 }} width={56} />
      <Tooltip contentStyle={{ fontSize: 12 }} />
      {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
      {yFields.map((f, i) => (
        <Bar key={f.fieldName} dataKey={f.fieldName} fill={CHART_COLORS[i % CHART_COLORS.length]} label={showDataLabel ? { fontSize: 10 } : false} />
      ))}
    </BarChart>
  ) : (
    <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
      <XAxis dataKey={xField.fieldName} tick={{ fontSize: 10 }} />
      <YAxis tick={{ fontSize: 10 }} />
      <Tooltip contentStyle={{ fontSize: 12 }} />
      {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
      {yFields.map((f, i) => (
        <Bar key={f.fieldName} dataKey={f.fieldName} fill={CHART_COLORS[i % CHART_COLORS.length]} label={showDataLabel ? { fontSize: 10, position: 'top' } : false} />
      ))}
    </BarChart>
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      {ChartComponent}
    </ResponsiveContainer>
  );
}
