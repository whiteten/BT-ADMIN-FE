import { useMemo } from 'react';
import PanelEChart from './PanelEChart';
import { PANEL_PALETTE, areaGradient, axisLabelStyle, baseGrid, baseLegend, baseTooltip, goalMarkLine, koNum, paletteAt, splitLineStyle } from './echartsPanelTheme';
import { formatTimeKey } from '../../../../utils/timeKeyFormat';
import { useGetDataSourceFields } from '../../../dataset/hooks/useDatasetQueries';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { LineChartOptions, PanelDetail } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';

interface PanelLineChartProps {
  panel: PanelDetail;
  reportId: number;
}

export default function PanelLineChart({ panel, reportId }: PanelLineChartProps) {
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

  const options = (panel.chartOptions ?? {}) as LineChartOptions;
  const showLegend = options.legend ?? yFields.length > 1;
  const showDataLabel = options.dataLabel ?? false;
  const goalLine = options.goalLine;

  const option = useMemo(() => {
    if (!xField) return {};
    const dn = (name: string) => displayNameMap.get(name) ?? name;
    const data = (isDraft ? [] : (queryResult?.current ?? [])) as Record<string, unknown>[];
    const categories = data.map((row) => formatTimeKey(row[xField.fieldName]));
    const single = yFields.length === 1;

    const series = yFields.map((f, i) => {
      const color = paletteAt(i);
      return {
        type: 'line',
        name: dn(f.fieldName),
        smooth: true,
        showSymbol: false,
        symbolSize: 7,
        lineStyle: { width: 2.5, color },
        itemStyle: { color },
        // 단일 시리즈일 때만 하단 면적 채움(다중이면 겹쳐서 지저분)
        areaStyle: single ? { color: areaGradient(color) } : undefined,
        emphasis: { focus: 'series' },
        label: showDataLabel ? { show: true, position: 'top', fontSize: 10, color: '#475467', formatter: (p: { value: number }) => koNum(Number(p.value ?? 0)) } : { show: false },
        markLine: goalLine?.enabled && goalLine.value != null ? goalMarkLine(goalLine.value) : undefined,
        data: data.map((row) => Number(row[f.fieldName] ?? 0)),
      };
    });

    return {
      animationDuration: 600,
      animationEasing: 'cubicOut',
      color: [...PANEL_PALETTE],
      grid: baseGrid(showLegend),
      tooltip: { trigger: 'axis', ...baseTooltip },
      legend: baseLegend(showLegend),
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: categories,
        axisLabel: axisLabelStyle,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e4e7ec' } },
      },
      yAxis: { type: 'value', axisLabel: axisLabelStyle, splitLine: splitLineStyle },
      series,
    };
  }, [xField, yFields, isDraft, queryResult, showLegend, showDataLabel, goalLine, displayNameMap]);

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

  return <PanelEChart option={option} />;
}
