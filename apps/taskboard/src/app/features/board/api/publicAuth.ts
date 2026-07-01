import { useEffect } from 'react';
import axios from 'axios';
import { API_ERROR_EVENT, type ApiErrorEvent } from '@/shared-util';

/**
 * 전광판 공개 액세스 Bearer 토큰 관리.
 * 로그인 없이 외부 키로 전광판을 열 때(TaskViewPublic) 사용한다.
 * 설정된 토큰은 taskboardApi와 ctiRedisApi의 모든 요청에 Authorization 헤더로 추가된다.
 */
let _publicToken: string | null = null;

export const setPublicBearerToken = (token: string | null): void => {
  _publicToken = token;
};

export const getPublicBearerToken = (): string | null => _publicToken;

/** 현재 공개 토큰이 있으면 Authorization 헤더 객체를, 없으면 undefined를 반환 */
export const publicAuthHeaders = (): { Authorization: string } | undefined => (_publicToken ? { Authorization: `Bearer ${_publicToken}` } : undefined);

/**
 * 공개 전광판 페이지에서 세션 없이 발생하는 401 api-error 이벤트를 차단하는 훅.
 *
 * apps/host의 useApiErrorHandler가 bubble 단계에서 401 이벤트를 수신하면 /login으로
 * 이동시키므로, 공개 경로에서는 capture=true로 먼저 등록해 stopImmediatePropagation()으로
 * 차단한다 — window.dispatchEvent(CustomEvent) 시 capture 핸들러가 non-capture보다 먼저 실행됨.
 */
export const useSuppressApiError401 = (): void => {
  useEffect(() => {
    const handler = (e: Event) => {
      const error = (e as ApiErrorEvent).detail;
      if (error?.response?.status === 401) {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener(API_ERROR_EVENT, handler, true);
    return () => window.removeEventListener(API_ERROR_EVENT, handler, true);
  }, []);
};

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
