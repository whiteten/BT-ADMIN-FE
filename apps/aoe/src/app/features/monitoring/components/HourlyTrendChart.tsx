import type { BarSeriesOption, EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import DashboardPanel from './DashboardPanel';
import { STATUS_COLORS } from '../constants/dashboardConstants';
import type { AoeHourly } from '../types';
import NoData from '@/components/custom/NoData';

interface Props {
  hourly?: AoeHourly[];
}

/** 시간대별 콜 분포 — 인입/완료/실패 막대 */
export default function HourlyTrendChart({ hourly }: Props) {
  const rows = hourly ?? [];
  const hours = rows.map((h) => `${h.hour}시`);
  const bar = (name: string, color: string, pick: (h: AoeHourly) => number): BarSeriesOption => ({
    name,
    type: 'bar',
    barMaxWidth: 14,
    itemStyle: { color, borderRadius: [3, 3, 0, 0] },
    data: rows.map(pick),
  });

  const option: EChartsOption = {
    color: [STATUS_COLORS.inbound, STATUS_COLORS.completed, STATUS_COLORS.failed],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#334155', fontSize: 12 },
      extraCssText: 'box-shadow:0 8px 24px -12px rgba(15,23,42,0.3);border-radius:8px;',
    },
    legend: {
      data: ['인입', '완료', '실패'],
      left: 'center',
      top: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { color: '#64748b', fontSize: 12 },
    },
    grid: { left: 8, right: 12, top: 48, bottom: 4, containLabel: true },
    xAxis: [
      {
        type: 'category',
        data: hours,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '콜',
        nameLocation: 'end',
        nameGap: 12,
        nameTextStyle: { color: '#94a3b8', fontSize: 11, align: 'left', padding: [0, 0, 0, -28] },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
    ],
    series: [
      bar('인입', STATUS_COLORS.inbound, (h) => h.inboundCalls ?? 0),
      bar('완료', STATUS_COLORS.completed, (h) => h.completedCalls ?? 0),
      bar('실패', STATUS_COLORS.failed, (h) => h.failedCalls ?? 0),
    ],
  };

  return (
    <DashboardPanel title="시간대별 콜 분포" subtitle="시간대별 인입 / 완료 / 실패 콜 추이">
      {!hourly || hourly.length === 0 ? <NoData className="py-20" /> : <ReactECharts option={option} style={{ height: 230 }} notMerge lazyUpdate />}
    </DashboardPanel>
  );
}
