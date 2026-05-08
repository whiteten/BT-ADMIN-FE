import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { findMenuByLocation, hasAllPermissions } from './lib/menuPermission';

export default function RouteGuard({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const { apps, permissions } = useNavigationStore();
  const lastValidPathRef = useRef<string | null>(null);

  const menu = findMenuByLocation(apps, location);
  const allowed = hasAllPermissions(permissions, menu?.permissions);

  useEffect(() => {
    if (allowed && menu) {
      lastValidPathRef.current = location.pathname + location.search;
    } else if (!allowed) {
      toast.warning('접근 권한이 없습니다.');
    }
  }, [allowed, menu, location.pathname, location.search]);

  if (!allowed) {
    return <Navigate to={lastValidPathRef.current ?? '/'} replace />;
  }

  return children ?? <Outlet />;
}
