import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS, commonAxisStyle, commonGridStyle, commonSplitLineStyle } from './chartStyles';
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
  const sorted = [...data].sort((a, b) => b.rank - a.rank);
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: commonGridStyle,
    xAxis: {
      type: 'value',
      ...commonAxisStyle,
      axisLabel: { ...commonAxisStyle.axisLabel, formatter: '{value}건' },
      splitLine: commonSplitLineStyle,
    },
    yAxis: {
      type: 'category',
      data: sorted.map((item) => item.keyword),
      ...commonAxisStyle,
      axisLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((item) => item.detectCnt),
        itemStyle: { color: CHART_COLORS.primary, borderRadius: [0, 4, 4, 0] },
        barWidth: '60%',
        label: { show: true, position: 'right', formatter: '{c}건', color: '#495057', fontSize: 11 },
      },
    ],
  };
};

export default function KeywordTopBarChart() {
  return <ReactECharts option={createChartOption(sampleData)} style={{ height: '100%', width: '100%' }} />;
}
