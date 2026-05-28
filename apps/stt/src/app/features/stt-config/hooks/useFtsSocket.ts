import { useCallback, useRef } from 'react';
import { LOG } from '@/log';
import { WebSocketClient } from '@/shared-util';

const Log = new LOG('useFtsSocket');

export interface FtsSendParams {
  fileName: string;
  filePath: string;
}

export interface FtsAckResult {
  fileName: string;
  success: boolean;
  error?: string;
}

interface FtsAckMessage {
  command: string;
  fileName: string;
  success: boolean;
  FILEPATH?: string;
  error?: string;
}

export function useFtsSocket() {
  const wsRef = useRef<WebSocketClient | null>(null);
  const onAckRef = useRef<((result: FtsAckResult) => void) | null>(null);

  const connect = useCallback((onAck: (result: FtsAckResult) => void): Promise<void> => {
    onAckRef.current = onAck;

    if (wsRef.current) return Promise.resolve();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/proxy/stt/file-upload`;

    const client = new WebSocketClient(wsUrl, { messageLog: false });
    wsRef.current = client;

    client.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data) as FtsAckMessage;
        if (msg.command === 'SEND_TO_FTS_SINGLE_ACK') {
          Log.debug('[ACK]', msg);
          onAckRef.current?.({ fileName: msg.fileName, success: msg.success, error: msg.error });
        }
      } catch (error) {
        Log.error('Failed to parse WS message', error);
      }
    };

    client.onclose = (event) => {
      Log.warn('[onclose]', `Code: ${event.code}`);
      wsRef.current = null;
    };

    client.onerror = (event) => {
      Log.error('[onerror]', event);
    };

    return client
      .connect()
      .then(() => undefined)
      .catch((error: unknown) => {
        Log.error('[connect error]', error);
        wsRef.current = null;
        throw error;
      });
  }, []);

  const send = useCallback((params: FtsSendParams) => {
    if (!wsRef.current) {
      Log.warn('[send] WebSocket not connected');
      return;
    }
    Log.debug('[send][SEND_TO_FTS_SINGLE]', params);
    wsRef.current.send({ command: 'SEND_TO_FTS_SINGLE', ...params });
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
    wsRef.current = null;
  }, []);

  return { connect, send, disconnect };
}
