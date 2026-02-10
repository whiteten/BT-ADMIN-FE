import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS, commonAxisStyle, commonGridStyle, commonSplitLineStyle } from './chartStyles';
import type { SlotIncompleteTopItem } from '../types/dashboard.types';

const sampleData: SlotIncompleteTopItem[] = [
  { rank: 1, serviceName: '서비스A', dialogName: '본인인증', slotName: '주민번호', entryCnt: 400, completeCnt: 160, completeRate: 40, incompleteCnt: 240, incompleteRate: 60 },
  { rank: 2, serviceName: '서비스A', dialogName: '본인인증', slotName: '전화번호', entryCnt: 380, completeCnt: 171, completeRate: 45, incompleteCnt: 209, incompleteRate: 55 },
  { rank: 3, serviceName: '서비스B', dialogName: '계좌조회', slotName: '계좌번호', entryCnt: 350, completeCnt: 175, completeRate: 50, incompleteCnt: 175, incompleteRate: 50 },
  { rank: 4, serviceName: '서비스B', dialogName: '카드분실', slotName: '카드번호', entryCnt: 320, completeCnt: 176, completeRate: 55, incompleteCnt: 144, incompleteRate: 45 },
  { rank: 5, serviceName: '서비스C', dialogName: '잔액조회', slotName: '계좌유형', entryCnt: 300, completeCnt: 180, completeRate: 60, incompleteCnt: 120, incompleteRate: 40 },
  { rank: 6, serviceName: '서비스C', dialogName: '이체확인', slotName: '이체금액', entryCnt: 280, completeCnt: 182, completeRate: 65, incompleteCnt: 98, incompleteRate: 35 },
  { rank: 7, serviceName: '서비스D', dialogName: '대출상담', slotName: '대출금액', entryCnt: 260, completeCnt: 182, completeRate: 70, incompleteCnt: 78, incompleteRate: 30 },
  { rank: 8, serviceName: '서비스D', dialogName: '카드신청', slotName: '카드종류', entryCnt: 240, completeCnt: 180, completeRate: 75, incompleteCnt: 60, incompleteRate: 25 },
  { rank: 9, serviceName: '서비스E', dialogName: '주소변경', slotName: '우편번호', entryCnt: 220, completeCnt: 176, completeRate: 80, incompleteCnt: 44, incompleteRate: 20 },
  { rank: 10, serviceName: '서비스E', dialogName: '해지접수', slotName: '해지사유', entryCnt: 200, completeCnt: 170, completeRate: 85, incompleteCnt: 30, incompleteRate: 15 },
];

const createChartOption = (data: SlotIncompleteTopItem[]): EChartsOption => {
  const sorted = [...data].sort((a, b) => b.rank - a.rank);
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: commonGridStyle,
    xAxis: {
      type: 'value',
      ...commonAxisStyle,
      axisLabel: { ...commonAxisStyle.axisLabel, formatter: '{value}%' },
      splitLine: commonSplitLineStyle,
    },
    yAxis: {
      type: 'category',
      data: sorted.map((item) => item.slotName),
      ...commonAxisStyle,
      axisLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((item) => item.incompleteRate),
        itemStyle: { color: CHART_COLORS.danger, borderRadius: [0, 4, 4, 0] },
        barWidth: '60%',
        label: { show: true, position: 'right', formatter: '{c}%', color: '#495057', fontSize: 11 },
      },
    ],
  };
};

export default function SlotIncompleteTopBarChart() {
  return <ReactECharts option={createChartOption(sampleData)} style={{ height: '100%', width: '100%' }} />;
}
