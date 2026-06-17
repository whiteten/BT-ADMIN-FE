import { useMemo } from 'react';
import PanelEChart from '../../../../panel/components/chart/PanelEChart';
import { FONT_FAMILY, areaGradient, axisLabelStyle, baseGrid, baseLegend, baseTooltip, koNum, splitLineStyle } from '../../../../panel/components/chart/echartsPanelTheme';
import { ABANDON_WARN_PCT, TREND_COLOR } from '../constants';
import type { TimeTrendPoint } from '../types';

interface TrendChartProps {
  points: TimeTrendPoint[];
}

/**
 * 인입·응대·미처리(좌축) + 포기율(우축)을 한 ECharts 듀얼축 라인차트로 합친 추세.
 * (기존 손그림 SVG 추세 차트 + 포기율 스트립 두 차트를 통합 — 패널 차트와 동일 ECharts 톤.)
 */
export default function TrendChart({ points }: TrendChartProps) {
  const option = useMemo(() => {
    const categories = points.map((p) => p.time);
    const lineBase = { type: 'line' as const, smooth: true, showSymbol: false, emphasis: { focus: 'series' as const } };

    return {
      animationDuration: 600,
      animationEasing: 'cubicOut',
      grid: baseGrid(true),
      tooltip: { trigger: 'axis' as const, ...baseTooltip },
      legend: baseLegend(true),
      xAxis: {
        type: 'category' as const,
        boundaryGap: false,
        data: categories,
        axisLabel: axisLabelStyle,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e4e7ec' } },
      },
      yAxis: [
        {
          type: 'value' as const,
          name: '콜',
          nameTextStyle: { color: '#98a2b3', fontSize: 10, fontFamily: FONT_FAMILY },
          axisLabel: { ...axisLabelStyle, formatter: (v: number) => koNum(v) },
          splitLine: splitLineStyle,
        },
        {
          type: 'value' as const,
          name: '포기율 %',
          nameTextStyle: { color: TREND_COLOR.abandon, fontSize: 10, fontFamily: FONT_FAMILY },
          axisLabel: { ...axisLabelStyle, color: TREND_COLOR.abandon, formatter: '{value}%' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          ...lineBase,
          name: '인입콜',
          yAxisIndex: 0,
          lineStyle: { width: 2.6, color: TREND_COLOR.inbound },
          itemStyle: { color: TREND_COLOR.inbound },
          areaStyle: { color: areaGradient(TREND_COLOR.inbound) },
          data: points.map((p) => p.inbound),
          markPoint: {
            symbolSize: 44,
            itemStyle: { color: TREND_COLOR.inbound },
            label: { fontSize: 10, fontFamily: FONT_FAMILY, formatter: '피크\n{c}' },
            data: [{ type: 'max', name: '피크' }],
          },
        },
        {
          ...lineBase,
          name: '응대(처리)',
          yAxisIndex: 0,
          lineStyle: { width: 2.4, color: TREND_COLOR.answered },
          itemStyle: { color: TREND_COLOR.answered },
          data: points.map((p) => p.answered),
        },
        {
          ...lineBase,
          name: '미처리',
          yAxisIndex: 0,
          lineStyle: { width: 1.8, color: TREND_COLOR.unhandled },
          itemStyle: { color: TREND_COLOR.unhandled },
          data: points.map((p) => p.unhandled),
        },
        {
          ...lineBase,
          name: '포기율',
          yAxisIndex: 1,
          lineStyle: { width: 1.8, type: 'dashed' as const, color: TREND_COLOR.abandon },
          itemStyle: { color: TREND_COLOR.abandon },
          data: points.map((p) => p.abandonRate),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: TREND_COLOR.abandon, type: 'dashed' as const, width: 1 },
            label: { show: true, position: 'end' as const, formatter: `주의 ${ABANDON_WARN_PCT}%`, color: TREND_COLOR.abandon, fontSize: 10, fontFamily: FONT_FAMILY },
            data: [{ yAxis: ABANDON_WARN_PCT }],
          },
        },
      ],
    };
  }, [points]);

  return <PanelEChart option={option} />;
}
