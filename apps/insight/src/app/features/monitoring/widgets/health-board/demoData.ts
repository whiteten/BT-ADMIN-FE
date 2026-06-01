import type { HealthBoardData } from './types';

/**
 * 데모 데이터 — URL 에 `?healthDemo=1` 이 포함되면 위젯이 실 데이터 대신 본 값을 사용한다.
 *
 * 용도:
 *  - WebSocket / BE 집계 위젯 미구현 환경에서 시각 확인
 *  - 시안(01-healthboard.html)과 픽셀 비교
 *
 * 운영에는 영향 없음 — 쿼리 파라미터가 없으면 무시된다.
 */
export const DEMO_HEALTH: HealthBoardData = {
  answerRate: 92.4,
  serviceLevel: 88,
  abandonRate: 4.2,
  inboundCnt: 1284,
  answeredCnt: 1186,
  waitingCnt: 17,
  alarm: { danger: 3, warn: 2 },
  systems: [
    { code: 'IE', name: 'IE 교환기', up: 8, total: 8 },
    { code: 'IC', name: 'IC CTI', up: 4, total: 4 },
    { code: 'IR', name: 'IR IVR', up: 7, total: 8 },
  ],
  queues: [
    { id: 'vip', name: 'VIP 상담', waitCnt: 32, barPct: 100, sev: 'danger' },
    { id: 'normal', name: '일반 상담', waitCnt: 18, barPct: 56, sev: 'warn' },
    { id: 'team2', name: '상담2팀', serviceLevel: 84, barPct: 42, sev: 'warn' },
  ],
  normalQueueCnt: 5,
  agents: { available: 42, talking: 23, wrapup: 8, aux: 7, offline: 5 },
  quality: {
    bad: 4,
    warn: 7,
    normal: 49,
    dist: { good: 60, fair: 22, warn: 12, bad: 6 },
    lowestMos: 3.1,
    lowestAgentName: '홍길동',
    lowestAgentDn: '1042',
  },
  serverTs: Date.now(),
};

export function isHealthDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('healthDemo') === '1';
  } catch {
    return false;
  }
}
