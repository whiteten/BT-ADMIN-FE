import { useMemo } from 'react';
import PanelEChart from './PanelEChart';
import { FONT_FAMILY, PANEL_PALETTE, baseLegend, baseTooltip, koNum, paletteAt } from './echartsPanelTheme';
import { useGetDataSourceFields } from '../../../dataset/hooks/useDatasetQueries';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { PanelDetail, RadarChartOptions } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';

interface PanelRadarChartProps {
  panel: PanelDetail;
  reportId: number;
}

export default function PanelRadarChart({ panel, reportId }: PanelRadarChartProps) {
  const { committedFilter, queryTrigger } = useReportViewStore();

  const { data: fields = [] } = useGetDataSourceFields({
    params: { datasetId: panel.datasetId ?? 0 },
    queryOptions: { enabled: !!panel.datasetId },
  });
  const displayNameMap = useMemo(() => new Map(fields.map((f) => [f.fieldName, f.displayName])), [fields]);

  const axisField = panel.fieldMap.find((f) => f.slotType === 'AXIS' || f.slotType === 'X_AXIS');
  const valueFields = panel.fieldMap.filter((f) => f.slotType === 'Y_AXIS' || f.slotType === 'VALUE');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = !!axisField && valueFields.length > 0;

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

  const options = (panel.chartOptions ?? {}) as RadarChartOptions;
  const showLegend = options.legend ?? valueFields.length > 1;
  const showDataLabel = options.dataLabel ?? false;

  const option = useMemo(() => {
    if (!axisField) return {};
    const dn = (name: string) => displayNameMap.get(name) ?? name;
    const rows = (isDraft ? [] : (queryResult?.current ?? [])) as Record<string, unknown>[];

    // 각 row = 레이더 축(indicator). 축별 max = 모든 값 필드 중 최댓값 + 15% 여유.
    const indicator = rows.map((row) => {
      const max = Math.max(1, ...valueFields.map((f) => Number(row[f.fieldName] ?? 0)));
      return { name: String(row[axisField.fieldName] ?? ''), max: Math.ceil(max * 1.15) };
    });

    const series = {
      type: 'radar',
      symbolSize: 4,
      emphasis: { focus: 'series', lineStyle: { width: 3 } },
      label: showDataLabel ? { show: true, fontSize: 9, color: '#475467', formatter: (p: { value: number }) => koNum(Number(p.value ?? 0)) } : { show: false },
      data: valueFields.map((f, i) => {
        const color = paletteAt(i);
        return {
          name: dn(f.fieldName),
          value: rows.map((row) => Number(row[f.fieldName] ?? 0)),
          lineStyle: { color, width: 2 },
          itemStyle: { color },
          areaStyle: { color: `${color}26` },
        };
      }),
    };

    return {
      animationDuration: 700,
      animationEasing: 'cubicOut',
      color: [...PANEL_PALETTE],
      tooltip: { trigger: 'item', ...baseTooltip },
      legend: baseLegend(showLegend),
      radar: {
        indicator: indicator.length > 0 ? indicator : [{ name: '', max: 1 }],
        center: ['50%', showLegend ? '48%' : '52%'],
        radius: '66%',
        splitNumber: 4,
        axisName: { color: '#475467', fontSize: 11, fontFamily: FONT_FAMILY },
        splitLine: { lineStyle: { color: '#e5e7eb' } },
        splitArea: { areaStyle: { color: ['rgba(248,250,252,0.6)', 'rgba(255,255,255,0)'] } },
        axisLine: { lineStyle: { color: '#d1d5db' } },
      },
      series: [series],
    };
  }, [axisField, valueFields, isDraft, queryResult, showLegend, showDataLabel, displayNameMap]);

  if (!hasMapping) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 축·값 필드를 매핑하세요</p>
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
