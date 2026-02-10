import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { PIE_COLORS } from './chartStyles';
import type { DialogSummary } from '../types/dashboard.types';

const sampleData: DialogSummary = {
  entryCnt: 3200,
  entryDiff: 3.5,
  completeCnt: 2560,
  completeRate: 80.0,
  completeRateDiff: 1.8,
  incompleteCnt: 640,
  incompleteRate: 20.0,
  incompleteRateDiff: -1.8,
};

const createChartOption = (data: DialogSummary): EChartsOption => ({
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
      ],
    },
  ],
});

export default function DialogSummaryPieChart() {
  return <ReactECharts option={createChartOption(sampleData)} style={{ height: '100%', width: '100%' }} />;
}
