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
        // 401 + password_change_required는 Login 컴포넌트에서 처리 (비밀번호 변경 모달)
        const responseData = error.response?.data as Record<string, unknown> | undefined;
        const errorData = responseData?.data as Record<string, unknown> | undefined;
        if (errorData?.error === 'password_change_required' || responseData?.code === 'PASSWORD_CHANGE_REQUIRED') {
          Log.debug('401 password_change_required - handled by Login component');
          return;
        }

        navigate('/login');
        const current = locationRef.current;
        Log.debug('Redirect to login page. location: ', JSON.stringify(current));
        if (current.pathname === '/') return;
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        toast.warning(`[${now}]\n인증이 만료되었습니다.`, { autoClose: false, toastId: 'error-status-401' });
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
