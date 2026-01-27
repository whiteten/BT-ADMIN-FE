import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import dayjs from 'dayjs';
import { LOG } from '@/log';

import { useGetSession } from '../common/hooks/useActuator';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('RouteGuard');

export default function RouteGuard() {
  const { data: response, isLoading, isError, error } = useGetSession({ params: { t: dayjs().format('YYYYMMDDHHmmss') } });

  useEffect(() => {
    if (response) {
      Log.debug('Session check successfully.');
    }
  }, [response]);

  if (isLoading) {
    return <FallbackSpinner useFullScreen />;
  }
  if (isError) {
    Log.error('Failed to check session', error);
    return <Navigate to="/login" />;
  }
  return <Outlet />;
}
