import type { EChartsOption } from 'echarts';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from './chartStyles';
import type { IntentCheckFailTopItem } from '../types/dashboard.types';
import NoData from '@/components/custom/NoData';

const createChartOption = (data: IntentCheckFailTopItem[]): EChartsOption => {
  const sorted = [...data].filter((item) => item.rank >= 1 && item.rank <= 10).sort((a, b) => a.rank - b.rank);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const list = params as CallbackDataParams[];
        const item = sorted[list[0].dataIndex];
        const title = `<strong>${item.serviceName} &gt; ${item.modelName} &gt; ${item.intent}</strong>`;
        const lines = list.map((p) => `${p.marker} ${p.seriesName}: ${p.value}%`);
        return `${title}<br/>인식수: ${item.detectCnt}건 / 평균 신뢰도: ${item.avgConfidence}%<br/>${lines.join('<br/>')}`;
      },
    },
    legend: { data: ['Check', 'Fail'], right: 10, top: 5, icon: 'roundRect', selectedMode: false },
    grid: { left: 20, right: 50, bottom: 20, top: 30, containLabel: true },
    xAxis: {
      type: 'value',
      splitNumber: 4,
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
      data: sorted.map((item) => item.intent),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
    },
    series: [
      {
        name: 'Check',
        type: 'bar',
        stack: 'total',
        data: sorted.map((item) => item.checkRate),
        itemStyle: { color: CHART_COLORS.warning },
        barWidth: '60%',
      },
      {
        name: 'Fail',
        type: 'bar',
        stack: 'total',
        data: sorted.map((item) => item.failRate),
        itemStyle: { color: CHART_COLORS.danger, borderRadius: [0, 4, 4, 0] },
      },
    ],
  };
};

interface IntentCheckFailTopBarChartProps {
  data?: IntentCheckFailTopItem[];
}

export default function IntentCheckFailTopBarChart({ data }: IntentCheckFailTopBarChartProps) {
  if (!data?.length) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  return <ReactECharts option={createChartOption(data)} notMerge style={{ height: '100%', width: '100%' }} />;
}
