import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Log } from '@/log';
import { API_ERROR_EVENT, type ApiErrorEvent, toast } from '@/shared-util';

/**
 * API 에러 이벤트를 전역으로 처리하는 훅
 * - 기본: 에러 메시지 토스트 표시
 * - 401: 로그인 페이지로 리다이렉트 & 인증 만료 토스트 표시
 * - 403(code='FORBIDDEN'): 페이지 진입 조회(GET) 거부면 forbidden 페이지로, 그 외(액션 거부)는 토스트
 */
export function useApiErrorHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { detail: error } = e as ApiErrorEvent;
      if (error.response?.status === 401) {
        const current = locationRef.current;
        if (current.pathname === '/login') return;
        navigate('/login');
        Log.debug('Redirect to login page. location: ', JSON.stringify(current));
        if (current.pathname === '/') return;

        // 서버에서 전달된 메시지를 그대로 표시 (BFF에서 한글 메시지 생성)
        const responseData = error.response?.data as Record<string, unknown> | undefined;
        const serverMessage = (responseData?.message as string) ?? '인증에 실패했습니다. 다시 로그인해주세요.';
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        toast.warning(`[${now}]\n${serverMessage}`, { autoClose: false, toastId: 'error-status-401' });
        return;
      }
      // 403 권한 없음(BE @PreAuthorize 거부, body code='FORBIDDEN')
      const forbiddenData = error.response?.data as Record<string, unknown> | undefined;
      if (error.response?.status === 403 && forbiddenData?.code === 'FORBIDDEN') {
        // 이동 여부: 요청측 config의 redirectOnForbidden을 우선, 미지정 시 GET이면 이동.
        // GET = 페이지 진입 조회 거부 → 화면 자체 접근 불가이므로 forbidden 페이지로 이동.
        // POST 등으로 조회하는 케이스는 호출측에서 redirectOnForbidden:true로 GET과 동일 처리.
        // 변경/액션 거부는 화면을 유지하고 토스트로만 안내.
        const cfg = error.config as (typeof error.config & { redirectOnForbidden?: boolean }) | undefined;
        const shouldRedirect = cfg?.redirectOnForbidden ?? cfg?.method?.toLowerCase() === 'get';
        if (shouldRedirect) {
          const current = locationRef.current;
          if (current.pathname !== '/forbidden') navigate('/forbidden');
          return;
        }
        toast.error((forbiddenData?.message as string) ?? '권한이 없습니다.');
        return;
      }
      // 사용자 친화적 에러 메시지 추출
      const responseData = error.response?.data as Record<string, unknown> | undefined;
      const rawMessage = responseData?.message ?? responseData?.error_description ?? error.response?.statusText;
      const msg = typeof rawMessage === 'string' ? rawMessage : rawMessage ? JSON.stringify(rawMessage) : '요청 처리 중 오류가 발생했습니다.';
      toast.error(msg);
    };
    window.addEventListener(API_ERROR_EVENT, handler);
    return () => window.removeEventListener(API_ERROR_EVENT, handler);
  }, [navigate]);
}
