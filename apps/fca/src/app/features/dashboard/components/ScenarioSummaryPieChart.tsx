import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '../constants/dashboardConstants';
import type { ScenarioSummary } from '../types/dashboard.types';
import NoData from '@/components/custom/NoData';

const createChartOption = (data: ScenarioSummary): EChartsOption => {
  const seriesData = [
    { name: '완결', value: data.completeCnt, rate: data.completeRate, diff: data.completeRateDiff },
    { name: '미완결', value: data.incompleteCnt, rate: data.incompleteRate, diff: data.incompleteRateDiff },
    { name: '상담원 전환', value: data.agentReqCnt, rate: data.agentTransferRate, diff: data.agentTransferRateDiff },
  ];

  const diff = data.avgBusyTimeDiff;
  const diffText = diff === 0 ? '- 0초' : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}초`;
  const diffColor = diff === 0 ? '#999' : diff > 0 ? '#10B981' : '#F06548';

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const { name, value } = params as { name: string; value: number };
        const item = seriesData.find((d) => d.name === name);
        return `${name}: ${value} (${item?.rate ?? 0}%)`;
      },
    },
    legend: {
      orient: 'horizontal',
      left: 'center',
      bottom: '12%',
      itemGap: 13,
      icon: 'roundRect',
      selectedMode: false,
      textStyle: {
        fontSize: 14,
        color: '#333',
      },
    },
    color: [CHART_COLORS.success, CHART_COLORS.danger, CHART_COLORS.warning],
    series: [
      {
        type: 'pie',
        radius: ['40%', '80%'],
        center: ['50%', '60%'],
        startAngle: 180,
        endAngle: 360,
        avoidLabelOverlap: false,
        label: {
          show: true,
          formatter: (params: { name: string }) => {
            const item = seriesData.find((d) => d.name === params.name);
            if (!item) return params.name;
            const diff = item.diff;
            if (diff === 0) {
              return `{name|${item.name}}\n{rate|${item.rate}%}\n{zero|- 0%}`;
            }
            const arrow = diff > 0 ? '▲' : '▼';
            const diffStyle = diff > 0 ? 'up' : 'down';
            return `{name|${item.name}}\n{rate|${item.rate}%}\n{${diffStyle}|${arrow} ${Math.abs(diff)}%}`;
          },
          rich: {
            name: { fontSize: 13, color: '#333', lineHeight: 22 },
            rate: { fontSize: 13, fontWeight: 'bold', color: '#333', lineHeight: 22 },
            up: { fontSize: 12, color: '#10B981', lineHeight: 22 },
            down: { fontSize: 12, color: '#F06548', lineHeight: 22 },
            zero: { fontSize: 12, color: '#999', lineHeight: 22 },
          },
        },
        emphasis: {
          label: {
            show: true,
            fontWeight: 'bold',
          },
        },
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        data: seriesData,
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: '26%',
        cursor: 'default',
        style: {
          rich: {
            label: { fontSize: 14, fontWeight: 'bold', fill: '#333' },
            diff: { fontSize: 12, fill: diffColor },
          },
          text: `{label|평균점유시간: ${data.avgBusyTime}초}  {diff|${diffText}}`,
        },
      },
    ],
  };
};

interface ScenarioSummaryPieChartProps {
  data?: ScenarioSummary;
}

export default function ScenarioSummaryPieChart({ data }: ScenarioSummaryPieChartProps) {
  if (!data?.completeCnt && !data?.incompleteCnt && !data?.agentReqCnt) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  return <ReactECharts option={createChartOption(data)} style={{ height: '100%', width: '100%' }} />;
}
