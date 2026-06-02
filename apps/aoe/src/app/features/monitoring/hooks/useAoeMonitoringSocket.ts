import { useEffect, useRef, useState } from 'react';
import { WebSocketClient } from '@/shared-util';
import { AOE_MONI_MSG, type AoeMoniServerMessage, type AoeMoniWidgetData, type AoeWidgetType } from '../types';

export interface AoeMonitoringSocketOptions {
  /** 기준일 (yyyyMMdd) */
  baseDate?: string;
  /** 에이전트 ID (전체면 미지정) */
  agentId?: string;
  /** TOP-N (llmModels / agentSummary) */
  topN?: number;
  /** 구독할 위젯 타입 */
  widgetTypes: AoeWidgetType[];
}

interface AoeMonitoringSocketState {
  connected: boolean;
  data: AoeMoniWidgetData;
}

/**
 * AOE 모니터링 WebSocket 훅.
 * <p>BFF 프록시(/ws/proxy/aoe/monitoring) → AOE /ws/monitoring 에 연결하여
 * widgetType 별로 구독하고, 서버 tick 마다 수신한 데이터를 위젯 타입별로 보관한다.
 * baseDate/agentId/topN 변경 시 재연결한다.</p>
 */
export function useAoeMonitoringSocket(options: AoeMonitoringSocketOptions): AoeMonitoringSocketState {
  const { baseDate, agentId, topN, widgetTypes } = options;
  const wsRef = useRef<WebSocketClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<AoeMoniWidgetData>({});

  // 옵션 직렬화 (재연결 트리거)
  const depKey = JSON.stringify({ baseDate, agentId, topN, widgetTypes });

  useEffect(() => {
    setData({});
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/proxy/aoe/monitoring`;
    const client = new WebSocketClient(wsUrl, { messageLog: false });
    wsRef.current = client;

    const subscribeAll = () => {
      for (const widgetType of widgetTypes) {
        client.send({
          type: AOE_MONI_MSG.SUBSCRIBE,
          widgetId: widgetType,
          widgetType,
          options: { baseDate, agentId, topN },
        });
      }
    };

    client.onopen = () => setConnected(true);

    client.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data) as AoeMoniServerMessage;
        if (msg.type === AOE_MONI_MSG.CONNECTED) {
          subscribeAll();
        } else if (msg.type === AOE_MONI_MSG.DATA && msg.widgetType) {
          setData((prev) => ({ ...prev, [msg.widgetType as AoeWidgetType]: msg.data }));
        }
      } catch {
        /* ignore malformed frame */
      }
    };

    client.onclose = () => setConnected(false);
    client.onerror = () => setConnected(false);

    client.connect().catch(() => setConnected(false));

    return () => {
      wsRef.current?.disconnect();
      wsRef.current = null;
      setConnected(false);
    };
  }, [depKey]);

  return { connected, data };
}
