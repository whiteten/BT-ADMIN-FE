import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LOG } from '@/log';
import { getCookie, toast } from '@/shared-util';
import { useGetCsrfToken } from '../../features/auth/hooks/useAuthQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('CsrfProvider');

export default function CsrfProvider() {
  const location = useLocation();
  const csrfToken = getCookie('XSRF-TOKEN');
  Log.debug('Find CSRF Token in cookie. token: ', csrfToken);
  const { isFetching, isError, error } = useGetCsrfToken({ params: { t: new Date().getTime() }, queryOptions: { enabled: !csrfToken } });

  useEffect(() => {
    if (isError) toast.error('CSRF 토큰 발급에 실패하였습니다.\n관리자에게 문의해주세요.');
  }, [isError, error]);

  if (isFetching) {
    Log.debug('isFetching..');
    return <FallbackSpinner useFullScreen />;
  }

  if (isError) {
    Log.error('CSRF 토큰 발급 실패.', error);
    const isLoginPage = location.pathname === '/login';
    return isLoginPage ? <Outlet /> : <Navigate to="/login" />;
  }

  return <Outlet />;
}
