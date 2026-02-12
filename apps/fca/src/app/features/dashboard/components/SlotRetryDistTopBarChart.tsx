import type { EChartsOption } from 'echarts';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from './chartStyles';
import type { SlotRetryDistTopItem } from '../types/dashboard.types';

const createChartOption = (data: SlotRetryDistTopItem[]): EChartsOption => {
  const sorted = [...data].filter((item) => item.rank >= 1 && item.rank <= 10).sort((a, b) => a.rank - b.rank);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const list = params as CallbackDataParams[];
        const item = sorted[list[0].dataIndex];
        const title = `${item.serviceName} > ${item.dialogName} > ${item.slotName}`;
        const lines = list.map((p) => `${p.marker} ${p.seriesName}: ${p.value}%`);
        return `${title}<br/>${lines.join('<br/>')}`;
      },
    },
    legend: { data: ['1회 이하', '2회', '3회 이상'], right: 10, top: 5, icon: 'roundRect', selectedMode: false },
    grid: { left: 20, right: 50, bottom: 20, top: 30, containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLine: { lineStyle: { color: '#E9EBEC' } },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
      name: '(%)',
      nameLocation: 'end',
      nameTextStyle: { color: '#495057', fontSize: 12 },
      splitLine: {
        lineStyle: { type: 'dashed' as const, color: '#E9EBEC' },
      },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((item) => item.slotName),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
    },
    series: [
      {
        name: '1회 이하',
        type: 'bar',
        stack: 'total',
        data: sorted.map((item) => item.oneTimeCompleteRate),
        itemStyle: { color: CHART_COLORS.success },
        barWidth: '60%',
      },
      {
        name: '2회',
        type: 'bar',
        stack: 'total',
        data: sorted.map((item) => item.twoTimeCompleteRate),
        itemStyle: { color: '#FB923C' },
      },
      {
        name: '3회 이상',
        type: 'bar',
        stack: 'total',
        data: sorted.map((item) => item.threeOrMoreCompleteRate),
        itemStyle: { color: CHART_COLORS.danger, borderRadius: [0, 4, 4, 0] },
      },
    ],
  };
};

interface SlotRetryDistTopBarChartProps {
  data?: SlotRetryDistTopItem[];
}

export default function SlotRetryDistTopBarChart({ data }: SlotRetryDistTopBarChartProps) {
  if (!data?.length) return null;
  return <ReactECharts option={createChartOption(data)} notMerge style={{ height: '100%', width: '100%' }} />;
}
