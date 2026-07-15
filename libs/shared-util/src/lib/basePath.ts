/**
 * root context(basePath) 런타임 파생 유틸.
 *
 * 각 앱 index.html의 `<base href="/">`는 배포 시 서빙 주체(BFF·nginx·배포 스크립트)가
 * 고객사 경로(예: `/bt-admin/`)로 치환한다. FE는 그 base 태그(document.baseURI)에서
 * basePath를 파생해 라우터 basename·API·WS·정적 자산·팝업 URL에 사용한다.
 * 빌드 산출물은 전 고객사 공통 1개이며, 고객사별 값은 코드에 들어오지 않는다.
 */

/**
 * base 태그에서 파생한 basePath를 반환한다.
 *
 * - 루트 서비스(base 미설정 또는 `/`): `''`
 * - `/bt-admin/` 하위 서비스: `'/bt-admin'` (trailing slash 제거)
 *
 * 반환값은 경로 조립용이므로 루트일 때 빈 문자열이다.
 * 라우터 basename처럼 `/`가 필요한 곳은 `getBasePath() || '/'`로 사용한다.
 */
export const getBasePath = (): string => {
  const { pathname } = new URL(document.baseURI);
  return pathname.replace(/\/+$/, '');
};

/** 루트 절대경로(`/assets/...`, `/fca/...` 등)에 basePath를 접두한다. */
export const withBasePath = (path: string): string => `${getBasePath()}${path}`;

/**
 * `window.location.pathname` 같은 문서 기준 경로에서 basePath 접두를 제거해
 * 라우터 기준 경로로 정규화한다. (useLocation()은 basename이 이미 제거돼 있어 불필요 —
 * 라우터 밖에서 raw pathname을 라우트 경로와 비교할 때만 사용)
 */
export const stripBasePath = (pathname: string): string => {
  const basePath = getBasePath();
  if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
    return pathname.slice(basePath.length) || '/';
  }
  return pathname;
};

/**
 * WebSocket 접속 URL을 조립한다.
 *
 * @param path `/ws`로 시작하는 절대경로 (예: `/ws/session`, `/ws/proxy/fca/tracking`)
 */
export const buildWsUrl = (path: string): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${getBasePath()}${path}`;
};
