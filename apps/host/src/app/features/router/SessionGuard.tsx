import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { LOG } from '@/log';

import { useGetSession } from '../common/hooks/useSessionQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('SessionGuard');

/** 공개 전광판 토큰 접근 경로 — 세션 체크 우회 */
function isPublicTokenRoute(pathname: string, search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has('token') && (pathname.endsWith('task-mgmt') || pathname.endsWith('task-view'));
}

export default function SessionGuard({ children }: { children?: React.ReactNode }) {
  const location = useLocation();

  // 공개 URL(?token=...) 접근 시 세션 체크 없이 통과
  if (isPublicTokenRoute(location.pathname, location.search)) {
    return children ?? <Outlet />;
  }

  return <SessionGuardInner>{children}</SessionGuardInner>;
}

function SessionGuardInner({ children }: { children?: React.ReactNode }) {
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
