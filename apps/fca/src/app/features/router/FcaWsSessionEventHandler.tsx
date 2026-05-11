import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LOG } from '@/log';
import { toast } from '@/shared-util';
import { botQueryKeys } from '../bot-config/hooks/useBotQueries';
import { modelQueryKeys } from '../bot-config/hooks/useModelQueries';

const Log = new LOG('FcaWsSessionEventHandler');

const WS_SESSION_EVENT_TYPES = {
  TRAIN_STATUS_CHANGED: 'TRAIN_STATUS_CHANGED',
  SCENARIO_UPLOADED: 'SCENARIO_UPLOADED',
  BOT_VERSION_COPY_COMPLETED: 'BOT_VERSION_COPY_COMPLETED',
} as const;

export default function FcaWsSessionEventHandler() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent;
      switch (detail.type) {
        case WS_SESSION_EVENT_TYPES.TRAIN_STATUS_CHANGED:
          Log.info(`EVT: ${WS_SESSION_EVENT_TYPES.TRAIN_STATUS_CHANGED}`, detail);
          queryClient.invalidateQueries({ queryKey: modelQueryKeys.getModels._def });
          queryClient.invalidateQueries({ queryKey: modelQueryKeys.getModel._def });
          queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntents._def });
          queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntentSentences._def });
          queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntities._def });
          queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntityValues._def });
          break;
        case WS_SESSION_EVENT_TYPES.SCENARIO_UPLOADED:
          Log.info(`EVT: ${WS_SESSION_EVENT_TYPES.SCENARIO_UPLOADED}`, detail);
          queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotVersions._def });
          break;
        case WS_SESSION_EVENT_TYPES.BOT_VERSION_COPY_COMPLETED: {
          Log.info(`EVT: ${WS_SESSION_EVENT_TYPES.BOT_VERSION_COPY_COMPLETED}`, detail);
          const { status, serviceVer, error } = detail.data as {
            serviceId: string;
            serviceVer: string;
            status: 'success' | 'failed';
            error?: string;
          };
          if (status === 'success') {
            toast.success(`버전 ${serviceVer} 복사가 완료되었습니다.`);
          } else {
            toast.error(`버전 ${serviceVer} 복사에 실패했습니다.${error ? ` (${error})` : ''}`);
          }
          queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotVersions._def });
          break;
        }
        default:
          Log.info(`EVT: UNKNOWN`, detail);
          break;
      }
    };
    window.addEventListener('WS_SESSION', handler);
    return () => window.removeEventListener('WS_SESSION', handler);
  }, [queryClient]);

  return <Outlet />;
}
