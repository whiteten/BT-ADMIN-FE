import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { getGradientColor } from './chartStyles';
import type { DialogIncompleteTopItem } from '../types/dashboard.types';

const sampleData: DialogIncompleteTopItem[] = [
  { rank: 1, serviceName: '서비스A', dialogName: '본인인증', entryCnt: 500, completeCnt: 200, completeRate: 40, incompleteCnt: 300, incompleteRate: 60 },
  { rank: 2, serviceName: '서비스A', dialogName: '계좌조회', entryCnt: 450, completeCnt: 207, completeRate: 46, incompleteCnt: 243, incompleteRate: 54 },
  { rank: 3, serviceName: '서비스B', dialogName: '카드분실', entryCnt: 400, completeCnt: 208, completeRate: 52, incompleteCnt: 192, incompleteRate: 48 },
  { rank: 4, serviceName: '서비스B', dialogName: '비밀번호변경', entryCnt: 380, completeCnt: 209, completeRate: 55, incompleteCnt: 171, incompleteRate: 45 },
  { rank: 5, serviceName: '서비스C', dialogName: '잔액조회', entryCnt: 350, completeCnt: 210, completeRate: 60, incompleteCnt: 140, incompleteRate: 40 },
  { rank: 6, serviceName: '서비스C', dialogName: '이체확인', entryCnt: 320, completeCnt: 211, completeRate: 66, incompleteCnt: 109, incompleteRate: 34 },
  { rank: 7, serviceName: '서비스D', dialogName: '대출상담', entryCnt: 300, completeCnt: 210, completeRate: 70, incompleteCnt: 90, incompleteRate: 30 },
  { rank: 8, serviceName: '서비스D', dialogName: '카드신청', entryCnt: 280, completeCnt: 207, completeRate: 74, incompleteCnt: 73, incompleteRate: 26 },
  { rank: 9, serviceName: '서비스E', dialogName: '주소변경', entryCnt: 260, completeCnt: 208, completeRate: 80, incompleteCnt: 52, incompleteRate: 20 },
  { rank: 10, serviceName: '서비스E', dialogName: '해지접수', entryCnt: 240, completeCnt: 204, completeRate: 85, incompleteCnt: 36, incompleteRate: 15 },
];

const createChartOption = (data: DialogIncompleteTopItem[]): EChartsOption => {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
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
      splitLine: {
        lineStyle: { type: 'dashed' as const, color: '#E9EBEC' },
      },
    },
    yAxis: {
      type: 'category',
      data: data.map((item) => item.dialogName),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: data.map((item) => item.incompleteRate),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: getGradientColor },
        barWidth: '60%',
        label: { show: true, position: 'right', formatter: '{c}', color: '#495057', fontSize: 11 },
      },
    ],
  };
};

export default function DialogIncompleteTopBarChart() {
  return <ReactECharts option={createChartOption(sampleData)} style={{ height: '100%', width: '100%' }} />;
}
