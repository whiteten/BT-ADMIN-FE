import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { IntentTopItem } from '../types/dashboard.types';
import { getGradientColor } from '../utils/dashboardUtils';
import NoData from '@/components/custom/NoData';

const createChartOption = (data: IntentTopItem[]): EChartsOption => {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendTo: 'body' },
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
      data: data.map((item) => item.intent),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12, width: 100, overflow: 'truncate' },
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

interface IntentTopBarChartProps {
  data?: IntentTopItem[];
}

export default function IntentTopBarChart({ data }: IntentTopBarChartProps) {
  if (!data?.length) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  return <ReactECharts option={createChartOption(data)} notMerge style={{ height: '100%', width: '100%' }} />;
}
