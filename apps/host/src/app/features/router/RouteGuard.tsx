import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { LOG } from '@/log';

const Log = new LOG('RouteGuard');

export default function RouteGuard({ children }: { children?: React.ReactNode }) {
  // TODO: Route 접근 권한 체크 로직 추가
  // return <Navigate to="/forbidden" />;
  return children ?? <Outlet />;
}
