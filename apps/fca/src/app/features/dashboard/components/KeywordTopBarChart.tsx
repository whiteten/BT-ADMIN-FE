import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { getGradientColor } from './chartStyles';
import type { KeywordTopItem } from '../types/dashboard.types';

const sampleData: KeywordTopItem[] = [
  { rank: 1, keyword: '계좌이체', detectCnt: 520 },
  { rank: 2, keyword: '잔액조회', detectCnt: 480 },
  { rank: 3, keyword: '카드결제', detectCnt: 430 },
  { rank: 4, keyword: '비밀번호', detectCnt: 390 },
  { rank: 5, keyword: '대출상담', detectCnt: 350 },
  { rank: 6, keyword: '해지신청', detectCnt: 310 },
  { rank: 7, keyword: '주소변경', detectCnt: 270 },
  { rank: 8, keyword: '카드분실', detectCnt: 230 },
  { rank: 9, keyword: '금리조회', detectCnt: 190 },
  { rank: 10, keyword: '상담원연결', detectCnt: 150 },
];

const createChartOption = (data: KeywordTopItem[]): EChartsOption => {
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
      data: data.map((item) => item.keyword),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
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

export default function KeywordTopBarChart() {
  return <ReactECharts option={createChartOption(sampleData)} style={{ height: '100%', width: '100%' }} />;
}
