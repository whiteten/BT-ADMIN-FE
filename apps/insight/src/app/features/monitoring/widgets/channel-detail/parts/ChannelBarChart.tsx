import { useMemo } from 'react';
import { CHANNEL_STATUS, CHANNEL_STATUS_ORDER } from '../statusMap';
import AutoResizeECharts from './AutoResizeECharts';

/**
 * 상태 분포 막대(AS-IS barchart) — CHNL_STATUS 별 채널수. 레전드로 숨긴 상태는 dim.
 */
export interface ChannelBarChartProps {
  counts: Record<number, number>;
  total: number;
  hidden: Set<number>;
}

export default function ChannelBarChart({ counts, total, hidden }: ChannelBarChartProps) {
  const option = useMemo(() => {
    // ECharts category yAxis 는 아래→위 순이라, 초기를 맨 위로 두기 위해 역순 배치.
    const order = [...CHANNEL_STATUS_ORDER].reverse();
    const labels = order.map((c) => CHANNEL_STATUS[c].label);
    const data = order.map((c) => ({
      value: counts[c] ?? 0,
      itemStyle: { color: CHANNEL_STATUS[c].hex, opacity: hidden.has(c) ? 0.25 : 1, borderRadius: [0, 3, 3, 0] },
    }));
    return {
      grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number }) => `${p.name} <b>${p.value}</b>${total > 0 ? ` · ${Math.round((p.value / total) * 100)}%` : ''}`,
      },
      xAxis: { type: 'value', max: total || undefined, splitLine: { lineStyle: { color: '#eef1f6' } }, axisLabel: { color: '#9aa0a8', fontSize: 10 } },
      yAxis: {
        type: 'category',
        data: labels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e4e7ec' } },
        axisLabel: { color: '#6a6f78', fontSize: 11, fontWeight: 600 },
      },
      series: [
        {
          type: 'bar',
          data,
          barWidth: '62%',
          label: {
            show: true,
            position: 'right',
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: '#0a0a0b',
            formatter: (p: { value: number }) => (total > 0 ? `${p.value}  ${Math.round((p.value / total) * 100)}%` : `${p.value}`),
          },
        },
      ],
    };
  }, [counts, total, hidden]);

  return <AutoResizeECharts option={option} />;
}
