import { Navigate, Outlet } from 'react-router-dom';
import { LOG } from '@/log';
import { useGetUserInfo } from '../../features/auth/hooks/useAuthQueries';
import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';

const Log = new LOG('RouteGuard');

export default function RouteGuard() {
  const { data: userInfo, isFetching, isError, error } = useGetUserInfo();
  if (isFetching) {
    Log.debug('Fetching...');
    return <FallbackSpinner useFullScreen />;
  }
  if (isError) {
    Log.error('Failed to get user info', error);
    return <Navigate to="/login" />;
  }
  Log.debug('User info fetched successfully. userInfo: ', userInfo);
  return <Outlet />;
}
