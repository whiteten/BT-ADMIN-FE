import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Log } from '@/log';
import { useNavigationStore } from '@/shared-store';
import { findMenuByLocation, hasAllPermissions } from './lib/menuPermission';

export default function RouteGuard({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const { apps, permissions } = useNavigationStore();
  const lastValidPathRef = useRef<string | null>(null);

  const menu = findMenuByLocation(apps, location);
  const allowed = hasAllPermissions(permissions, menu?.permissions);

  useEffect(() => {
    const target = location.pathname + location.search;
    if (allowed) {
      lastValidPathRef.current = target;
    } else {
      Log.warn('[RouteGuard] 접근 권한 없음 → /forbidden', {
        from: lastValidPathRef.current ?? '(from is empty)',
        to: target,
      });
    }
  }, [allowed, location.pathname, location.search]);

  if (!allowed) {
    return <Navigate to="/forbidden" replace />;
  }

  return children ?? <Outlet />;
}
