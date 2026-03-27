import { useCallback, useEffect, useRef, useState } from 'react';
import { WebSocketClient } from '@/shared-util';
import type { TrackingPushData, TrackingSession, TrackingSessionDetail } from '../types/tracking.types';

const WS_PATH = '/ws/proxy/fca/tracking';

export interface TrackMessage {
  type: 'TRACK';
  ucid: string;
  nexthop: number;
  systemId: number;
  sleeChno: number;
}

export interface UntrackMessage {
  type: 'UNTRACK';
}

export type TrackingWsMessage = TrackMessage | UntrackMessage;

export function useBotRealtimeSocket() {
  const [sessions, setSessions] = useState<TrackingSession[]>([]);
  const [connected, setConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<TrackingSessionDetail | null>(null);
  const wsRef = useRef<WebSocketClient | null>(null);

  const send = useCallback((data: TrackingWsMessage) => {
    wsRef.current?.send(JSON.stringify(data));
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
    }

    setIsPlaying(true);
    setSessionDetail(null);
    setSessions([]);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${WS_PATH}`;

    const client = new WebSocketClient(wsUrl, { messageLog: false });
    wsRef.current = client;

    client.onopen = () => {
      setConnected(true);
    };

    client.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; data?: unknown };
        switch (msg.type) {
          case 'CONNECTED':
            break;
          case 'TRACKING_UPDATE': {
            const data = msg.data as TrackingPushData;
            setSessions(data.items ?? []);
            break;
          }
          case 'SESSION_DETAIL': {
            const data = msg.data as TrackingSessionDetail;
            if (data.callEnded) {
              // 콜 종료 신호 → 기존 대화 흐름 유지, callEnded 플래그만 추가
              setSessionDetail((prev) => (prev ? { ...prev, callEnded: true } : data));
            } else {
              setSessionDetail(data);
            }
            break;
          }
          default:
            break;
        }
      } catch (e) {
        console.warn('Failed to parse tracking WS message', e);
      }
    };

    client.onclose = () => {
      setConnected(false);
    };

    client.onerror = () => {
      setConnected(false);
    };

    client.connect().catch(console.error);
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
    wsRef.current = null;
    setConnected(false);
    setIsPlaying(false);
    setSessions([]);
  }, []);

  const clearSessionDetail = useCallback(() => {
    setSessionDetail(null);
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.disconnect();
    };
  }, []);

  return { sessions, connected, isPlaying, connect, disconnect, sessionDetail, clearSessionDetail, send };
}
