import type { EChartsOption } from 'echarts';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '../constants/dashboardConstants';
import type { IntentCheckFailTopItem } from '../types/dashboard.types';
import NoData from '@/components/custom/NoData';

const createChartOption = (data: IntentCheckFailTopItem[]): EChartsOption => {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      appendTo: 'body',
      formatter: (params) => {
        const list = params as CallbackDataParams[];
        const item = data[list[0].dataIndex];
        const title = `<strong>${item.serviceName} &gt; ${item.modelName} &gt; ${item.intent}</strong>`;
        const lines = list.map((p) => `${p.marker} ${p.seriesName}: ${p.value}건`);
        return `${title}<br/>인식수: ${item.detectCnt}건<br/>${lines.join('<br/>')}`;
      },
    },
    legend: { data: ['Fail', 'Check', 'Pass'], right: 10, top: 5, icon: 'roundRect', selectedMode: false },
    grid: { left: 20, right: 50, bottom: 20, top: 30, containLabel: true },
    xAxis: {
      type: 'value',
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
        name: 'Fail',
        type: 'bar',
        stack: 'total',
        data: data.map((item) => item.failCnt),
        itemStyle: { color: CHART_COLORS.danger },
        barWidth: '60%',
      },
      {
        name: 'Check',
        type: 'bar',
        stack: 'total',
        data: data.map((item) => item.checkCnt),
        itemStyle: { color: CHART_COLORS.warning },
      },
      {
        name: 'Pass',
        type: 'bar',
        stack: 'total',
        data: data.map((item) => ({
          value: item.passCnt,
          itemStyle: {
            borderRadius: item.passCnt > 0 ? [0, 4, 4, 0] : undefined,
          },
        })),
        itemStyle: { color: CHART_COLORS.success },
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
