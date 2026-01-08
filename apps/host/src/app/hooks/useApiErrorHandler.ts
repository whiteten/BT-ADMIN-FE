import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { API_ERROR_EVENT, type ApiErrorEvent, hasKeyValue, toast } from '@/shared-util';

/**
 * API 에러 이벤트를 전역으로 처리하는 훅
 * - 기본: 에러 메시지 토스트 표시
 * - 401: 로그인 페이지로 리다이렉트 & 인증 만료 토스트 표시
 */
export function useApiErrorHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: Event) => {
      const { detail: error } = e as ApiErrorEvent;
      if (hasKeyValue(error.response, 'status', 401)) {
        navigate('/login');
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
