import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { PIE_COLORS } from './chartStyles';
import type { SlotSummary } from '../types/dashboard.types';

const sampleData: SlotSummary = {
  entryCnt: 5800,
  entryDiff: 2.1,
  completeCnt: 4930,
  completeRate: 85.0,
  completeRateDiff: 0.9,
  incompleteCnt: 870,
  incompleteRate: 15.0,
  incompleteRateDiff: -0.9,
};

const createChartOption = (data: SlotSummary): EChartsOption => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', right: 10, top: 'center', icon: 'roundRect' },
  color: PIE_COLORS,
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['45%', '50%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{d}%' },
      emphasis: {
        label: {
          show: true,
          fontWeight: 'bold',
        },
      },
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2,
      },
      data: [
        { name: '완결', value: data.completeCnt },
        { name: '미완결', value: data.incompleteCnt },
      ],
    },
  ],
});

export default function SlotSummaryPieChart() {
  return <ReactECharts option={createChartOption(sampleData)} style={{ height: '100%', width: '100%' }} />;
}
