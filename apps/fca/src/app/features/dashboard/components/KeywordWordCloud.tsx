import 'echarts-wordcloud';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '../constants/dashboardConstants';
import type { KeywordTopItem } from '../types/dashboard.types';
import NoData from '@/components/custom/NoData';

const WORD_CLOUD_COLORS = Object.values(CHART_COLORS);

const createChartOption = (data: KeywordTopItem[]) => {
  return {
    tooltip: {
      show: true,
      formatter: (params: { name: string; value: number }) => {
        return `<strong>${params.name}</strong><br/>검출 횟수: ${params.value}건`;
      },
    },
    series: [
      {
        type: 'wordCloud',
        sizeRange: [12, 48],
        rotationRange: [-45, 45],
        rotationStep: 45,
        gridSize: 7,
        shape: 'square',
        width: '90%',
        height: '90%',
        left: 'center',
        top: 'center',
        textStyle: {
          fontWeight: 'bold',
          color: (_params: { dataIndex: number }) => {
            return WORD_CLOUD_COLORS[_params.dataIndex % WORD_CLOUD_COLORS.length];
          },
        },
        emphasis: {
          textStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.25)',
          },
        },
        data: data.map((item) => ({
          name: item.keyword,
          value: item.detectCnt,
        })),
      },
    ],
  };
};

interface KeywordWordCloudProps {
  data?: KeywordTopItem[];
}

export default function KeywordWordCloud({ data }: KeywordWordCloudProps) {
  if (!data?.length) return <NoData message={`조회된 데이터가 없습니다.`} fontSize="text-base" gap={2} />;
  return <ReactECharts option={createChartOption(data)} notMerge style={{ height: '100%', width: '100%' }} />;
}
