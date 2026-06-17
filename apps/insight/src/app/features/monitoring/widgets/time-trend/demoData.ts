/**
 * 타임트렌드 종합판 데모 데이터.
 *
 * URL 쿼리 `?timeTrendDemo=1` 로 켜면, 라이브 PSR(WS) 데이터 대신 점심시간 과부하 시나리오
 * (오전 인입 상승 → 11~12시 응대가 인입을 못 따라감 → 미처리 갭·포기율 급등 → 오후 회복)
 * 더미 `{series, current, peak}` 를 그려, 09~18시 시간축·병합 라인차트·시간대 설정을 라이브 없이 확인한다.
 *
 * BE `TimeTrendWidget.buildPoints` 와 동일하게 unhandled(0클램프)·gapDelta·severity·sl 을 파생해
 * 실제 응답과 같은 형태로 만든다.
 */

import type { TimeTrendCurrent, TimeTrendData, TimeTrendPeak, TimeTrendPoint, TimeTrendSeverity } from './types';

/** 데모 모드 활성화 여부. URL 쿼리에 `timeTrendDemo=1` 이 있으면 true. */
export function isTimeTrendDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('timeTrendDemo') === '1';
  } catch {
    return false;
  }
}

// BE severity 임계 (TimeTrendWidget 상수와 동일)
const ABANDON_RED = 6;
const ABANDON_AMBER = 4;
const ABANDON_EARLY = 2;
const MIN10_TO_HOUR = 6;
const DELTA_BUCKETS_30M = 3;

const round1 = (v: number): number => Math.round(v * 10) / 10;

interface Raw {
  time: string;
  inbound: number;
  answered: number;
  abandonRate: number;
}

/** BE buildPoints 와 동일하게 미처리·gapDelta·severity·sl 파생. */
function finalize(raws: Raw[]): TimeTrendPoint[] {
  let prevGap = 0;
  let rising = 0;
  return raws.map((r, i) => {
    const unhandled = Math.max(0, r.inbound - r.answered);
    const gapDelta = i === 0 ? 0 : unhandled - prevGap;
    rising = gapDelta > 0 ? rising + 1 : 0;
    let severity: TimeTrendSeverity = 'normal';
    if (r.abandonRate > ABANDON_RED) severity = 'red';
    else if (r.abandonRate >= ABANDON_AMBER) severity = 'amber';
    else if (rising >= 2 && unhandled > 0 && r.abandonRate >= ABANDON_EARLY) severity = 'amber';
    const sl = r.inbound > 0 ? round1(((r.answered * 0.92) / r.inbound) * 100) : 0;
    prevGap = unhandled;
    return { time: r.time, inbound: r.inbound, answered: r.answered, unhandled, abandonRate: round1(r.abandonRate), sl, severity, gapDelta };
  });
}

/** 시간(HOUR) 앵커 08~18시 — 점심 과부하 시나리오. */
const HOUR_RAW: Raw[] = [
  { time: '08:00', inbound: 60, answered: 58, abandonRate: 1 },
  { time: '09:00', inbound: 180, answered: 172, abandonRate: 2 },
  { time: '10:00', inbound: 240, answered: 228, abandonRate: 3 },
  { time: '11:00', inbound: 300, answered: 250, abandonRate: 5 },
  { time: '12:00', inbound: 312, answered: 215, abandonRate: 8 },
  { time: '13:00', inbound: 270, answered: 230, abandonRate: 6 },
  { time: '14:00', inbound: 230, answered: 222, abandonRate: 3 },
  { time: '15:00', inbound: 210, answered: 205, abandonRate: 2 },
  { time: '16:00', inbound: 220, answered: 214, abandonRate: 2 },
  { time: '17:00', inbound: 240, answered: 232, abandonRate: 3 },
  { time: '18:00', inbound: 150, answered: 148, abandonRate: 1 },
];

/** 일(DAY) 앵커 — 최근 7일. */
const DAY_RAW: Raw[] = [
  { time: '06-10', inbound: 2400, answered: 2360, abandonRate: 2 },
  { time: '06-11', inbound: 2600, answered: 2540, abandonRate: 2 },
  { time: '06-12', inbound: 2500, answered: 2470, abandonRate: 2 },
  { time: '06-13', inbound: 3100, answered: 2780, abandonRate: 5 },
  { time: '06-14', inbound: 2700, answered: 2620, abandonRate: 3 },
  { time: '06-15', inbound: 1800, answered: 1790, abandonRate: 1 },
  { time: '06-16', inbound: 2550, answered: 2500, abandonRate: 3 },
];

/** 당일 10분(MIN10) — 시간 앵커를 08:00~14:00(현재) 사이 선형보간해 10분 버킷으로 환산. */
function buildMin10(): TimeTrendPoint[] {
  const CUR_HOUR = 14;
  const raws: Raw[] = [];
  for (let h = 8; h <= CUR_HOUR; h++) {
    const a = HOUR_RAW[h - 8];
    const b = HOUR_RAW[Math.min(h - 8 + 1, HOUR_RAW.length - 1)];
    const steps = h === CUR_HOUR ? 1 : 6; // 현재 정시만 마지막 버킷
    for (let m = 0; m < steps; m++) {
      const t = m / 6;
      raws.push({
        time: `${String(h).padStart(2, '0')}:${String(m * 10).padStart(2, '0')}`,
        inbound: Math.round((a.inbound + (b.inbound - a.inbound) * t) / MIN10_TO_HOUR),
        answered: Math.round((a.answered + (b.answered - a.answered) * t) / MIN10_TO_HOUR),
        abandonRate: a.abandonRate + (b.abandonRate - a.abandonRate) * t,
      });
    }
  }
  return finalize(raws);
}

function buildCurrent(min10: TimeTrendPoint[]): TimeTrendCurrent {
  const last = min10[min10.length - 1];
  const prevIdx = min10.length - 1 - DELTA_BUCKETS_30M;
  const prev = prevIdx >= 0 ? min10[prevIdx] : null;
  const deltaPct = (c: number, base: number): number | null => (base === 0 ? null : round1(((c - base) * 100) / base));
  return {
    inbound: last.inbound * MIN10_TO_HOUR,
    unhandled: last.unhandled,
    available: 28, // Redis 스냅샷(시계열 아님) 모사
    inboundDelta: prev ? deltaPct(last.inbound, prev.inbound) : null,
    unhandledDelta: prev ? deltaPct(last.unhandled, prev.unhandled) : null,
  };
}

function buildPeak(min10: TimeTrendPoint[]): TimeTrendPeak {
  let top = min10[0];
  for (const p of min10) if (p.inbound > top.inbound) top = p;
  return { time: top.time, value: top.inbound * MIN10_TO_HOUR };
}

/** 데모 응답 — BE `timeTrendWidget` 와 동일 형태의 `{series, current, peak}`. */
export function genTimeTrendDemo(): TimeTrendData {
  const min10 = buildMin10();
  return {
    series: { min10, hour: finalize(HOUR_RAW), day: finalize(DAY_RAW) },
    current: buildCurrent(min10),
    peak: buildPeak(min10),
  };
}
