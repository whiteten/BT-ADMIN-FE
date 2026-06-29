import { useMemo } from 'react';
import { fieldMeta, formatValue } from './widgetFormat';
import PanelEChart from '../../../panel/components/chart/PanelEChart';
import { PANEL_PALETTE, baseLegend, baseTooltip } from '../../../panel/components/chart/echartsPanelTheme';
import type { DatasetDetail } from '../../types';

interface WidgetPieChartProps {
  detail: DatasetDetail;
  dimension: string;
  measure: string;
  donut?: boolean;
  rows: Record<string, unknown>[];
}

/** 통계 PanelPieChart 패턴 — echarts 파이/도넛 차트. */
export default function WidgetPieChart({ detail, dimension, measure, donut, rows }: WidgetPieChartProps) {
  const mMeta = fieldMeta(detail, measure);

  const option = useMemo(() => {
    const byLabel = new Map<string, number>();
    for (const r of rows) {
      const label = String(r[dimension] ?? '');
      if (!label) continue;
      byLabel.set(label, (byLabel.get(label) ?? 0) + Number(r[measure] ?? 0));
    }
    const data = [...byLabel.entries()].map(([name, value], i) => ({ name, value, itemStyle: { color: PANEL_PALETTE[i % PANEL_PALETTE.length] } }));
    const total = data.reduce((s, d) => s + d.value, 0);
    const showLegend = true;
    return {
      animationDuration: 700,
      tooltip: {
        trigger: 'item',
        valueFormatter: (v: number) => formatValue(v, mMeta?.columnFormat),
        ...baseTooltip,
      },
      legend: { ...baseLegend(showLegend), orient: 'horizontal' },
      graphic: donut
        ? [
            {
              type: 'text',
              left: 'center',
              top: '40%',
              style: { text: formatValue(total, mMeta?.columnFormat), fontSize: 20, fontWeight: 700, fill: '#0a0a0b', textAlign: 'center' },
            },
            { type: 'text', left: 'center', top: '52%', style: { text: '합계', fontSize: 11, fill: '#6a6f78', textAlign: 'center' } },
          ]
        : undefined,
      series: [
        {
          type: 'pie',
          radius: donut ? ['52%', '78%'] : ['0%', '78%'],
          center: ['50%', '46%'],
          padAngle: 2,
          itemStyle: { borderColor: '#ffffff', borderWidth: 2, borderRadius: 6 },
          label: { show: true, formatter: (p: { name: string; percent: number }) => `${p.name} ${p.percent.toFixed(1)}%`, fontSize: 11, color: '#475467' },
          labelLine: { length: 10, length2: 8 },
          data,
        },
      ],
    };
  }, [detail, dimension, measure, donut, rows, mMeta?.columnFormat]);

  if (!dimension || !measure) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-bt-fg-muted)]">슬라이스(DIM)·값(MSR)을 매핑해주세요.</div>;
  }
  return <PanelEChart option={option} />;
}
