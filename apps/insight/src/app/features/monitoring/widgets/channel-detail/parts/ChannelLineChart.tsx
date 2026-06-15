import { useMemo } from 'react';
import AutoResizeECharts from './AutoResizeECharts';

/**
 * 점유율 추세 선(AS-IS linechart) — 전체/인바운드 점유율 % 를 시간축으로.
 *
 * 라이브에서는 위젯이 매 틱(DATA 프레임)마다 누적한 history 를 그린다.
 * history 가 2점 미만(데모·초기)이면 현재값으로 끝나는 결정적 리드인 30점을 합성한다.
 */
export interface ChannelLineChartProps {
  /** 누적 추세 — 오래된 → 최신. */
  history: { occ: number; inb: number }[];
  /** 현재 시점 점유율(합성 리드인의 끝점). */
  current: { occ: number; inb: number };
}

function buildSeries(history: { occ: number; inb: number }[], current: { occ: number; inb: number }) {
  if (history.length >= 2) {
    return { occ: history.map((h) => h.occ), inb: history.map((h) => h.inb) };
  }
  // 합성 리드인 — 시드(현재 점유율) 기반이라 동일 시스템이면 항상 같은 곡선.
  let s = Math.max(1, Math.round(current.occ) * 31 + 7);
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const occ: number[] = [];
  const inb: number[] = [];
  let o = Math.max(5, current.occ - 12);
  let i = Math.max(2, current.inb - 8);
  for (let t = 0; t < 29; t++) {
    o = Math.min(98, Math.max(3, o + (rnd() * 10 - 5)));
    i = Math.min(o, Math.max(1, i + (rnd() * 8 - 4)));
    occ.push(Math.round(o));
    inb.push(Math.round(i));
  }
  occ.push(Math.round(current.occ));
  inb.push(Math.round(current.inb));
  return { occ, inb };
}

export default function ChannelLineChart({ history, current }: ChannelLineChartProps) {
  const option = useMemo(() => {
    const { occ, inb } = buildSeries(history, current);
    const x = occ.map((_, i) => i);
    return {
      grid: { left: 36, right: 16, top: 16, bottom: 16, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: x, boundaryGap: false, axisLabel: { show: false }, axisLine: { lineStyle: { color: '#e4e7ec' } } },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitNumber: 4,
        splitLine: { lineStyle: { color: '#eef1f6' } },
        axisLabel: { color: '#9aa0a8', fontSize: 10, formatter: '{value}' },
      },
      series: [
        {
          name: '전체 점유율',
          type: 'line',
          data: occ,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#b76e00', width: 2 },
          areaStyle: { color: 'rgba(183,110,0,0.10)' },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [{ yAxis: 80 }],
            lineStyle: { color: '#c92a2a', type: 'dashed' },
            label: { formatter: '임계 80%', color: '#c92a2a', fontSize: 10 },
          },
        },
        { name: '인바운드 점유율', type: 'line', data: inb, smooth: true, symbol: 'none', lineStyle: { color: '#085fb5', width: 1.75 } },
      ],
    };
  }, [history, current]);

  return <AutoResizeECharts option={option} />;
}
