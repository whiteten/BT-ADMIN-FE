import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Log } from '@/log';
import { API_ERROR_EVENT, type ApiErrorEvent, toast } from '@/shared-util';

/**
 * API 에러 이벤트를 전역으로 처리하는 훅
 * - 기본: 에러 메시지 토스트 표시
 * - 401: 로그인 페이지로 리다이렉트 & 인증 만료 토스트 표시
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
      // 사용자 친화적 에러 메시지 추출
      const responseData = error.response?.data as Record<string, unknown> | undefined;
      const msg = (responseData?.message as string) ?? (responseData?.error_description as string) ?? error.response?.statusText ?? '요청 처리 중 오류가 발생했습니다.';
      toast.error(msg);
    };
    window.addEventListener(API_ERROR_EVENT, handler);
    return () => window.removeEventListener(API_ERROR_EVENT, handler);
  }, [navigate]);
}
