import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PANEL_PALETTE, axisLabelStyle, baseGrid, baseLegend, baseTooltip, goalMarkLine, koNum, paletteAt, splitLineStyle, verticalGradient } from './echartsPanelTheme';
import { useGetDataSourceFields } from '../../../dataset/hooks/useDatasetQueries';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { BarChartOptions, PanelDetail } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';

interface PanelBarChartProps {
  panel: PanelDetail;
  reportId: number;
}

export default function PanelBarChart({ panel, reportId }: PanelBarChartProps) {
  const { committedFilter, queryTrigger } = useReportViewStore();

  // 데이터셋 표시명 — 범례/툴팁 라벨을 fieldName 대신 displayName 으로 (패널별 데이터셋)
  const { data: fields = [] } = useGetDataSourceFields({
    params: { datasetId: panel.datasetId ?? 0 },
    queryOptions: { enabled: !!panel.datasetId },
  });
  const displayNameMap = useMemo(() => new Map(fields.map((f) => [f.fieldName, f.displayName])), [fields]);

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
  const isStacked = options.style === 'stacked';
  const showLegend = options.legend ?? yFields.length > 1;
  const showDataLabel = options.dataLabel ?? false;
  const goalLine = options.goalLine;

  const option = useMemo(() => {
    if (!xField) return {};
    const dn = (name: string) => displayNameMap.get(name) ?? name;
    const data = (isDraft ? [] : (queryResult?.current ?? [])) as Record<string, unknown>[];
    const categories = data.map((row) => String(row[xField.fieldName] ?? ''));
    const single = yFields.length === 1;

    const series = yFields.map((f, i) => {
      const color = paletteAt(i);
      // 둥근 막대 — 누적이면 첫 시리즈만 시작 모서리, 마지막만 끝 모서리. 그 외엔 양끝 둥글게.
      const radius = isStacked ? (i === 0 ? 4 : 0) : 4;
      const borderRadius = isHorizontal ? [0, radius, radius, 0] : [radius, radius, 0, 0];
      return {
        type: 'bar',
        name: dn(f.fieldName),
        stack: isStacked ? 'total' : undefined,
        barMaxWidth: 36,
        barGap: '12%',
        itemStyle: { color: single ? verticalGradient(color) : color, borderRadius },
        emphasis: { focus: 'series', itemStyle: { shadowBlur: 10, shadowColor: `${color}66` } },
        label: showDataLabel
          ? { show: true, position: isHorizontal ? 'right' : 'top', fontSize: 10, color: '#475467', formatter: (p: { value: number }) => koNum(Number(p.value ?? 0)) }
          : { show: false },
        markLine: goalLine?.enabled && goalLine.value != null && !isHorizontal ? goalMarkLine(goalLine.value) : undefined,
        data: data.map((row) => Number(row[f.fieldName] ?? 0)),
      };
    });

    const catAxis = {
      type: 'category' as const,
      data: categories,
      axisLabel: axisLabelStyle,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e4e7ec' } },
    };
    const valAxis = { type: 'value' as const, axisLabel: axisLabelStyle, splitLine: splitLineStyle };

    return {
      animationDuration: 600,
      animationEasing: 'cubicOut',
      color: [...PANEL_PALETTE],
      grid: baseGrid(showLegend),
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...baseTooltip },
      legend: baseLegend(showLegend),
      xAxis: isHorizontal ? valAxis : catAxis,
      yAxis: isHorizontal ? catAxis : valAxis,
      series,
    };
  }, [xField, yFields, isDraft, queryResult, isHorizontal, isStacked, showLegend, showDataLabel, goalLine, displayNameMap]);

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

  return <ReactECharts option={option} style={{ height: '100%', width: '100%', minHeight: 160 }} notMerge lazyUpdate />;
}
