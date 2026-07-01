import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { LOG } from '@/log';

import { useGetSession } from '../common/hooks/useSessionQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('SessionGuard');

/**
 * 세션 인증 없이 접근 가능한 공개 경로 프리픽스.
 * 이 경로에서는 useGetSession 결과가 에러여도 /login으로 리다이렉트하지 않는다.
 * 현재 예외: taskboard 새창 롤링, taskboard 공개 전광판 뷰
 * (apps/taskboard/CHANGELOG.md에 변경 이유 기록됨)
 */
const PUBLIC_PATH_PREFIXES = ['/taskboard/board/task-rolling', '/taskboard/board/task-view-public/'];

export default function SessionGuard({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();
  const { data: response, isLoading, isError, error } = useGetSession({ params: { t: dayjs().format('YYYYMMDDHHmmss') } });

  useEffect(() => {
    if (response) {
      Log.debug('Session check successfully.');
    }
  }, [response]);

  // 공개 경로는 세션 오류가 있어도 통과 — hook은 항상 호출(Hook Rules 준수)
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return children ?? <Outlet />;
  }

  if (isLoading) {
    return <FallbackSpinner useFullScreen />;
  }
  if (isError) {
    Log.error('Failed to check session', error);
    return <Navigate to="/login" />;
  }
  return children ?? <Outlet />;
}
