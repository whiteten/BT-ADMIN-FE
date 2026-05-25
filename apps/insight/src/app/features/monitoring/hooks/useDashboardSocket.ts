import { useCallback, useEffect, useRef, useState } from 'react';
import type { Widget, WsConnectionState, WsDataMessage, WsSubscribeMessage } from '../types';

/**
 * useDashboardSocket — WebSocket 인프라 (M17)
 *
 * BE 미구현 상태에서는 mock 동작:
 * - WebSocket 연결 시도 → 실패해도 connectionState='connected' 시뮬레이션
 * - 위젯 구독 후 refreshThrottle 주기로 mock DATA 메시지 디스패치
 *
 * BE 구현 후: 실제 WebSocket 연결 + 메시지 송수신
 */

const WS_ENDPOINT = '/ws/insight/monitoring';
const MOCK_MODE = true; // BE 미구현 — true. BE 구현 후 false 또는 자동 분기

interface UseDashboardSocketOptions {
  dashboardId: number;
  widgets: Widget[];
  /** 사용자 갱신 간격 throttle (1·3·5·10초·PAUSED) */
  refreshThrottle: 1 | 3 | 5 | 10 | 'PAUSED';
  /** 글로벌 옵션 (검색조건 등) */
  globalOptions?: Record<string, unknown>;
}

interface WidgetData {
  rows: Record<string, unknown>[] | Record<string, unknown>;
  serverTs: number;
}

export interface UseDashboardSocketResult {
  connectionState: WsConnectionState;
  widgetData: Record<string, WidgetData>;
  /** 강제 재구독 (옵션 변경 시 호출) */
  resubscribe: () => void;
}

export function useDashboardSocket({ dashboardId, widgets, refreshThrottle, globalOptions = {} }: UseDashboardSocketOptions): UseDashboardSocketResult {
  const [connectionState, setConnectionState] = useState<WsConnectionState>('connecting');
  const [widgetData, setWidgetData] = useState<Record<string, WidgetData>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ─── 실제 WebSocket 연결 (BE 구현 후 활성화) ──────────────────────

  const connect = useCallback(() => {
    if (MOCK_MODE) {
      // Mock — 즉시 connected
      setConnectionState('connecting');
      const t = setTimeout(() => setConnectionState('connected'), 300);
      return () => clearTimeout(t);
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${protocol}://${window.location.host}${WS_ENDPOINT}?dashboardId=${dashboardId}`;
      const ws = new WebSocket(url);
      socketRef.current = ws;
      setConnectionState('connecting');

      ws.onopen = () => {
        setConnectionState('connected');
        reconnectAttemptRef.current = 0;
        // 모든 위젯 SUBSCRIBE
        widgets.forEach((w) => {
          const msg: WsSubscribeMessage = {
            type: 'SUBSCRIBE',
            widgetId: String(w.widgetId),
            kind: w.kind,
            datasetId: w.kind === 'TEMPLATE' ? w.datasetId : undefined,
            widgetTypeId: w.kind === 'CUSTOM' ? w.widgetTypeId : undefined,
            options: globalOptions,
          };
          ws.send(JSON.stringify(msg));
        });
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'DATA') {
            const dataMsg = msg as WsDataMessage;
            setWidgetData((prev) => ({
              ...prev,
              [dataMsg.widgetId]: { rows: dataMsg.data as Record<string, unknown>[], serverTs: dataMsg.serverTs },
            }));
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnectionState('disconnected');
        socketRef.current = null;
        // exponential backoff 재연결 (1·2·4·8·16·32초)
        const delay = Math.min(32000, 1000 * Math.pow(2, reconnectAttemptRef.current));
        reconnectAttemptRef.current += 1;
        if (reconnectAttemptRef.current <= 5) {
          setConnectionState('reconnecting');
          reconnectTimerRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        setConnectionState('disconnected');
      };
    } catch {
      setConnectionState('disconnected');
    }
  }, [dashboardId, widgets, globalOptions]);

  // ─── Mock 데이터 push 시뮬레이션 ─────────────────────────────────────

  useEffect(() => {
    if (!MOCK_MODE || connectionState !== 'connected') return;
    if (refreshThrottle === 'PAUSED') return;

    const intervalMs = refreshThrottle * 1000;
    mockIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const next: Record<string, WidgetData> = {};
      widgets.forEach((w) => {
        // mock data는 실제 위젯 컴포넌트가 generateMockRows로 자체 처리하므로
        // 여기서는 serverTs만 갱신해서 "받았다"는 시그널
        next[String(w.widgetId)] = { rows: [], serverTs: now };
      });
      setWidgetData((prev) => ({ ...prev, ...next }));
    }, intervalMs);

    return () => {
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current);
        mockIntervalRef.current = null;
      }
    };
  }, [connectionState, refreshThrottle, widgets]);

  // ─── 연결 시작 / 정리 ────────────────────────────────────────────────

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current);
        mockIntervalRef.current = null;
      }
    };
  }, [dashboardId]);

  // ─── 재구독 (글로벌 옵션 변경 시) ────────────────────────────────────

  const resubscribe = useCallback(() => {
    if (MOCK_MODE || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    widgets.forEach((w) => {
      socketRef.current!.send(JSON.stringify({ type: 'UNSUBSCRIBE', widgetId: String(w.widgetId) }));
      const msg: WsSubscribeMessage = {
        type: 'SUBSCRIBE',
        widgetId: String(w.widgetId),
        kind: w.kind,
        datasetId: w.kind === 'TEMPLATE' ? w.datasetId : undefined,
        widgetTypeId: w.kind === 'CUSTOM' ? w.widgetTypeId : undefined,
        options: globalOptions,
      };
      socketRef.current!.send(JSON.stringify(msg));
    });
  }, [widgets, globalOptions]);

  return { connectionState, widgetData, resubscribe };
}
