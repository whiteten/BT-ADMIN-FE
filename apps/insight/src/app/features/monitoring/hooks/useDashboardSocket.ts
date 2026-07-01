import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Widget, WsConnectionState, WsServerMessage, WsSubscribeMessage } from '../types';
import { getCustomWidgetFields } from '../widgets/registry';

/**
 * useDashboardSocket — WebSocket 인프라 (M17)
 *
 * BE INSIGHT `MonitoringWebSocketHandler` 와 BFF WebSocket 프록시(/ws/proxy/insight/monitoring)
 * 를 통해 양방향 통신한다.
 *
 * Envelope 은 BE 와 1:1 일치 — CONNECTED · SUBSCRIBE · SUBSCRIBED · DATA ·
 * UNSUBSCRIBE · UNSUBSCRIBED · ERROR. CUSTOM 위젯(`widgetType = widgetTypeId`)과
 * TEMPLATE 위젯(센티넬 `widgetType = 'dataset'`, `options.datasetId`) 모두 SUBSCRIBE 송신.
 *
 * MOCK_MODE — BE 미가동 / 로컬 시연 용도. 기본 false. true 로 두면 위젯별 빈 데이터 tick 만 발생.
 */

const WS_ENDPOINT = '/ws/proxy/insight/monitoring';
const MOCK_MODE = false;

/**
 * 위젯 1개 → SUBSCRIBE 메시지 변환.
 * - CUSTOM: `widgetType = widgetTypeId`, options 에 카탈로그 옵션·글로벌·사용자설정·fields 머지.
 * - TEMPLATE: 센티넬 `widgetType = 'dataset'`, options 에 `datasetId`(필수)·글로벌·사용자설정 머지.
 * - PLACEHOLDER 등 구독 대상이 아니면 null.
 */
function buildSubscribeMessage(w: Widget, globalOptions: Record<string, unknown>, widgetUserSettings: Record<string, Record<string, unknown>>): WsSubscribeMessage | null {
  const userSetting = widgetUserSettings[String(w.widgetId)] ?? {};
  if (w.kind === 'CUSTOM') {
    const fields = getCustomWidgetFields(w.widgetTypeId);
    return {
      type: 'SUBSCRIBE',
      widgetId: String(w.widgetId),
      widgetType: w.widgetTypeId,
      options: {
        ...(w.options ?? {}),
        ...globalOptions,
        ...userSetting,
        ...(fields && fields.length > 0 ? { fields } : {}),
      },
    };
  }
  if (w.kind === 'TEMPLATE') {
    return {
      type: 'SUBSCRIBE',
      widgetId: String(w.widgetId),
      widgetType: 'dataset',
      options: {
        datasetId: w.datasetId,
        ...globalOptions,
        ...userSetting,
      },
    };
  }
  return null;
}

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
  /**
   * 드릴다운 — 대시보드에 없는 위젯 타입을 임시 widgetId(`drill:<type>:<ts>`)로 즉석 구독.
   * 헬스보드 링크 모달 등에서 사용. 데이터는 동일 widgetData[widgetId] 로 수신된다.
   */
  subscribeAdhoc: (widgetId: string, widgetType: string, options?: Record<string, unknown>) => void;
  /** 드릴다운 — 즉석 구독 해제 + 누적 데이터 정리. */
  unsubscribeAdhoc: (widgetId: string) => void;
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
        // CUSTOM·TEMPLATE 위젯 SUBSCRIBE (TEMPLATE 은 widgetType='dataset')
        widgets.forEach((w) => {
          const msg = buildSubscribeMessage(w, globalOptions, widgetUserSettings);
          if (msg) ws.send(JSON.stringify(msg));
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

  // 구독 대상(CUSTOM·TEMPLATE 위젯)의 시그니처. 대시보드가 비동기로 로드되어 위젯이
  // [] → [populated] 로 바뀌면 이 값이 변해 소켓을 재연결 → onopen 에서 최신 위젯으로 SUBSCRIBE.
  // (자동 시작 시 마운트 시점엔 위젯이 아직 로드 전이라 빈 구독이 되는 레이스 방지)
  const subscriptionKey = useMemo(
    () =>
      widgets
        .filter((w) => w.kind === 'CUSTOM' || w.kind === 'TEMPLATE')
        .map((w) => (w.kind === 'CUSTOM' ? `${w.widgetId}:${w.widgetTypeId}` : `${w.widgetId}:dataset:${w.datasetId}`))
        .join(','),
    [widgets],
  );

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
  }, [dashboardId, enabled, subscriptionKey]);

  // ─── 재구독 (글로벌 옵션 변경 시) ────────────────────────────────────

  const resubscribe = useCallback(() => {
    if (MOCK_MODE || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    widgets.forEach((w) => {
      const msg = buildSubscribeMessage(w, globalOptions, widgetUserSettings);
      if (!msg) return;
      socketRef.current!.send(JSON.stringify({ type: 'UNSUBSCRIBE', widgetId: String(w.widgetId) }));
      socketRef.current!.send(JSON.stringify(msg));
    });
  }, [widgets, globalOptions, widgetUserSettings]);

  // ─── 드릴다운 즉석 구독/해제 ─────────────────────────────────────────

  const subscribeAdhoc = useCallback(
    (widgetId: string, widgetType: string, options?: Record<string, unknown>) => {
      const ws = socketRef.current;
      if (MOCK_MODE || !ws || ws.readyState !== WebSocket.OPEN) return;
      const fields = getCustomWidgetFields(widgetType);
      const msg: WsSubscribeMessage = {
        type: 'SUBSCRIBE',
        widgetId,
        widgetType,
        options: {
          ...(options ?? {}),
          ...globalOptions,
          ...(fields && fields.length > 0 ? { fields } : {}),
        },
      };
      ws.send(JSON.stringify(msg));
    },
    [globalOptions],
  );

  const unsubscribeAdhoc = useCallback((widgetId: string) => {
    const ws = socketRef.current;
    if (!MOCK_MODE && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'UNSUBSCRIBE', widgetId }));
    }
    // 모달이 닫혀도 직전 프레임이 잔존하지 않도록 누적 데이터에서 제거.
    setWidgetData((prev) => {
      if (!(widgetId in prev)) return prev;
      const next = { ...prev };
      delete next[widgetId];
      return next;
    });
  }, []);

  return { connectionState, widgetData, resubscribe, subscribeAdhoc, unsubscribeAdhoc };
}
