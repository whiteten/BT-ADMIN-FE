import type { EChartsOption } from 'echarts';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '../constants/dashboardConstants';
import type { SlotRetryDistTopItem } from '../types/dashboard.types';
import NoData from '@/components/custom/NoData';

const createChartOption = (data: SlotRetryDistTopItem[]): EChartsOption => {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      appendTo: 'body',
      formatter: (params) => {
        const list = params as CallbackDataParams[];
        const item = data[list[0].dataIndex];
        const title = `<strong>${item.serviceName} &gt; ${item.slotName}</strong>`;
        const lines = list.map((p) => `${p.marker} ${p.seriesName}: ${p.value}%`);
        return `${title}<br/>진입: ${item.entryCnt}건 / 완료: ${item.completeCnt}건<br/>${lines.join('<br/>')}`;
      },
    },
    legend: { data: ['3회 이상', '2회', '1회 이하'], right: 10, top: 5, icon: 'roundRect', selectedMode: false },
    grid: { left: 20, right: 50, bottom: 20, top: 30, containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      interval: 25,
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
      data: data.map((item) => item.slotName),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12, width: 100, overflow: 'truncate' },
    },
    series: [
      {
        name: '3회 이상',
        type: 'bar',
        stack: 'total',
        data: data.map((item) => ({
          value: item.threeOrMoreCompleteRate,
          itemStyle: {
            borderRadius: item.twoTimeCompleteRate === 0 && item.oneTimeCompleteRate === 0 ? [0, 4, 4, 0] : undefined,
          },
        })),
        itemStyle: { color: CHART_COLORS.danger },
        barWidth: '60%',
      },
      {
        name: '2회',
        type: 'bar',
        stack: 'total',
        data: data.map((item) => ({
          value: item.twoTimeCompleteRate,
          itemStyle: {
            borderRadius: item.oneTimeCompleteRate === 0 ? [0, 4, 4, 0] : undefined,
          },
        })),
        itemStyle: { color: '#FB923C' },
      },
      {
        name: '1회 이하',
        type: 'bar',
        stack: 'total',
        data: data.map((item) => ({
          value: item.oneTimeCompleteRate,
          itemStyle: {
            borderRadius: item.oneTimeCompleteRate > 0 ? [0, 4, 4, 0] : undefined,
          },
        })),
        itemStyle: { color: CHART_COLORS.success },
      },
    ],
  };
};

interface SlotRetryDistTopBarChartProps {
  data?: SlotRetryDistTopItem[];
}

export default function SlotRetryDistTopBarChart({ data }: SlotRetryDistTopBarChartProps) {
  if (!data?.length) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  return <ReactECharts option={createChartOption(data)} notMerge style={{ height: '100%', width: '100%' }} />;
}
