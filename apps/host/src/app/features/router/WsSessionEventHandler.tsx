import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LOG } from '@/log';
import { sharedApi } from '@/shared-api';

const Log = new LOG('WsSessionEventHandler');

const WS_SESSION_EVENT_TYPES = {
  PERMISSION_CHANGED: 'PERMISSION_CHANGED',
  LOGOUT: 'LOGOUT',
} as const;

export default function WsSessionEventHandler() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent;
      switch (detail.type) {
        case WS_SESSION_EVENT_TYPES.PERMISSION_CHANGED:
          Log.info('EVT: PERMISSION_CHANGED', detail);
          queryClient.invalidateQueries({ queryKey: sharedApi.common.queryKeys.getNavigation._def });
          break;
        case WS_SESSION_EVENT_TYPES.LOGOUT:
          Log.info('EVT: LOGOUT', detail);
          navigate('/login');
          break;
        default:
          Log.info('EVT: UNKNOWN', detail);
          break;
      }
    };
    window.addEventListener('WS_SESSION', handler);
    return () => window.removeEventListener('WS_SESSION', handler);
  }, [queryClient, navigate]);

  return <Outlet />;
}
