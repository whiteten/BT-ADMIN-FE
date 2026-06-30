import { useMemo } from 'react';
import { fieldMeta, formatValue } from './widgetFormat';
import PanelEChart from '../../../panel/components/chart/PanelEChart';
import { PANEL_PALETTE, areaGradient, axisLabelStyle, baseGrid, baseLegend, baseTooltip, goalMarkLine, splitLineStyle } from '../../../panel/components/chart/echartsPanelTheme';
import type { DatasetDetail, LineChartOptions } from '../../types';

interface WidgetLineChartProps {
  detail: DatasetDetail;
  x: string;
  y: string[];
  rows: Record<string, unknown>[];
  /** 표시 옵션 — 통계 PanelLineChart 와 동일(라벨·범례·평균선·목표선). */
  options?: LineChartOptions;
}

/** 통계 PanelLineChart 패턴 — echarts 선 차트. */
export default function WidgetLineChart({ detail, x, y, rows, options }: WidgetLineChartProps) {
  const showDataLabel = options?.dataLabel ?? false;
  const goalLine = options?.goalLine;
  const avgLine = options?.avgLine ?? false;
  const showLegend = options?.legend ?? y.length > 1;

  const option = useMemo(() => {
    const catKeys = [...new Set(rows.map((r) => String(r[x] ?? '')))];
    const byKey = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const k = String(r[x] ?? '');
      const cur = byKey.get(k) ?? {};
      for (const f of y) cur[f] = (cur[f] ?? 0) + Number(r[f] ?? 0);
      byKey.set(k, cur);
    }
    const single = y.length === 1;
    const series: Record<string, unknown>[] = y.map((f, i) => {
      const m = fieldMeta(detail, f);
      const color = PANEL_PALETTE[i % PANEL_PALETTE.length];
      return {
        type: 'line',
        name: m?.displayName ?? f,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.5, color },
        itemStyle: { color },
        areaStyle: single ? { color: areaGradient(color) } : undefined,
        label: showDataLabel
          ? { show: true, position: 'top', fontSize: 10, color: '#475467', formatter: (p: { value: number }) => formatValue(Number(p.value ?? 0), m?.columnFormat) }
          : { show: false },
        tooltip: { valueFormatter: (v: number) => formatValue(v, m?.columnFormat) },
        markLine: goalLine?.enabled && goalLine.value != null ? goalMarkLine(goalLine.value) : undefined,
        data: catKeys.map((k) => byKey.get(k)?.[f] ?? 0),
      };
    });

    // 범례에 표시할 이름 — 측정 라인만. 평균 라인은 범례 제외(통계 동일).
    const legendNames = series.map((s) => String(s.name));

    // 평균 라인: 표시된 라인들의 구간별 평균을 별도 라인 하나로(핫핑크).
    if (avgLine && series.length > 0) {
      const n = series.length;
      const firstMeta = y[0] ? fieldMeta(detail, y[0]) : undefined;
      const avgValues = catKeys.map((_, idx) => {
        let sum = 0;
        for (const s of series) sum += Number((s.data as number[])[idx] ?? 0);
        return sum / n;
      });
      series.push({
        type: 'line',
        name: '평균',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.5, color: '#ec4899' },
        itemStyle: { color: '#ec4899' },
        areaStyle: undefined,
        label: { show: false },
        tooltip: { valueFormatter: (v: number) => formatValue(v, firstMeta?.columnFormat) },
        markLine: undefined,
        data: avgValues,
      });
    }

    return {
      animationDuration: 600,
      color: [...PANEL_PALETTE],
      grid: baseGrid(showLegend),
      tooltip: { trigger: 'axis', ...baseTooltip },
      legend: { ...baseLegend(showLegend), data: legendNames },
      xAxis: { type: 'category', boundaryGap: false, data: catKeys, axisLabel: axisLabelStyle, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: axisLabelStyle, splitLine: splitLineStyle },
      series,
    };
  }, [detail, x, y, rows, showDataLabel, goalLine, avgLine, showLegend]);

  if (!x || y.length === 0) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-bt-fg-muted)]">X축·Y축을 매핑해주세요.</div>;
  }
  return <PanelEChart option={option} />;
}
