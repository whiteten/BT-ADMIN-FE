import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { getGradientColor } from './chartStyles';
import type { IntentConfidenceTopItem } from '../types/dashboard.types';
import NoData from '@/components/custom/NoData';

const createChartOption = (data: IntentConfidenceTopItem[]): EChartsOption => {
  const sorted = [...data].filter((item) => item.rank >= 1 && item.rank <= 10).sort((a, b) => a.rank - b.rank);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params];
        const first = list[0] as { dataIndex: number; marker: string };
        if (first?.dataIndex == null) return '';
        const item = sorted[first.dataIndex];
        return `${first.marker}<strong>${item.serviceName} &gt; ${item.modelName} &gt; ${item.intent}</strong><br/>평균 신뢰도: ${item.avgConfidence}%<br/>인식수: ${item.detectCnt}건<br/>Pass: ${item.passRate}% / Check: ${item.checkRate}% / Fail: ${item.failRate}%`;
      },
    },
    grid: { left: 20, right: 50, bottom: 20, top: 20, containLabel: true },
    xAxis: {
      type: 'value',
      splitNumber: 4,
      axisLine: { lineStyle: { color: '#E9EBEC' } },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
      name: '(%)',
      nameLocation: 'end',
      nameTextStyle: { color: '#495057', fontSize: 12 },
      splitLine: { lineStyle: { type: 'dashed' as const, color: '#E9EBEC' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((item) => item.intent),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((item) => item.avgConfidence),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: (params) => getGradientColor(params, [255, 127, 103]) },
        barWidth: '60%',
        label: { show: true, position: 'right', formatter: '{c}', color: '#495057', fontSize: 11 },
      },
    ],
  };
};

interface IntentConfidenceTopBarChartProps {
  data?: IntentConfidenceTopItem[];
}

export default function IntentConfidenceTopBarChart({ data }: IntentConfidenceTopBarChartProps) {
  if (!data?.length) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  return <ReactECharts option={createChartOption(data)} notMerge style={{ height: '100%', width: '100%' }} />;
}
