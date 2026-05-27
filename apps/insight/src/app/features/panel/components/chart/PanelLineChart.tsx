import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { LineChartOptions, PanelDetail } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';

interface PanelLineChartProps {
  panel: PanelDetail;
  reportId: number;
}

const CHART_COLORS = ['#085fb5', '#0a8a4a', '#b76e00', '#7a4e9e', '#c92a2a'];

export default function PanelLineChart({ panel, reportId }: PanelLineChartProps) {
  const { globalFilter } = useReportViewStore();

  const xField = panel.fieldMap.find((f) => f.slotType === 'X_AXIS');
  const yFields = panel.fieldMap.filter((f) => f.slotType === 'Y_AXIS');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = !!xField && yFields.length > 0;

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

  const options = (panel.chartOptions ?? {}) as LineChartOptions;
  const showLegend = options.legend ?? yFields.length > 1;
  const showDataLabel = options.dataLabel ?? false;

  if (!hasMapping) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 X축·Y축 필드를 매핑하세요</p>
      </div>
    );
  }

  if (!isDraft && isPending) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">데이터 조회 중…</p>
      </div>
    );
  }

  const data = (isDraft ? [] : (queryResult?.current ?? [])) as Record<string, unknown>[];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
        <XAxis dataKey={xField.fieldName} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {yFields.map((f, i) => (
          <Line
            key={f.fieldName}
            type="monotone"
            dataKey={f.fieldName}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            dot={false}
            label={showDataLabel ? { fontSize: 9 } : false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
