import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from './chartStyles';
import type { SlotSummary } from '../types/dashboard.types';

const createChartOption = (data: SlotSummary): EChartsOption => {
  const seriesData = [
    { name: '완결', value: data.completeCnt, rate: data.completeRate, diff: data.completeRateDiff },
    { name: '미완결', value: data.incompleteCnt, rate: data.incompleteRate, diff: data.incompleteRateDiff },
  ];

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const { name, value } = params as { name: string; value: number };
        const item = seriesData.find((d) => d.name === name);
        return `${name}: ${value} (${item?.rate ?? 0}%)`;
      },
    },
    legend: {
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      itemGap: 13,
      icon: 'roundRect',
      selectedMode: false,
      formatter: (name: string) => {
        const item = seriesData.find((d) => d.name === name);
        if (!item) return name;
        const diff = item.diff;
        if (diff === 0) {
          return `{name|${name}}  {rate|${item.rate}%} {zero|- 0%}`;
        }
        const arrow = diff > 0 ? '▲' : '▼';
        const diffStyle = diff > 0 ? 'up' : 'down';
        return `{name|${name}}  {rate|${item.rate}%} {${diffStyle}|${arrow} ${Math.abs(diff)}%}`;
      },
      textStyle: {
        rich: {
          name: { fontSize: 14, color: '#333', width: 75 },
          rate: { fontSize: 14, fontWeight: 'bold', color: '#333', width: 50 },
          up: { fontSize: 13, color: '#10B981' },
          down: { fontSize: 13, color: '#F06548' },
          zero: { fontSize: 13, color: '#999' },
        },
      },
    },
    color: [CHART_COLORS.success, CHART_COLORS.danger],
    series: [
      {
        type: 'pie',
        radius: ['30%', '60%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          formatter: (params: { name: string }) => {
            const item = seriesData.find((d) => d.name === params.name);
            return `${item?.rate ?? 0}%`;
          },
        },
        emphasis: {
          label: {
            show: true,
            fontWeight: 'bold',
          },
        },
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        data: seriesData,
      },
    ],
  };
};

interface SlotSummaryPieChartProps {
  data?: SlotSummary;
}

export default function SlotSummaryPieChart({ data }: SlotSummaryPieChartProps) {
  if (!data) return null;
  return <ReactECharts option={createChartOption(data)} style={{ height: '100%', width: '100%' }} />;
}
