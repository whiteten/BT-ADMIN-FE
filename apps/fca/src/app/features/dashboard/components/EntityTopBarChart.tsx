import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { EntityTopItem } from '../types/dashboard.types';

const sampleData: EntityTopItem[] = [
  { rank: 1, entityTag: '계좌번호', detectCnt: 610 },
  { rank: 2, entityTag: '금액', detectCnt: 550 },
  { rank: 3, entityTag: '날짜', detectCnt: 490 },
  { rank: 4, entityTag: '전화번호', detectCnt: 420 },
  { rank: 5, entityTag: '카드번호', detectCnt: 370 },
  { rank: 6, entityTag: '주민번호', detectCnt: 310 },
  { rank: 7, entityTag: '주소', detectCnt: 260 },
  { rank: 8, entityTag: '이름', detectCnt: 210 },
  { rank: 9, entityTag: '이메일', detectCnt: 170 },
  { rank: 10, entityTag: '상품명', detectCnt: 130 },
];

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
        colorBy: 'data',
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        barWidth: '60%',
        label: { show: true, position: 'right', formatter: '{c}', color: '#495057', fontSize: 11 },
      },
    ],
  };
};

export default function EntityTopBarChart() {
  return <ReactECharts option={createChartOption(sampleData)} style={{ height: '100%', width: '100%' }} />;
}
