import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LOG } from '@/log';
import { scenarioQueryKeys } from '../scenario/hooks/useScenarioQueries';

const Log = new LOG('IvrWsSessionEventHandler');

const WS_SESSION_EVENT_TYPES = {
  IVR_SCENARIO_UPLOADED: 'IVR_SCENARIO_UPLOADED',
} as const;

export default function IvrWsSessionEventHandler() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent;
      switch (detail.type) {
        case WS_SESSION_EVENT_TYPES.IVR_SCENARIO_UPLOADED:
          Log.info(`EVT: ${WS_SESSION_EVENT_TYPES.IVR_SCENARIO_UPLOADED}`, detail);
          queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getVersions._def });
          queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getVersionDetail._def });
          queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
          break;
        default:
          break;
      }
    };
    window.addEventListener('WS_SESSION', handler);
    return () => window.removeEventListener('WS_SESSION', handler);
  }, [queryClient]);

  return <Outlet />;
}
