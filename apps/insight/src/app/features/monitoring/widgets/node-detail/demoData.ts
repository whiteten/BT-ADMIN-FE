import type { SystemNode } from './types';

/**
 * 데모 데이터 — URL 에 `?nodeDemo=1` 이 포함되면 위젯이 실 데이터 대신 본 값을 사용한다.
 *
 * 의미 구분:
 *  - 시스템 `isAlive` = IS_ACTIVE(04) 가동/다운(생존 여부). false = 다운(최상위 위험, 자원·모듈 stale).
 *  - 모듈 `isActive` = CLASS_ITEMS.IS_ACTIVE 이중화(Active/Standby).
 *
 * 시연 구성: 다운 1대(IE 교환기 #2) + 가동 중 Critical 1대(IR IVR #2, standby 측) + 정상 가동 3대.
 * 운영에는 영향 없음 — 쿼리 파라미터가 없으면 무시된다.
 */
export const DEMO_NODES: SystemNode[] = [
  {
    systemId: '2010010',
    systemName: 'IE 교환기 #1',
    status: 0,
    isAlive: true,
    cpu: { rate: 34, status: 0 },
    mem: { rate: 52, status: 0 },
    disk: { rate: 61, status: 0 },
    process: { total: 24, running: 24, status: 0 },
    modules: [
      { code: 'CALL', status: 0, isActive: true },
      { code: 'SIP', status: 0, isActive: true },
      { code: 'MGCP', status: 0, isActive: true },
    ],
    updateTime: '20260603091158',
  },
  {
    // 다운 — IS_ACTIVE=0. 자원·모듈 값은 마지막 보고값(stale).
    systemId: '2010011',
    systemName: 'IE 교환기 #2',
    status: 1,
    isAlive: false,
    cpu: { rate: 0, status: 0 },
    mem: { rate: 0, status: 0 },
    disk: { rate: 58, status: 0 },
    process: { total: 24, running: 0, status: 3 },
    modules: [
      { code: 'CALL', status: 0, isActive: false },
      { code: 'SIP', status: 1, isActive: false },
      { code: 'MGCP', status: 0, isActive: false },
    ],
    updateTime: '20260603090612',
  },
  {
    systemId: '2010030',
    systemName: 'IC CTI 서버',
    status: 0,
    isAlive: true,
    cpu: { rate: 41, status: 0 },
    mem: { rate: 48, status: 0 },
    disk: { rate: 55, status: 0 },
    process: { total: 18, running: 18, status: 0 },
    modules: [
      { code: 'ROUTER', status: 0, isActive: true },
      { code: 'STAT', status: 0, isActive: true },
    ],
    updateTime: '20260603091159',
  },
  {
    systemId: '2010050',
    systemName: 'IR IVR #1',
    status: 0,
    isAlive: true,
    cpu: { rate: 38, status: 0 },
    mem: { rate: 44, status: 0 },
    disk: { rate: 49, status: 0 },
    process: { total: 16, running: 16, status: 0 },
    modules: [
      { code: 'SLEE', status: 0, isActive: true },
      { code: 'MS', status: 0, isActive: true },
      { code: 'TGW', status: 0, isActive: true },
    ],
    updateTime: '20260603091157',
  },
  {
    // 가동 중이나 자원·모듈 상태가 나쁨(Critical) — 이중화상 Standby 측.
    systemId: '2010051',
    systemName: 'IR IVR #2',
    status: 3,
    isAlive: true,
    cpu: { rate: 92, status: 3 },
    mem: { rate: 88, status: 2 },
    disk: { rate: 73, status: 1 },
    process: { total: 16, running: 13, status: 2 },
    modules: [
      { code: 'SLEE', status: 3, isActive: false },
      { code: 'MS', status: 2, isActive: false },
      { code: 'TGW', status: 0, isActive: false },
    ],
    updateTime: '20260603091140',
  },
];

export function isNodeDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('nodeDemo') === '1';
  } catch {
    return false;
  }
}
