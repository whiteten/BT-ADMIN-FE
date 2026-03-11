import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '../constants/dashboardConstants';
import type { ScenarioSummary } from '../types/dashboard.types';
import NoData from '@/components/custom/NoData';

const createChartOption = (data: ScenarioSummary): EChartsOption => {
  const seriesData = [
    { name: '완결', value: data.completeCnt, rate: data.completeRate },
    { name: '미완결', value: data.incompleteCnt, rate: data.incompleteRate },
    { name: '상담원 전환', value: data.agentReqCnt, rate: data.agentTransferRate },
  ];

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
      top: '75%',
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
        center: ['50%', '65%'],
        startAngle: 180,
        endAngle: 360,
        avoidLabelOverlap: true,
        label: {
          show: true,
          formatter: (params: { name: string }) => {
            const item = seriesData.find((d) => d.name === params.name);
            if (!item) return params.name;
            return `{name|${item.name}}\n{rate|${item.value}건}`;
          },
          rich: {
            name: { fontSize: 13, color: '#333', lineHeight: 22 },
            rate: { fontSize: 13, fontWeight: 'bold', color: '#333', lineHeight: 22 },
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
  };
};

interface ScenarioSummaryPieChartProps {
  data?: ScenarioSummary;
}

export default function ScenarioSummaryPieChart({ data }: ScenarioSummaryPieChartProps) {
  if (!data?.completeCnt && !data?.incompleteCnt && !data?.agentReqCnt) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  return <ReactECharts option={createChartOption(data)} style={{ height: '100%', width: '100%' }} />;
}
