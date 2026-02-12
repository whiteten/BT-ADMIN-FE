import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { getGradientColor } from './chartStyles';
import type { SlotRetryAvgTopItem } from '../types/dashboard.types';

const createChartOption = (data: SlotRetryAvgTopItem[]): EChartsOption => {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 20, right: 50, bottom: 20, top: 20, containLabel: true },
    xAxis: {
      type: 'value',
      splitNumber: 4,
      axisLine: { lineStyle: { color: '#E9EBEC' } },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
      name: '(회)',
      nameLocation: 'end',
      nameTextStyle: { color: '#495057', fontSize: 12 },
      splitLine: {
        lineStyle: { type: 'dashed' as const, color: '#E9EBEC' },
      },
    },
    yAxis: {
      type: 'category',
      data: data.map((item) => item.slotName),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: data.map((item) => item.avgRetryCount),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: getGradientColor },
        barWidth: '60%',
        label: { show: true, position: 'right', formatter: '{c}', color: '#495057', fontSize: 11 },
      },
    ],
  };
};

interface SlotRetryAvgTopBarChartProps {
  data?: SlotRetryAvgTopItem[];
}

export default function SlotRetryAvgTopBarChart({ data }: SlotRetryAvgTopBarChartProps) {
  if (!data?.length) return null;
  return <ReactECharts option={createChartOption(data)} style={{ height: '100%', width: '100%' }} />;
}
