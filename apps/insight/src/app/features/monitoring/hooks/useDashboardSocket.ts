import { useCallback, useEffect, useRef, useState } from 'react';
import type { Widget, WsConnectionState, WsServerMessage, WsSubscribeMessage } from '../types';
import { getCustomWidgetFields } from '../widgets/registry';

/**
 * useDashboardSocket — WebSocket 인프라 (M17)
 *
 * BE INSIGHT `MonitoringWebSocketHandler` 와 BFF WebSocket 프록시(/ws/proxy/insight/monitoring)
 * 를 통해 양방향 통신한다.
 *
 * Envelope 은 BE 와 1:1 일치 — CONNECTED · SUBSCRIBE · SUBSCRIBED · DATA ·
 * UNSUBSCRIBE · UNSUBSCRIBED · ERROR. v0.1 에서는 CUSTOM 위젯만 지원
 * (`widget.kind === 'CUSTOM'` 만 SUBSCRIBE 송신, TEMPLATE 은 skip).
 *
 * MOCK_MODE — BE 미가동 / 로컬 시연 용도. 기본 false. true 로 두면 위젯별 빈 데이터 tick 만 발생.
 */

const WS_ENDPOINT = '/ws/proxy/insight/monitoring';
const MOCK_MODE = false;

interface UseDashboardSocketOptions {
  dashboardId: number;
  widgets: Widget[];
  /** 사용자 갱신 간격 throttle (1·3·5·10초·PAUSED) */
  refreshThrottle: 1 | 3 | 5 | 10 | 'PAUSED';
  /** 글로벌 옵션 (검색조건 등) */
  globalOptions?: Record<string, unknown>;
  /** 위젯 인스턴스별 사용자 설정 (TB_BT_IS_MON_WIDGET_USER_SETTING). SUBSCRIBE 시 widget.options 위에 머지. */
  widgetUserSettings?: Record<string, Record<string, unknown>>;
  /** false 면 WebSocket 연결을 시도하지 않고 idle 상태 유지 (사용자가 ▶ 누르기 전). */
  enabled?: boolean;
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

export function useDashboardSocket({
  dashboardId,
  widgets,
  refreshThrottle,
  globalOptions = {},
  widgetUserSettings = {},
  enabled = true,
}: UseDashboardSocketOptions): UseDashboardSocketResult {
  const [connectionState, setConnectionState] = useState<WsConnectionState>(enabled ? 'connecting' : 'idle');
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
        // CUSTOM 위젯만 SUBSCRIBE — TEMPLATE 위젯은 v0.1 OUT
        widgets.forEach((w) => {
          if (w.kind !== 'CUSTOM') return;
          const fields = getCustomWidgetFields(w.widgetTypeId);
          const msg: WsSubscribeMessage = {
            type: 'SUBSCRIBE',
            widgetId: String(w.widgetId),
            widgetType: w.widgetTypeId,
            options: {
              ...(w.options ?? {}),
              ...globalOptions,
              ...(widgetUserSettings[String(w.widgetId)] ?? {}),
              ...(fields && fields.length > 0 ? { fields } : {}),
            },
          };
          ws.send(JSON.stringify(msg));
        });
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsServerMessage;
          if (msg.type === 'DATA') {
            setWidgetData((prev) => ({
              ...prev,
              [msg.widgetId]: { rows: msg.data as Record<string, unknown>[] | Record<string, unknown>, serverTs: Date.now() },
            }));
          }
          // CONNECTED / SUBSCRIBED / UNSUBSCRIBED / ERROR 는 디버그 외 별도 처리 불필요
        } catch {
          // ignore parse errors (텍스트가 JSON 아닌 경우)
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
    if (!enabled) {
      setConnectionState('idle');
      return;
    }
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
  }, [dashboardId, enabled]);

  // ─── 재구독 (글로벌 옵션 변경 시) ────────────────────────────────────

  const resubscribe = useCallback(() => {
    if (MOCK_MODE || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    widgets.forEach((w) => {
      if (w.kind !== 'CUSTOM') return;
      socketRef.current!.send(JSON.stringify({ type: 'UNSUBSCRIBE', widgetId: String(w.widgetId) }));
      const fields = getCustomWidgetFields(w.widgetTypeId);
      const msg: WsSubscribeMessage = {
        type: 'SUBSCRIBE',
        widgetId: String(w.widgetId),
        widgetType: w.widgetTypeId,
        options: {
          ...(w.options ?? {}),
          ...globalOptions,
          ...(widgetUserSettings[String(w.widgetId)] ?? {}),
          ...(fields && fields.length > 0 ? { fields } : {}),
        },
      };
      socketRef.current!.send(JSON.stringify(msg));
    });
  }, [widgets, globalOptions, widgetUserSettings]);

  return { connectionState, widgetData, resubscribe };
}
