import { useMemo } from 'react';
import { fieldMeta, formatValue } from './widgetFormat';
import PanelEChart from '../../../panel/components/chart/PanelEChart';
import { PANEL_PALETTE, areaGradient, axisLabelStyle, baseGrid, baseLegend, baseTooltip, splitLineStyle } from '../../../panel/components/chart/echartsPanelTheme';
import type { DatasetDetail } from '../../types';

interface WidgetLineChartProps {
  detail: DatasetDetail;
  x: string;
  y: string[];
  rows: Record<string, unknown>[];
}

/** 통계 PanelLineChart 패턴 — echarts 선 차트. */
export default function WidgetLineChart({ detail, x, y, rows }: WidgetLineChartProps) {
  const option = useMemo(() => {
    const catKeys = [...new Set(rows.map((r) => String(r[x] ?? '')))];
    const byKey = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const k = String(r[x] ?? '');
      const cur = byKey.get(k) ?? {};
      for (const f of y) cur[f] = (cur[f] ?? 0) + Number(r[f] ?? 0);
      byKey.set(k, cur);
    }
    const showLegend = y.length > 1;
    const series = y.map((f, i) => {
      const m = fieldMeta(detail, f);
      const color = PANEL_PALETTE[i % PANEL_PALETTE.length];
      return {
        type: 'line',
        name: m?.displayName ?? f,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.5, color },
        itemStyle: { color },
        areaStyle: y.length === 1 ? { color: areaGradient(color) } : undefined,
        tooltip: { valueFormatter: (v: number) => formatValue(v, m?.columnFormat) },
        data: catKeys.map((k) => byKey.get(k)?.[f] ?? 0),
      };
    });
    return {
      animationDuration: 600,
      color: [...PANEL_PALETTE],
      grid: baseGrid(showLegend),
      tooltip: { trigger: 'axis', ...baseTooltip },
      legend: baseLegend(showLegend),
      xAxis: { type: 'category', boundaryGap: false, data: catKeys, axisLabel: axisLabelStyle, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: axisLabelStyle, splitLine: splitLineStyle },
      series,
    };
  }, [detail, x, y, rows]);

  if (!x || y.length === 0) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-bt-fg-muted)]">X축·Y축을 매핑해주세요.</div>;
  }
  return <PanelEChart option={option} />;
}
