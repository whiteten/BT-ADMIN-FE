import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LOG } from '@/log';
import { modelQueryKeys } from '../bot-config/hooks/useModelQueries';

const Log = new LOG('FcaWsSessionEventHandler');

const WS_SESSION_EVENT_TYPES = {
  TRAIN_STATUS_CHANGED: 'TRAIN_STATUS_CHANGED' as const,
};

export default function FcaWsSessionEventHandler() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent;
      const { type } = detail;
      if (type === WS_SESSION_EVENT_TYPES.TRAIN_STATUS_CHANGED) {
        Log.info('TRAIN_STATUS_CHANGED');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getModels._def });
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getModel._def });
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntents._def });
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntentSentences._def });
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntities._def });
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntityValues._def });
      }
    };
    window.addEventListener('WS_SESSION', handler);
    return () => window.removeEventListener('WS_SESSION', handler);
  }, [queryClient]);

  return <Outlet />;
}
