import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '../constants/dashboardConstants';
import type { DialogSummary } from '../types';
import NoData from '@/components/custom/NoData';

const formatDiff = (diff: number, unit: string) => {
  if (diff === 0) return { text: `- 0${unit}`, style: 'zero' };
  const arrow = diff > 0 ? '▲' : '▼';
  const style = diff > 0 ? 'up' : 'down';
  return { text: `${arrow} ${Math.abs(diff)}${unit}`, style };
};

const formatPrevRate = (rate: number, rateDiff: number) => {
  const prevRate = Math.round((rate - rateDiff) * 10) / 10;
  const diff = formatDiff(rateDiff, '%p');
  return { prevRate, diff };
};

const createChartOption = (data: DialogSummary): EChartsOption => {
  const seriesData = [
    { name: '완료', value: data.completeCnt, rate: data.completeRate, rateDiff: data.completeRateDiff },
    { name: '미완료', value: data.incompleteCnt, rate: data.incompleteRate, rateDiff: data.incompleteRateDiff },
  ];

  const entryDiff = formatDiff(data.entryDiff, '');

  const labelFormatter = (params: { name: string }) => {
    const item = seriesData.find((d) => d.name === params.name);
    if (!item) return params.name;
    const { prevRate, diff } = formatPrevRate(item.rate, item.rateDiff);
    return `{name|${item.name}}\n{rate|${item.rate}% (${item.value.toLocaleString()}건)}\n{prev|전일 ${prevRate}%} {${diff.style}|${diff.text}}`;
  };

  const labelRich = {
    name: { fontSize: 13, color: '#333', lineHeight: 22 },
    rate: { fontSize: 13, fontWeight: 'bold' as const, color: '#333', lineHeight: 22 },
    prev: { fontSize: 11, color: '#999', lineHeight: 20 },
    up: { fontSize: 11, color: '#10B981', lineHeight: 20 },
    down: { fontSize: 11, color: '#F06548', lineHeight: 20 },
    zero: { fontSize: 11, color: '#999', lineHeight: 20 },
  };

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
          text: `{${entryDiff.style}|${entryDiff.text}}`,
          rich: {
            up: { fontSize: 13, fill: '#10B981' },
            down: { fontSize: 13, fill: '#F06548' },
            zero: { fontSize: 13, fill: '#999' },
          },
        },
      },
    ],
    tooltip: {
      trigger: 'item',
      appendTo: 'body',
      formatter: (params: unknown) => {
        const { name, value } = params as { name: string; value: number };
        const item = seriesData.find((d) => d.name === name);
        if (!item) return `${name}: ${value}`;
        const { prevRate, diff } = formatPrevRate(item.rate, item.rateDiff);
        return `${name}<br/>${item.rate}% (${value.toLocaleString()}건)<br/>전일 ${prevRate}% ${diff.text}`;
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
    color: [CHART_COLORS.success, CHART_COLORS.danger],
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
          formatter: labelFormatter,
          rich: labelRich,
        },
        labelLine: {
          length: 20,
          length2: 12,
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

interface DialogSummaryPieChartProps {
  data?: DialogSummary;
}

export default function DialogSummaryPieChart({ data }: DialogSummaryPieChartProps) {
  if (!data?.completeCnt && !data?.incompleteCnt) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  return <ReactECharts option={createChartOption(data)} style={{ height: '100%', width: '100%' }} />;
}
