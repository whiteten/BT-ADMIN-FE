import type { ChannelRow } from './types';

/**
 * 데모 데이터 — URL 에 `?channelDemo=1` 이 포함되면 위젯이 실 데이터 대신 본 배열을 사용한다.
 *
 * 용도:
 *  - WebSocket 미연결 환경에서 채널 격자 시각화 확인
 *  - 시안(11-channel-detail.html) 과 픽셀 비교
 *  - 모든 채널상태(0~9) · 시스템(SIP/TDM) · 점유율 시나리오 한 번에 검증
 *
 * 운영에는 영향 없음 — 쿼리 파라미터가 없으면 무시된다.
 */

/** 의사난수 — 시드 기반이라 새로고침해도 같은 분포. */
function makeRnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

interface SysSpec {
  systemId: number;
  systemName: string;
  irType: number;
  total: number;
  /** CHNL_STATUS 0~9 가중치 (분포). */
  dist: number[];
}

const SYSTEMS: SysSpec[] = [
  // 점유 높음(임계) SIP
  { systemId: 7131, systemName: 'SLEE_01', irType: 2, total: 200, dist: [10, 28, 8, 120, 28, 14, 0, 12, 4, 2] },
  // 여유 SIP
  { systemId: 7132, systemName: 'SLEE_02', irType: 2, total: 150, dist: [26, 40, 6, 60, 12, 20, 0, 16, 1, 0] },
  // TDM 여유
  { systemId: 7133, systemName: 'SLEE_03', irType: 1, total: 250, dist: [40, 120, 4, 50, 8, 30, 2, 24, 1, 1] },
];

function genSystem(spec: SysSpec): ChannelRow[] {
  const rnd = makeRnd(spec.systemId);
  const pool: number[] = [];
  spec.dist.forEach((w, st) => {
    for (let i = 0; i < w; i++) pool.push(st);
  });
  const rows: ChannelRow[] = [];
  for (let i = 1; i <= spec.total; i++) {
    const st = pool[Math.floor(rnd() * pool.length)] ?? 1;
    const inout = st === 4 ? 10 : st === 3 ? (rnd() < 0.8 ? 20 : 30) : rnd() < 0.6 ? 20 : 10;
    const hasCtx = st === 2 || st === 3 || st === 4;
    rows.push({
      CENTER_ID: 1,
      SYSTEM_ID: spec.systemId,
      SYSTEM_NAME: spec.systemName,
      IR_TYPE: spec.irType,
      CHNL_NO: i,
      CHNL_STATUS: st,
      INOUT_KIND: inout,
      MEDIA_TYPE: st === 3 ? (rnd() < 0.82 ? 0 : rnd() < 0.6 ? 2 : 1) : 0,
      ENTRY_PATH: st === 3 ? [10, 20, 30][Math.floor(rnd() * 3)] : 0,
      SERVICE_ANI: hasCtx ? `010-${2000 + Math.floor(rnd() * 7999)}-${1000 + Math.floor(rnd() * 8999)}` : '',
      SERVICE_DNIS: hasCtx ? `15${10 + Math.floor(rnd() * 89)}-${1000 + Math.floor(rnd() * 8999)}` : '',
      UCID: st === 3 ? String(Math.floor(rnd() * 9e9) + 1e9) : '',
      SERVICE_ID: 100 + Math.floor(rnd() * 8),
      DB_UPDATE_TIME: '20260614104512',
    });
  }
  return rows;
}

/** 최종 데모 데이터: 3개 시스템(SIP×2 + TDM×1)의 전 채널 flat 배열. */
export const DEMO_CHANNELS: ChannelRow[] = SYSTEMS.flatMap(genSystem);

/** 데모 모드 활성화 여부. URL 쿼리에 `channelDemo=1` 이 있으면 true. */
export function isChannelDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('channelDemo') === '1';
  } catch {
    return false;
  }
}
