import { useMemo } from 'react';
import { fieldMeta, formatValue } from './widgetFormat';
import PanelEChart from '../../../panel/components/chart/PanelEChart';
import { FONT_FAMILY, PANEL_PALETTE, baseLegend, baseTooltip } from '../../../panel/components/chart/echartsPanelTheme';
import type { DatasetDetail, PieChartOptions } from '../../types';

interface WidgetPieChartProps {
  detail: DatasetDetail;
  dimension: string;
  measure: string;
  donut?: boolean;
  rows: Record<string, unknown>[];
  /** 표시 옵션 — 통계 PanelPieChart 와 동일(라벨타입·가운데합계·범례). */
  options?: PieChartOptions;
}

/** 통계 PanelPieChart 패턴 — echarts 파이/도넛 차트. */
export default function WidgetPieChart({ detail, dimension, measure, donut, rows, options }: WidgetPieChartProps) {
  const mMeta = fieldMeta(detail, measure);
  const showLegend = options?.legend ?? true;
  const labelType = options?.labelType ?? 'percent';
  const showCenterTotal = !!donut && (options?.centerTotal ?? true);

  const option = useMemo(() => {
    const byLabel = new Map<string, number>();
    for (const r of rows) {
      const label = String(r[dimension] ?? '');
      if (!label) continue;
      byLabel.set(label, (byLabel.get(label) ?? 0) + Number(r[measure] ?? 0));
    }
    const data = [...byLabel.entries()].map(([name, value], i) => ({ name, value, itemStyle: { color: PANEL_PALETTE[i % PANEL_PALETTE.length] } }));
    const total = data.reduce((s, d) => s + d.value, 0);

    const fmt = (v: number) => formatValue(v, mMeta?.columnFormat);
    const labelFormatter = (p: { name: string; value: number; percent: number }) => {
      if (labelType === 'name') return p.name;
      if (labelType === 'value') return fmt(p.value);
      return `${p.name} ${p.percent.toFixed(1)}%`;
    };

    return {
      animationDuration: 700,
      tooltip: {
        trigger: 'item',
        valueFormatter: (v: number) => fmt(v),
        ...baseTooltip,
      },
      legend: { ...baseLegend(showLegend), orient: 'horizontal' },
      graphic: showCenterTotal
        ? [
            {
              type: 'text',
              left: 'center',
              top: '40%',
              style: { text: fmt(total), fontSize: 20, fontWeight: 700, fill: '#0a0a0b', fontFamily: FONT_FAMILY, textAlign: 'center' },
            },
            { type: 'text', left: 'center', top: '52%', style: { text: '합계', fontSize: 11, fill: '#6a6f78', fontFamily: FONT_FAMILY, textAlign: 'center' } },
          ]
        : undefined,
      series: [
        {
          type: 'pie',
          radius: donut ? ['52%', '78%'] : ['0%', '78%'],
          center: ['50%', '46%'],
          padAngle: 2,
          itemStyle: { borderColor: '#ffffff', borderWidth: 2, borderRadius: 6 },
          label: { show: true, formatter: labelFormatter, fontSize: 11, color: '#475467', fontFamily: FONT_FAMILY },
          labelLine: { length: 10, length2: 8 },
          data,
        },
      ],
    };
  }, [dimension, measure, donut, rows, mMeta?.columnFormat, showLegend, labelType, showCenterTotal]);

  if (!dimension || !measure) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-bt-fg-muted)]">슬라이스(DIM)·값(MSR)을 매핑해주세요.</div>;
  }
  return <PanelEChart option={option} />;
}
