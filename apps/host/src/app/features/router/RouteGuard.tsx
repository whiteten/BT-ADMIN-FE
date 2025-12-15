import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { LOG } from '@/log';
import { useGetUserInfo } from '../../features/auth/hooks/useAuthQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('RouteGuard');

export default function RouteGuard() {
  const { data: userInfo, isFetching, isError, error } = useGetUserInfo();

  useEffect(() => {
    if (userInfo) {
      Log.debug('User info fetched successfully. userInfo: ', userInfo);
    }
  }, [userInfo]);

  if (isFetching) {
    return <FallbackSpinner useFullScreen />;
  }
  if (isError) {
    Log.error('Failed to get user info', error);
    return <Navigate to="/login" />;
  }
  return <Outlet />;
}
