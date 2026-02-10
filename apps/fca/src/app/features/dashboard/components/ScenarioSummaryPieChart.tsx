import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { PIE_COLORS } from './chartStyles';
import type { ScenarioSummary } from '../types/dashboard.types';

const sampleData: ScenarioSummary = {
  entryCnt: 1250,
  entryDiff: 5.2,
  completeCnt: 980,
  completeRate: 78.4,
  completeRateDiff: 2.1,
  agentReqCnt: 150,
  agentTransferRate: 12.0,
  agentTransferRateDiff: -1.3,
  incompleteCnt: 120,
  incompleteRate: 9.6,
  incompleteRateDiff: -0.8,
  avgBusyTime: 45.3,
  avgBusyTimeDiff: 3.2,
};

const createChartOption = (data: ScenarioSummary): EChartsOption => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: 10, top: 'center', icon: 'roundRect' },
  color: PIE_COLORS,
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{d}%' },
      data: [
        { name: '완결', value: data.completeCnt },
        { name: '미완결', value: data.incompleteCnt },
        { name: '상담원 전환', value: data.agentReqCnt },
      ],
    },
  ],
});

export default function ScenarioSummaryPieChart() {
  return <ReactECharts option={createChartOption(sampleData)} style={{ height: '100%', width: '100%' }} />;
}
