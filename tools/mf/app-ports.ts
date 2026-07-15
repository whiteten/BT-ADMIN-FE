/**
 * 앱별 dev 서버 포트의 단일 소스(SoT).
 *
 * - 각 앱 rsbuild.config.ts의 server.port가 여기서 읽는다.
 * - host rsbuild.config.ts의 remote 주소 조립(dev/외부 IP 접속용 MF_REMOTE_HOST)도
 *   여기서 포트를 해석한다.
 *
 * 새 remote 추가 시 이 맵에 한 줄 추가할 것.
 *
 * ⚠️ campaign·custom 4209 중복은 원본(BT-ADMIN-FE project.json) 값 그대로 이관한 것.
 *    두 앱을 동시에 dev로 띄우면 충돌한다 — 원본에서도 동일한 잠복 이슈.
 */
export const APP_PORTS: Record<string, number> = {
  host: 4200,
  manager: 4201,
  fca: 4202,
  ipron: 4203,
  aoe: 4204,
  stt: 4205,
  ivr: 4206,
  insight: 4207,
  taskboard: 4208,
  campaign: 4209,
  custom: 4209,
  vel: 4210,
};

/** host의 MF remotes 배열 대상(빌드 매핑). custom은 런타임 동적 등록이라 제외. */
export const REMOTE_NAMES = ['manager', 'fca', 'ipron', 'aoe', 'stt', 'ivr', 'insight', 'taskboard', 'campaign', 'vel'] as const;
