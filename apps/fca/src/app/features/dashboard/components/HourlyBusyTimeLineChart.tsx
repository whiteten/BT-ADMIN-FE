import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { HourlyBusyTimeItem } from '../types/dashboard.types';
import NoData from '@/components/custom/NoData';

const createChartOption = (data: HourlyBusyTimeItem[]): EChartsOption => ({
  tooltip: { trigger: 'axis' },
  legend: { type: 'scroll', data: data.map((item) => item.serviceName), bottom: 15, padding: [0, 40, 0, 40], icon: 'roundRect' },
  grid: { left: 20, right: 50, bottom: 50, top: 40, containLabel: true },
  xAxis: {
    type: 'category',
    data: data[0]?.hourlyStats.map((stat) => `${stat.hour}시`) ?? [],
    axisLine: { lineStyle: { color: '#E9EBEC' } },
    axisTick: { show: false },
    axisLabel: { color: '#495057', fontSize: 12 },
    boundaryGap: true,
    offset: 10,
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#495057', fontSize: 12, formatter: '{value}초' },
    splitLine: { lineStyle: { type: 'dashed' as const, color: '#E9EBEC' } },
    name: '(초)',
    nameLocation: 'end',
    nameTextStyle: { color: '#495057', fontSize: 12 },
  },
  series: data.map((item) => ({
    name: item.serviceName,
    type: 'line' as const,
    data: item.hourlyStats.map((stat) => stat.sumBusyTime),
    itemStyle: { borderRadius: 4 },
    lineStyle: { width: 2 },
  })),
});

interface HourlyBusyTimeLineChartProps {
  data?: HourlyBusyTimeItem[];
}

export default function HourlyBusyTimeLineChart({ data }: HourlyBusyTimeLineChartProps) {
  if (!data?.length) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  return <ReactECharts option={createChartOption(data)} notMerge style={{ height: '100%', width: '100%' }} />;
}
