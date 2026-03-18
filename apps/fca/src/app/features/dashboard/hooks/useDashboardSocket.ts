import { useEffect, useRef } from 'react';
import { LOG } from '@/log';
import { WebSocketClient } from '@/shared-util';
import { useDashboardSocketStore } from './useDashboardSocketStore';
import type { DashboardWsServerMessage } from '../types/dashboard.types';

const Log = new LOG('useDashboardSocket');

/**
 * 대시보드 WebSocket 연결 관리 훅
 *
 * - WS 연결/해제 라이프사이클 관리
 * - 수신 메시지를 Zustand 스토어로 라우팅
 */
export function useDashboardSocket() {
  const wsRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    const { setWsId, setIsConnected, setSend, setWidgetData, setWidgetError, reset } = useDashboardSocketStore.getState();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/proxy/fca/monitoring`;

    const client = new WebSocketClient(wsUrl, { messageLog: false });
    wsRef.current = client;

    client.onopen = () => {
      Log.info('[onopen]');
      setIsConnected(true);
      setSend((data: Record<string, unknown>) => {
        Log.debug(`[send][${data.type}]`, data);
        client.send(data);
      });
    };

    client.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data) as DashboardWsServerMessage;
        switch (msg.type) {
          case 'CONNECTED':
            setWsId(msg.wsId);
            Log.success('[onmessage][CONNECTED]', msg);
            break;
          case 'SUBSCRIBED':
            Log.success('[onmessage][SUBSCRIBED]', msg);
            break;
          case 'DATA':
            setWidgetData(msg.widgetId, msg.data);
            break;
          case 'ERROR':
            Log.error('[onmessage][ERROR]', msg);
            setWidgetError(msg.widgetId, msg.message);
            break;
          default:
            Log.warn(`[onmessage][UNKNOWN] ${(msg as { type?: string })?.type}`, event.data);
        }
      } catch (error) {
        Log.error('Failed to parse Dashboard WS message', error);
      }
    };

    client.onclose = (event) => {
      Log.warn('[onclose]', `Code: ${event.code}`);
      setIsConnected(false);
      setSend(null);
    };

    client.onerror = (event) => {
      Log.error('[onerror]', event);
    };

    client.connect().catch((error) => {
      Log.error('[connect error]', error);
    });

    return () => {
      wsRef.current?.disconnect();
      wsRef.current = null;
      reset();
    };
  }, []);
}
