import { useMemo } from 'react';
import { fieldMeta, formatValue } from './widgetFormat';
import PanelEChart from '../../../panel/components/chart/PanelEChart';
import {
  PANEL_PALETTE,
  axisLabelStyle,
  baseGrid,
  baseLegend,
  baseTooltip,
  goalMarkLine,
  splitLineStyle,
  verticalGradient,
} from '../../../panel/components/chart/echartsPanelTheme';
import type { BarChartOptions, DatasetDetail } from '../../types';

interface WidgetBarChartProps {
  detail: DatasetDetail;
  x: string;
  y: string[];
  rows: Record<string, unknown>[];
  /** 표시 옵션 — 통계 PanelBarChart 와 동일(방향·누적·라벨·범례·목표선). */
  options?: BarChartOptions;
}

/** 통계 PanelBarChart 패턴 — echarts 막대 차트. */
export default function WidgetBarChart({ detail, x, y, rows, options }: WidgetBarChartProps) {
  const isHorizontal = options?.direction === 'horizontal';
  const isStacked = options?.style === 'stacked';
  const showLegend = options?.legend ?? y.length > 1;
  const showDataLabel = options?.dataLabel ?? false;
  const goalLine = options?.goalLine;

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
    const series = y.map((f, i) => {
      const m = fieldMeta(detail, f);
      const color = PANEL_PALETTE[i % PANEL_PALETTE.length];
      // 누적이면 첫 시리즈만 시작 모서리, 마지막만 끝 모서리. 그 외엔 양끝 둥글게.
      const radius = isStacked ? (i === 0 ? 4 : 0) : 4;
      const borderRadius = isHorizontal ? [0, radius, radius, 0] : [radius, radius, 0, 0];
      return {
        type: 'bar',
        name: m?.displayName ?? f,
        stack: isStacked ? 'total' : undefined,
        barMaxWidth: 36,
        itemStyle: { color: single ? verticalGradient(color) : color, borderRadius },
        label: showDataLabel
          ? {
              show: true,
              position: isHorizontal ? 'right' : 'top',
              fontSize: 10,
              color: '#475467',
              formatter: (p: { value: number }) => formatValue(Number(p.value ?? 0), m?.columnFormat),
            }
          : { show: false },
        tooltip: { valueFormatter: (v: number) => formatValue(v, m?.columnFormat) },
        markLine: goalLine?.enabled && goalLine.value != null && !isHorizontal ? goalMarkLine(goalLine.value) : undefined,
        data: catKeys.map((k) => byKey.get(k)?.[f] ?? 0),
      };
    });
    const catAxis = { type: 'category' as const, data: catKeys, axisLabel: axisLabelStyle, axisTick: { show: false } };
    const valAxis = { type: 'value' as const, axisLabel: axisLabelStyle, splitLine: splitLineStyle };
    return {
      animationDuration: 600,
      color: [...PANEL_PALETTE],
      grid: baseGrid(showLegend),
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...baseTooltip },
      legend: baseLegend(showLegend),
      xAxis: isHorizontal ? valAxis : catAxis,
      yAxis: isHorizontal ? catAxis : valAxis,
      series,
    };
  }, [detail, x, y, rows, isHorizontal, isStacked, showLegend, showDataLabel, goalLine]);

  if (!x || y.length === 0) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-bt-fg-muted)]">X축·Y축을 매핑해주세요.</div>;
  }
  return <PanelEChart option={option} />;
}
