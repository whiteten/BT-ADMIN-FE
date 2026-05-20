import { useEffect, useRef } from 'react';
import { createShortId } from '@/shared-util';
import { useDashboardSocketStore } from './useDashboardSocketStore';
import { DASHBOARD_MSG_TYPE, type DashboardSubscribeOptions, type DashboardWidgetType } from '../types';

interface UseWidgetSubscriptionOptions {
  widgetType: DashboardWidgetType;
  options: DashboardSubscribeOptions;
  enabled?: boolean;
}

interface UseWidgetSubscriptionReturn {
  data: unknown;
  error: string | undefined;
  widgetId: string;
}

/**
 * 위젯별 WebSocket 구독 훅
 *
 * - mount 시 SUBSCRIBE 메시지 전송
 * - unmount 시 UNSUBSCRIBE 메시지 전송
 * - options 변경 시 SUBSCRIBE 재전송
 */
export function useWidgetSubscription({ widgetType, options, enabled = true }: UseWidgetSubscriptionOptions): UseWidgetSubscriptionReturn {
  const widgetIdRef = useRef(createShortId());
  const widgetId = widgetIdRef.current;

  const wsId = useDashboardSocketStore((s) => s.wsId);
  const isConnected = useDashboardSocketStore((s) => s.isConnected);
  const send = useDashboardSocketStore((s) => s.send);
  const data = useDashboardSocketStore((s) => s.widgetData[widgetId]);
  const error = useDashboardSocketStore((s) => s.widgetErrors[widgetId]);

  const optionsKey = JSON.stringify(options);

  // SUBSCRIBE: wsId가 존재하고 연결됐을 때 전송, 옵션 변경 시 재전송
  useEffect(() => {
    if (!enabled || !wsId || !isConnected || !send) return;
    send({
      wsId,
      type: DASHBOARD_MSG_TYPE.SUBSCRIBE,
      widgetId,
      widgetType,
      options,
    });
  }, [wsId, isConnected, send, enabled, widgetType, widgetId, options, optionsKey]);

  // UNSUBSCRIBE: unmount 시 전송
  useEffect(() => {
    const id = widgetId;
    return () => {
      const { send: currentSend, wsId: currentWsId, removeWidget } = useDashboardSocketStore.getState();
      if (currentSend && currentWsId) {
        currentSend({
          wsId: currentWsId,
          type: DASHBOARD_MSG_TYPE.UNSUBSCRIBE,
          widgetId: id,
        });
      }
      removeWidget(id);
    };
  }, [widgetId]);

  return { data, error, widgetId };
}
