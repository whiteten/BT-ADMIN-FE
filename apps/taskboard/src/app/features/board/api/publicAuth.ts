import axios from 'axios';

/**
 * 전광판 공개 액세스 Bearer 토큰 관리.
 * 로그인 없이 외부 키로 전광판을 열 때(TaskViewPublic) 사용한다.
 * 설정된 토큰은 taskboardApi와 ctiRedisApi의 모든 요청에 Authorization 헤더로 추가된다.
 */
let _publicToken: string | null = null;
let _publicMode = false;

export const setPublicBearerToken = (token: string | null): void => {
  _publicToken = token;
};

export const getPublicBearerToken = (): string | null => _publicToken;

/**
 * TaskViewPublic이 mount될 때(자식 TaskView가 API를 쏘기 전에) 호출한다.
 * true가 되면 taskboardApi/ctiRedisApi의 withAuth()가 모든 요청에 apiClient의
 * silent:true를 실어 보내, 공개 인증 실패로 인한 401이 apps/host의 전역
 * "로그인 페이지로 리다이렉트" 핸들러를 트리거하지 않도록 한다.
 *
 * (원래는 401 api-error 이벤트를 capture 단계에서 stopImmediatePropagation()으로
 *  차단하려 했으나, window.dispatchEvent(CustomEvent)가 target(window)에 직접 쏘는
 *  이벤트라 capture/bubble 구분 없이 "리스너 등록 순서"로만 실행 순서가 정해진다.
 *  host의 전역 핸들러는 앱 부팅 시점에 이미 등록돼 있어 항상 우리보다 먼저 실행되므로
 *  이벤트 억제로는 절대 이길 수 없는 경쟁이었음 — 요청 자체에 플래그를 실어 보내는
 *  방식으로 전환.)
 */
export const setPublicMode = (value: boolean): void => {
  _publicMode = value;
};

export const isPublicMode = (): boolean => _publicMode;

/** 현재 공개 토큰이 있으면 Authorization 헤더 객체를, 없으면 undefined를 반환 */
export const publicAuthHeaders = (): { Authorization: string } | undefined => (_publicToken ? { Authorization: `Bearer ${_publicToken}` } : undefined);

/**
 * OAuth2 토큰 엔드포인트 URL을 반환한다.
 * 개발 서버(webpack dev, port 4200)는 /oauth 경로를 BFF로 프록시하지 않으므로
 * production이 아닌 환경에서는 BFF 절대 URL을 직접 사용한다.
 * BFF의 /oauth/** CORS 설정이 모든 origin을 허용하므로 크로스오리진 요청이 가능하다.
 */
const getOAuthTokenUrl = (): string => {
  if (process.env.NODE_ENV !== 'production') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8080/oauth/token`;
  }
  return '/oauth/token';
};

/**
 * OAuth2 Client Credentials로 Bearer 토큰을 발급받아 저장한다.
 * BFF /oauth/token 엔드포인트는 permit-all이므로 인증 없이 호출 가능.
 *
 * @param clientId     - OAuth2 클라이언트 ID (예: "taskboard-api")
 * @param clientSecret - OAuth2 클라이언트 시크릿
 * @returns 발급된 Bearer 토큰 문자열
 * @throws   토큰 발급 실패 시 Error를 던진다
 */
export const fetchPublicToken = async (clientId: string, clientSecret: string): Promise<string> => {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const params = new URLSearchParams({ grant_type: 'client_credentials' });
  const response = await axios.post<{ access_token: string }>(getOAuthTokenUrl(), params.toString(), {
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    withCredentials: false,
  });
  const token = response.data?.access_token;
  if (!token) throw new Error('액세스 토큰이 응답에 없습니다.');
  setPublicBearerToken(token);
  return token;
};
