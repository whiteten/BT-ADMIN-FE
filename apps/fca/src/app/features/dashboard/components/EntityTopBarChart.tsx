import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { getGradientColor } from './chartStyles';
import type { EntityTopItem } from '../types/dashboard.types';

const createChartOption = (data: EntityTopItem[]): EChartsOption => {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 20, right: 50, bottom: 20, top: 20, containLabel: true },
    xAxis: {
      type: 'value',
      splitNumber: 4,
      axisLine: { lineStyle: { color: '#E9EBEC' } },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
      name: '(건)',
      nameLocation: 'end',
      nameTextStyle: { color: '#495057', fontSize: 12 },
      splitLine: {
        lineStyle: { type: 'dashed' as const, color: '#E9EBEC' },
      },
    },
    yAxis: {
      type: 'category',
      data: data.map((item) => item.entityTag),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: data.map((item) => item.detectCnt),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: getGradientColor },
        barWidth: '60%',
        label: { show: true, position: 'right', formatter: '{c}', color: '#495057', fontSize: 11 },
      },
    ],
  };
};

interface EntityTopBarChartProps {
  data?: EntityTopItem[];
}

export default function EntityTopBarChart({ data }: EntityTopBarChartProps) {
  if (!data?.length) return null;
  return <ReactECharts option={createChartOption(data)} style={{ height: '100%', width: '100%' }} />;
}
