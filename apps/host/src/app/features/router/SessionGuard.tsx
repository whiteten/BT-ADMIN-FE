import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import dayjs from 'dayjs';
import { LOG } from '@/log';

import { useGetSession } from '../common/hooks/useSessionQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('SessionGuard');

// 공개 경로 예외는 이 가드가 아니라 RouteShell이 담당한다 — 공개(handle.public) 판정 시
// 이 가드 자체가 트리에 없다(PublicRouteGate). 여기는 순수 세션 게이트만 유지할 것.

export default function SessionGuard({ children }: { children?: React.ReactNode }) {
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
  return children ?? <Outlet />;
}
