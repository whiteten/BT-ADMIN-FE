import { useEffect, useRef } from 'react';
import { LOG } from '@/log';
import { WebSocketClient, toast } from '@/shared-util';

const Log = new LOG('useSessionSocket');

interface UseSessionSocketOptions {
  ticket: string | null;
  onClose?: () => void;
  onError?: () => void;
}

/**
 * 세션 기반 WebSocket 연결 및 서버 이벤트 처리 훅
 */
export function useSessionSocket({ ticket, onClose, onError }: UseSessionSocketOptions) {
  const wsRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    if (!ticket) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/session?ticket=${encodeURIComponent(ticket)}`;

    const client = new WebSocketClient(wsUrl);
    wsRef.current = client;

    client.onmessage = (event: MessageEvent) => {
      try {
        const wsEvent = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('WS_SESSION', { detail: wsEvent }));
      } catch (error) {
        Log.error('Failed to parse Session WS message', error);
        toast.error('Failed to parse Session WS message');
      }
    };

    client.onclose = (event) => {
      Log.warn('Session WS closed', event);
      onClose?.();
    };

    client.onerror = (event) => {
      Log.error('Session WS occurred error', event);
      onError?.();
    };

    client.connect().catch((error) => {
      Log.error('Failed to connect Session WS', error);
      // toast.error('Failed to connect Session WS');
    });

    return () => {
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, [ticket, onClose, onError]);
}
