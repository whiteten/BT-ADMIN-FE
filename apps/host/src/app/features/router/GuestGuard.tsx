import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import dayjs from 'dayjs';

import { useGetSession } from '../common/hooks/useSessionQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

/**
 * SessionGuard의 대칭 가드.
 * 이미 로그인된(세션 유효) 사용자가 /login 등 게스트 전용 화면에 접근하면 메인으로 돌려보낸다.
 * - isLoading: 세션 조회 중 스피너 표시
 * - isError(미인증): children(로그인 화면) 렌더
 * - 성공(인증됨): 메인으로 리다이렉트
 */
export default function GuestGuard({ children }: { children?: React.ReactNode }) {
  const { isLoading, isError } = useGetSession({ params: { t: dayjs().format('YYYYMMDDHHmmss') } });

  if (isLoading) {
    return <FallbackSpinner useFullScreen />;
  }
  if (isError) {
    return children ?? <Outlet />;
  }
  return <Navigate to="/" replace />;
}
