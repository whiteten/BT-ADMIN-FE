import { useMemo } from 'react';
import { Empty } from 'antd';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import DashboardPanel from './DashboardPanel';
import { STATUS_COLORS } from '../constants/dashboardConstants';
import type { AoeSummary } from '../types';

interface Props {
  summary?: AoeSummary;
}

const LEGEND = [
  { key: 'inProgress', label: '진행중', color: STATUS_COLORS.inProgress },
  { key: 'completed', label: '완료', color: STATUS_COLORS.completed },
  { key: 'failed', label: '실패', color: STATUS_COLORS.failed },
] as const;

/** 실시간 상태 도넛 — 진행중/완료/실패 분포 + 커스텀 레전드 */
export default function StatusDonut({ summary }: Props) {
  const inProgress = summary?.inProgressCalls ?? 0;
  const completed = summary?.completedCalls ?? 0;
  const failed = summary?.failedCalls ?? 0;
  const total = inProgress + completed + failed;
  const values: Record<(typeof LEGEND)[number]['key'], number> = { inProgress, completed, failed };

  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'item',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (p: any) => `${p.name}<br/>${Number(p.value).toLocaleString()}건 (${p.percent}%)`,
      },
      series: [
        {
          name: '실시간 상태',
          type: 'pie',
          radius: ['62%', '86%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
          label: {
            show: true,
            position: 'center',
            formatter: () => `{v|${total.toLocaleString()}}\n{l|전체 콜}`,
            rich: {
              v: { fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 30 },
              l: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },
            },
          },
          emphasis: { scale: true, scaleSize: 4, label: { show: true } },
          data: LEGEND.map((s) => ({
            name: s.label,
            value: { inProgress, completed, failed }[s.key],
            itemStyle: { color: s.color },
          })),
        },
      ],
    }),
    [inProgress, completed, failed, total],
  );

  return (
    <DashboardPanel title="실시간 상태" subtitle="진행중 / 완료 / 실패 분포" className="h-full">
      {total === 0 ? (
        <Empty description="데이터가 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-16" />
      ) : (
        <div className="flex h-full flex-col items-center gap-5 sm:flex-row sm:gap-6">
          <ReactECharts option={option} style={{ height: 216, width: 216 }} className="shrink-0" notMerge lazyUpdate />
          <ul className="flex h-full w-full flex-1 flex-col justify-center gap-3">
            {LEGEND.map((s) => {
              const v = values[s.key];
              const pct = total ? Math.round((v / total) * 100) : 0;
              return (
                <li key={s.key} className="flex max-h-[60px] flex-1 items-center justify-between rounded-md bg-slate-50/70 px-4 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[13px] font-medium text-slate-600">{s.label}</span>
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[15px] font-bold tabular-nums text-slate-900">{v.toLocaleString()}</span>
                    <span className="text-[11px] font-medium tabular-nums text-slate-400">{pct}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </DashboardPanel>
  );
}
