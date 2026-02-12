import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { getGradientColor } from './chartStyles';
import type { IntentConfidenceTopItem } from '../types/dashboard.types';

const sampleData: IntentConfidenceTopItem[] = [
  { rank: 1, serviceName: '서비스A', modelName: '모델A', intent: '상담원연결', detectCnt: 200, avgConfidence: 95.2, passRate: 92, checkRate: 5, failRate: 3 },
  { rank: 2, serviceName: '서비스A', modelName: '모델A', intent: '잔액조회', detectCnt: 650, avgConfidence: 93.8, passRate: 90, checkRate: 6, failRate: 4 },
  { rank: 3, serviceName: '서비스B', modelName: '모델B', intent: '계좌이체', detectCnt: 720, avgConfidence: 91.5, passRate: 88, checkRate: 7, failRate: 5 },
  { rank: 4, serviceName: '서비스B', modelName: '모델B', intent: '카드결제', detectCnt: 580, avgConfidence: 89.1, passRate: 85, checkRate: 9, failRate: 6 },
  { rank: 5, serviceName: '서비스C', modelName: '모델C', intent: '비밀번호변경', detectCnt: 440, avgConfidence: 87.3, passRate: 83, checkRate: 10, failRate: 7 },
  { rank: 6, serviceName: '서비스C', modelName: '모델C', intent: '대출신청', detectCnt: 510, avgConfidence: 85.0, passRate: 80, checkRate: 12, failRate: 8 },
  { rank: 7, serviceName: '서비스D', modelName: '모델D', intent: '해지신청', detectCnt: 300, avgConfidence: 82.6, passRate: 78, checkRate: 13, failRate: 9 },
  { rank: 8, serviceName: '서비스D', modelName: '모델D', intent: '주소변경', detectCnt: 230, avgConfidence: 80.2, passRate: 75, checkRate: 15, failRate: 10 },
  { rank: 9, serviceName: '서비스E', modelName: '모델E', intent: '카드분실신고', detectCnt: 370, avgConfidence: 78.5, passRate: 72, checkRate: 16, failRate: 12 },
  { rank: 10, serviceName: '서비스E', modelName: '모델E', intent: '금리조회', detectCnt: 180, avgConfidence: 75.0, passRate: 70, checkRate: 18, failRate: 12 },
];

const createChartOption = (data: IntentConfidenceTopItem[]): EChartsOption => {
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
      splitLine: { lineStyle: { type: 'dashed' as const, color: '#E9EBEC' } },
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
        data: data.map((item) => item.avgConfidence),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: getGradientColor },
        barWidth: '60%',
        label: { show: true, position: 'right', formatter: '{c}', color: '#495057', fontSize: 11 },
      },
    ],
  };
};

export default function IntentConfidenceTopBarChart() {
  return <ReactECharts option={createChartOption(sampleData)} style={{ height: '100%', width: '100%' }} />;
}
