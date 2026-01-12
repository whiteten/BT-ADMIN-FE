import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Log } from '@/log';
import { API_ERROR_EVENT, type ApiErrorEvent, hasKeyValue, toast } from '@/shared-util';

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
      if (hasKeyValue(error.response, 'status', 401, 3)) {
        navigate('/login');
        const current = locationRef.current;
        Log.debug('Redirect to login page. location: ', JSON.stringify(current));
        if (current.pathname === '/') return;
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        toast.warning(`[${now}]\n인증이 만료되었습니다.`, { autoClose: false });
        return;
      }
      const msg = JSON.stringify(error.response, null, 2);
      toast.error(msg);
    };
    window.addEventListener(API_ERROR_EVENT, handler);
    return () => window.removeEventListener(API_ERROR_EVENT, handler);
  }, [navigate]);
}
