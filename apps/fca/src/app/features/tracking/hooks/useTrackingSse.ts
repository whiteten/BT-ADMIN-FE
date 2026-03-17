import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrackingPushData, TrackingSession, TrackingSessionDetail } from '../types/tracking.types';

const SSE_URL = '/api/bff/sse/fca/tracking/bot-realtime';

export function useTrackingSse() {
  const [sessions, setSessions] = useState<TrackingSession[]>([]);
  const [connected, setConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<TrackingSessionDetail | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsPlaying(true);

    const es = new EventSource(SSE_URL);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setConnected(true);
    });

    es.addEventListener('tracking-update', (event: MessageEvent) => {
      try {
        const data: TrackingPushData = JSON.parse(event.data);
        setSessions(data.items ?? []);
      } catch (e) {
        console.warn('Failed to parse SSE tracking data', e);
      }
    });

    es.addEventListener('session-detail', (event: MessageEvent) => {
      try {
        const data: TrackingSessionDetail = JSON.parse(event.data);
        setSessionDetail(data);
      } catch (e) {
        console.warn('Failed to parse SSE session detail', e);
      }
    });

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
    setIsPlaying(false);
    setSessions([]);
  }, []);

  const clearSessionDetail = useCallback(() => {
    setSessionDetail(null);
  }, []);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return { sessions, connected, isPlaying, connect, disconnect, sessionDetail, clearSessionDetail };
}
