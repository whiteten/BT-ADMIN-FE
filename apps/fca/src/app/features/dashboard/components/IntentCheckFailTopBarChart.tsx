import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS, commonAxisStyle, commonGridStyle, commonSplitLineStyle } from './chartStyles';
import type { IntentCheckFailTopItem } from '../types/dashboard.types';

const sampleData: IntentCheckFailTopItem[] = [
  { rank: 1, serviceName: '서비스A', modelName: '모델A', intent: '계좌이체', detectCnt: 500, avgConfidence: 62, passRate: 40, checkRate: 35, failRate: 25 },
  { rank: 2, serviceName: '서비스A', modelName: '모델A', intent: '잔액조회', detectCnt: 450, avgConfidence: 65, passRate: 45, checkRate: 32, failRate: 23 },
  { rank: 3, serviceName: '서비스B', modelName: '모델B', intent: '카드결제', detectCnt: 420, avgConfidence: 68, passRate: 50, checkRate: 30, failRate: 20 },
  { rank: 4, serviceName: '서비스B', modelName: '모델B', intent: '대출신청', detectCnt: 380, avgConfidence: 70, passRate: 52, checkRate: 30, failRate: 18 },
  { rank: 5, serviceName: '서비스C', modelName: '모델C', intent: '비밀번호변경', detectCnt: 350, avgConfidence: 72, passRate: 55, checkRate: 28, failRate: 17 },
  { rank: 6, serviceName: '서비스C', modelName: '모델C', intent: '카드분실신고', detectCnt: 310, avgConfidence: 75, passRate: 60, checkRate: 25, failRate: 15 },
  { rank: 7, serviceName: '서비스D', modelName: '모델D', intent: '해지신청', detectCnt: 280, avgConfidence: 78, passRate: 65, checkRate: 22, failRate: 13 },
  { rank: 8, serviceName: '서비스D', modelName: '모델D', intent: '주소변경', detectCnt: 250, avgConfidence: 80, passRate: 68, checkRate: 20, failRate: 12 },
  { rank: 9, serviceName: '서비스E', modelName: '모델E', intent: '금리조회', detectCnt: 220, avgConfidence: 82, passRate: 70, checkRate: 19, failRate: 11 },
  { rank: 10, serviceName: '서비스E', modelName: '모델E', intent: '상담원연결', detectCnt: 200, avgConfidence: 85, passRate: 75, checkRate: 15, failRate: 10 },
];

const createChartOption = (data: IntentCheckFailTopItem[]): EChartsOption => {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Check', 'Fail'], right: 10, top: 5, icon: 'roundRect', selectedMode: false },
    grid: { ...commonGridStyle, top: 30 },
    xAxis: {
      type: 'value',
      splitNumber: 4,
      ...commonAxisStyle,
      name: '(%)',
      nameLocation: 'end',
      nameTextStyle: commonAxisStyle.axisLabel,
      splitLine: commonSplitLineStyle,
    },
    yAxis: {
      type: 'category',
      data: data.map((item) => item.intent),
      ...commonAxisStyle,
      axisLine: { show: false },
    },
    series: [
      {
        name: 'Check',
        type: 'bar',
        stack: 'total',
        data: data.map((item) => item.checkRate),
        itemStyle: { color: CHART_COLORS.warning },
        barWidth: '60%',
      },
      {
        name: 'Fail',
        type: 'bar',
        stack: 'total',
        data: data.map((item) => item.failRate),
        itemStyle: { color: CHART_COLORS.danger, borderRadius: [0, 4, 4, 0] },
      },
    ],
  };
};

export default function IntentCheckFailTopBarChart() {
  return <ReactECharts option={createChartOption(sampleData)} style={{ height: '100%', width: '100%' }} />;
}
