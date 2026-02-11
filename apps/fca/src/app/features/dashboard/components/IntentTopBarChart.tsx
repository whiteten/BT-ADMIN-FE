import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { IntentTopItem } from '../types/dashboard.types';

const sampleData: IntentTopItem[] = [
  { rank: 1, intent: '계좌이체', detectCnt: 720 },
  { rank: 2, intent: '잔액조회', detectCnt: 650 },
  { rank: 3, intent: '카드결제', detectCnt: 580 },
  { rank: 4, intent: '대출신청', detectCnt: 510 },
  { rank: 5, intent: '비밀번호변경', detectCnt: 440 },
  { rank: 6, intent: '카드분실신고', detectCnt: 370 },
  { rank: 7, intent: '해지신청', detectCnt: 300 },
  { rank: 8, intent: '주소변경', detectCnt: 230 },
  { rank: 9, intent: '금리조회', detectCnt: 180 },
  { rank: 10, intent: '상담원연결', detectCnt: 120 },
];

const createChartOption = (data: IntentTopItem[]): EChartsOption => {
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
      data: data.map((item) => item.intent),
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

export default function IntentTopBarChart() {
  return <ReactECharts option={createChartOption(sampleData)} style={{ height: '100%', width: '100%' }} />;
}
