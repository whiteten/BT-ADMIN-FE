import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '../constants/dashboardConstants';
import type { ScenarioSummary } from '../types/dashboard.types';
import NoData from '@/components/custom/NoData';

const createChartOption = (data: ScenarioSummary): EChartsOption => {
  const seriesData = [
    { name: '봇 해결', value: data.completeCnt, rate: data.completeRate, prevValue: data.prevCompleteCnt },
    { name: '미해결 종료', value: data.incompleteCnt, rate: data.incompleteRate, prevValue: data.prevIncompleteCnt },
    { name: '상담사 연결', value: data.agentReqCnt, rate: data.agentTransferRate, prevValue: data.prevAgentReqCnt },
  ];

  return {
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '55%',
        style: {
          text: `{value|${data.entryCnt.toLocaleString()}}{unit|건}`,
          rich: {
            value: { fontSize: 28, fontWeight: 'bold', fill: '#333' },
            unit: { fontSize: 16, fill: '#333', verticalAlign: 'bottom', fontFamily: 'Noto Sans KR' },
          },
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '67%',
        style: {
          text: `전일: ${data.prevEntryCnt.toLocaleString()}건`,
          fontSize: 13,
          fill: '#999',
        },
      },
    ],
    tooltip: {
      trigger: 'item',
      appendTo: 'body',
      formatter: (params: unknown) => {
        const { name, value } = params as { name: string; value: number };
        const item = seriesData.find((d) => d.name === name);
        return `${name}: ${value} (${item?.rate ?? 0}%)`;
      },
    },
    legend: {
      orient: 'horizontal',
      left: 'center',
      top: '82%',
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
        radius: ['62%', '100%'],
        center: ['50%', '72%'],
        startAngle: 180,
        endAngle: 360,
        avoidLabelOverlap: true,
        label: {
          show: true,
          formatter: (params: { name: string }) => {
            const item = seriesData.find((d) => d.name === params.name);
            if (!item) return params.name;
            return `{name|${item.name}}\n{rate|${item.value}건}\n{prev|전일: ${item.prevValue ?? 0}건}`;
          },
          rich: {
            name: { fontSize: 13, color: '#333', lineHeight: 22 },
            rate: { fontSize: 13, fontWeight: 'bold', color: '#333', lineHeight: 22 },
            prev: { fontSize: 12, color: '#999', lineHeight: 20 },
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
