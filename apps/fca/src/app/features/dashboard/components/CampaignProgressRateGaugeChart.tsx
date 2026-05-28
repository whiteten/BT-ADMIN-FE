import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '../constants/dashboardConstants';
import type { CampaignProgressRateData } from '../types';
import NoData from '@/components/custom/NoData';

type GaugeValueType = 'count' | 'percent';

const toProgressPieData = (data: CampaignProgressRateData) => {
  const entryCnt = data.totalTargetCnt ?? 0;
  const completeCnt = Math.max(data.outboundAttemptCnt ?? 0, 0);
  const incompleteCnt = Math.max(entryCnt - completeCnt, 0);
  const completeRate = entryCnt > 0 ? Math.round((Math.min(completeCnt, entryCnt) / entryCnt) * 1000) / 10 : 0;
  const incompleteRate = entryCnt > 0 ? Math.round((100 - completeRate) * 10) / 10 : 0;

  return {
    entryCnt,
    completeCnt,
    completeRate,
    incompleteCnt,
    incompleteRate,
  };
};

const createChartOption = ({
  data,
  valueType,
  value,
  showTargetCount,
  showSeriesData,
}: {
  data: CampaignProgressRateData;
  valueType: GaugeValueType;
  value?: number;
  showTargetCount: boolean;
  showSeriesData: boolean;
}): EChartsOption => {
  const pieData = toProgressPieData(data);
  const resolvedValue = value ?? (valueType === 'count' ? pieData.completeCnt : pieData.completeRate);
  const normalizedPercent =
    valueType === 'percent' ? Math.max(Math.min(resolvedValue, 100), 0) : pieData.entryCnt > 0 ? Math.max(Math.min((resolvedValue / pieData.entryCnt) * 100, 100), 0) : 100;
  const centerValueText = valueType === 'count' ? `${Math.round(resolvedValue).toLocaleString()}` : `${resolvedValue}%`;

  if (!showSeriesData) {
    return {
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '55%',
          style: {
            text: `{value|${centerValueText}}`,
            rich: {
              value: { fontSize: 28, fontWeight: 'bold', fill: '#333', fontFamily: 'Noto Sans KR, sans-serif' },
            },
          },
        },
      ],
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          center: ['50%', '72%'],
          radius: '100%',
          progress: {
            show: true,
            width: 22,
            itemStyle: { color: CHART_COLORS.success, borderCap: 'round' },
          },
          axisLine: {
            lineStyle: {
              width: 22,
              color: [[1, '#E9ECEF']],
            },
          },
          pointer: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { show: false },
          data: [{ value: normalizedPercent }],
        },
      ],
    };
  }

  const seriesData = [
    { name: '총 발신 시도건수(누적)', value: pieData.completeCnt, rate: pieData.completeRate },
    { name: '미발신', value: pieData.incompleteCnt, rate: pieData.incompleteRate },
  ];

  return {
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '55%',
        style: {
          text: `{value|${centerValueText}}`,
          rich: {
            value: { fontSize: 28, fontWeight: 'bold', fill: '#333', fontFamily: 'Noto Sans KR, sans-serif' },
          },
        },
      },
      ...(showTargetCount
        ? [
            {
              type: 'text' as const,
              left: 'center',
              top: '67%',
              style: {
                text: `대상건수 | ${pieData.entryCnt.toLocaleString()}`,
                fill: '#495057',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'Noto Sans KR, sans-serif',
              },
            },
          ]
        : []),
    ],
    tooltip: {
      trigger: 'item',
      appendTo: 'body',
      formatter: (params: unknown) => {
        const { name, value } = params as { name: string; value: number };
        const item = seriesData.find((d) => d.name === name);
        if (!item) return `${name}: ${value}`;
        return `${name}<br/>${item.rate}% (${value.toLocaleString()}건)`;
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
          formatter: (params: { name: string }) => {
            const item = seriesData.find((d) => d.name === params.name);
            if (!item) return params.name;
            return `{name|${item.name}}\n{rate|${item.rate}% (${item.value.toLocaleString()}건)}`;
          },
          rich: {
            name: { fontSize: 13, color: '#333', lineHeight: 22 },
            rate: { fontSize: 13, fontWeight: 'bold' as const, color: '#333', lineHeight: 22 },
          },
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

interface CampaignProgressRateGaugeChartProps {
  data?: CampaignProgressRateData;
  valueType?: GaugeValueType;
  value?: number;
  showTargetCount?: boolean;
  showSeriesData?: boolean;
}

export default function CampaignProgressRateGaugeChart({ data, valueType = 'percent', value, showTargetCount = true, showSeriesData = true }: CampaignProgressRateGaugeChartProps) {
  if (!data && value == null) {
    return <NoData message="조회된 데이터가 없습니다." fontSize="text-base" gap={2} />;
  }

  if (data && !showSeriesData && value == null && valueType === 'percent' && data.outboundAttemptCnt == null) {
    return <NoData message="조회된 데이터가 없습니다." fontSize="text-base" gap={2} />;
  }

  if (data && showSeriesData) {
    const pieData = toProgressPieData(data);
    if (!pieData.completeCnt && !pieData.incompleteCnt) {
      return <NoData message="조회된 데이터가 없습니다." fontSize="text-base" gap={2} />;
    }
  }

  const safeData: CampaignProgressRateData = data ?? { outboundAttemptCnt: 0, totalTargetCnt: 0 };
  const safeValue =
    value ??
    (valueType === 'count'
      ? (safeData.outboundAttemptCnt ?? 0)
      : safeData.totalTargetCnt > 0
        ? Math.round((Math.max(safeData.outboundAttemptCnt ?? 0, 0) / safeData.totalTargetCnt) * 1000) / 10
        : 0);

  return (
    <ReactECharts
      option={createChartOption({
        data: safeData,
        valueType,
        value: safeValue,
        showTargetCount,
        showSeriesData,
      })}
      style={{ height: '100%', width: '100%' }}
    />
  );
}
