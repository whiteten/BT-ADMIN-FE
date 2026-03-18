import { useEffect, useRef } from 'react';
import { createUUID } from '@/shared-util';
import { useDashboardSocketStore } from './useDashboardSocketStore';
import type { DashboardGlobalOptions, DashboardWidgetOptions, DashboardWidgetType } from '../types/dashboard.types';

interface UseWidgetSubscriptionOptions {
  widgetType: DashboardWidgetType;
  globalOptions: DashboardGlobalOptions;
  widgetOptions?: DashboardWidgetOptions;
  enabled?: boolean;
}

interface UseWidgetSubscriptionReturn {
  data: unknown;
  error: string | undefined;
}

/**
 * 위젯별 WebSocket 구독 훅
 *
 * - mount 시 SUBSCRIBE 메시지 전송
 * - unmount 시 UNSUBSCRIBE 메시지 전송
 * - globalOptions 또는 widgetOptions 변경 시 SUBSCRIBE 재전송
 */
export function useWidgetSubscription({ widgetType, globalOptions, widgetOptions, enabled = true }: UseWidgetSubscriptionOptions): UseWidgetSubscriptionReturn {
  const widgetIdRef = useRef(createUUID());
  const widgetId = widgetIdRef.current;

  const wsId = useDashboardSocketStore((s) => s.wsId);
  const isConnected = useDashboardSocketStore((s) => s.isConnected);
  const send = useDashboardSocketStore((s) => s.send);
  const data = useDashboardSocketStore((s) => s.widgetData[widgetId]);
  const error = useDashboardSocketStore((s) => s.widgetErrors[widgetId]);

  const optionsKey = JSON.stringify({ ...globalOptions, ...widgetOptions });

  // SUBSCRIBE: wsId가 존재하고 연결됐을 때 전송, 옵션 변경 시 재전송
  useEffect(() => {
    if (!enabled || !wsId || !isConnected || !send) return;
    const mergedOptions = { ...globalOptions, ...widgetOptions };
    send({
      wsId,
      type: 'SUBSCRIBE',
      widgetId,
      widgetType,
      options: mergedOptions,
    });
  }, [wsId, isConnected, send, enabled, widgetType, widgetId, globalOptions, widgetOptions, optionsKey]);

  // UNSUBSCRIBE: unmount 시 전송
  useEffect(() => {
    const id = widgetId;
    return () => {
      const { send: currentSend, wsId: currentWsId, removeWidget } = useDashboardSocketStore.getState();
      if (currentSend && currentWsId) {
        currentSend({
          wsId: currentWsId,
          type: 'UNSUBSCRIBE',
          widgetId: id,
        });
      }
      removeWidget(id);
    };
  }, [widgetId]);

  return { data, error };
}
