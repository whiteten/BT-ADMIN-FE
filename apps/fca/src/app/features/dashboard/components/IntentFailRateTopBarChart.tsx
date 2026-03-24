import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { IntentFailRateTopItem } from '../types/dashboard.types';
import { getGradientColor } from '../utils/dashboardUtils';
import NoData from '@/components/custom/NoData';

const createChartOption = (data: IntentFailRateTopItem[]): EChartsOption => {
  const dataMax = Math.max(...data.map((item) => item.failRate));
  const axisMax = Math.min(Math.ceil(dataMax / 20) * 20, 100);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      appendTo: 'body',
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params];
        const first = list[0] as { dataIndex: number; marker: string };
        if (first?.dataIndex == null) return '';
        const item = data[first.dataIndex];
        return `${first.marker}<strong>${item.serviceName} &gt; ${item.modelName} &gt; ${item.intent}</strong><br/>실패율: ${item.failRate}%<br/>Fail 수: ${item.failCnt}건<br/>인식수: ${item.detectCnt}건`;
      },
    },
    grid: { left: 20, right: 50, bottom: 20, top: 20, containLabel: true },
    xAxis: {
      type: 'value',
      max: axisMax,
      interval: axisMax / 4,
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
      data: data.map((item) => item.intent),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12, width: 100, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: data.map((item) => item.failRate),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: (params) => getGradientColor(params, [255, 127, 103]) },
        barWidth: '60%',
        label: { show: true, position: 'right', formatter: '{c}', color: '#495057', fontSize: 11 },
      },
    ],
  };
};

interface IntentFailRateTopBarChartProps {
  data?: IntentFailRateTopItem[];
}

export default function IntentFailRateTopBarChart({ data }: IntentFailRateTopBarChartProps) {
  if (!data?.length) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  return <ReactECharts option={createChartOption(data)} notMerge style={{ height: '100%', width: '100%' }} />;
}
