import { Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { PanelDetail } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';

interface PanelRadarChartProps {
  panel: PanelDetail;
  reportId: number;
}

const CHART_COLORS = ['#085fb5', '#0a8a4a', '#b76e00'];

export default function PanelRadarChart({ panel, reportId }: PanelRadarChartProps) {
  const { globalFilter } = useReportViewStore();

  const axisField = panel.fieldMap.find((f) => f.slotType === 'AXIS' || f.slotType === 'X_AXIS');
  const valueFields = panel.fieldMap.filter((f) => f.slotType === 'Y_AXIS' || f.slotType === 'VALUE');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = !!axisField && valueFields.length > 0;

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
      <div className="flex min-h-[160px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 축·값 필드를 매핑하세요</p>
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
      <RadarChart data={data}>
        <PolarGrid stroke="#e4e7ec" />
        <PolarAngleAxis dataKey={axisField.fieldName} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {valueFields.map((f, i) => (
          <Radar
            key={f.fieldName}
            name={f.fieldName}
            dataKey={f.fieldName}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            fillOpacity={0.2}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}
