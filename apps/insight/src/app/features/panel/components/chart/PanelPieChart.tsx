import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { PanelDetail, PieChartOptions } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';

interface PanelPieChartProps {
  panel: PanelDetail;
  reportId: number;
}

const CHART_COLORS = ['#085fb5', '#0a8a4a', '#b76e00', '#7a4e9e', '#c92a2a', '#85898f'];

export default function PanelPieChart({ panel, reportId }: PanelPieChartProps) {
  const { committedFilter, queryTrigger } = useReportViewStore();

  const sliceField = panel.fieldMap.find((f) => f.slotType === 'SLICE');
  const valueField = panel.fieldMap.find((f) => f.slotType === 'VALUE' || f.slotType === 'Y_AXIS');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = !!sliceField && !!valueField;

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

  const options = (panel.chartOptions ?? {}) as PieChartOptions;
  const isDonut = options.donut ?? true;
  const showLegend = options.legend ?? true;

  if (!hasMapping) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 슬라이스·값 필드를 매핑하세요</p>
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

  const raw = (isDraft ? [] : (queryResult?.current ?? [])) as Record<string, unknown>[];
  const data = raw.map((row) => ({
    name: String(row[sliceField.fieldName] ?? ''),
    value: Number(row[valueField.fieldName] ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={160}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={isDonut ? 40 : 0}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => v.toLocaleString('ko-KR')} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
      </PieChart>
    </ResponsiveContainer>
  );
}
