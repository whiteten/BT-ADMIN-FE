import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { DialogIncompleteTopItem } from '../types/dashboard.types';
import { getGradientColor } from '../utils/dashboardUtils';
import NoData from '@/components/custom/NoData';

const createChartOption = (data: DialogIncompleteTopItem[]): EChartsOption => {
  const sorted = [...data].filter((item) => item.rank >= 1 && item.rank <= 10).sort((a, b) => a.rank - b.rank);
  const dataMax = Math.max(...sorted.map((item) => item.incompleteRate));
  const axisMax = Math.min(Math.ceil(dataMax / 20) * 20, 100);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params];
        const first = list[0] as { dataIndex: number; marker: string };
        if (first?.dataIndex == null) return '';
        const item = sorted[first.dataIndex];
        return `${first.marker}<strong>${item.serviceName} &gt; ${item.dialogName}</strong><br/>미완결율: ${item.incompleteRate}%<br/>미완결: ${item.incompleteCnt}건<br/>진입: ${item.entryCnt}건`;
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
      data: sorted.map((item) => item.dialogName),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((item) => item.incompleteRate),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: (params) => getGradientColor(params, [255, 127, 103]) },
        barWidth: '60%',
        label: { show: true, position: 'right', formatter: '{c}', color: '#495057', fontSize: 11 },
      },
    ],
  };
};

interface DialogIncompleteTopBarChartProps {
  data?: DialogIncompleteTopItem[];
}

export default function DialogIncompleteTopBarChart({ data }: DialogIncompleteTopBarChartProps) {
  if (!data?.length) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  return <ReactECharts option={createChartOption(data)} notMerge style={{ height: '100%', width: '100%' }} />;
}
