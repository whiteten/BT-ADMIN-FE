import { useCallback, useEffect, useRef, useState } from 'react';
import { WebSocketClient } from '@/shared-util';
import type { ChannelFlowDetail, ChannelFlowTarget } from './types';

const WS_PATH = '/ws/proxy/insight/channel-flow';

/**
 * 채널 상세 실시간 트래킹/대화 WS 클라이언트.
 *
 * BE INSIGHT `ChannelFlowWebSocketHandler` 와 BFF 프록시(/ws/proxy/insight/channel-flow)로 통신.
 * 실시간 봇 트래킹(`useBotRealtimeSocket`)과 동일 패턴 — 드로어 열림 시 `track()`(TRACK 송신),
 * 닫힘 시 `untrack()`(UNTRACK 송신 + 연결 종료). 채널 격자는 별도 대시보드 WS 가 담당하므로
 * 본 훅은 드로어 상세만 다룬다.
 */
export function useChannelFlowSocket() {
  const [detail, setDetail] = useState<ChannelFlowDetail | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocketClient | null>(null);
  const pendingTargetRef = useRef<ChannelFlowTarget | null>(null);

  const sendTrack = useCallback((target: ChannelFlowTarget) => {
    wsRef.current?.send(JSON.stringify({ type: 'TRACK', ...target }));
  }, []);

  /** 드로어 열림 — 연결 후 TRACK 송신. 이미 연결돼 있으면 즉시 TRACK. */
  const track = useCallback(
    (target: ChannelFlowTarget) => {
      setDetail(null);
      pendingTargetRef.current = target;

      if (wsRef.current) {
        // 기존 연결 재사용
        sendTrack(target);
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}${WS_PATH}`;
      const client = new WebSocketClient(wsUrl, { messageLog: false });
      wsRef.current = client;

      client.onopen = () => {
        setConnected(true);
        const pending = pendingTargetRef.current;
        if (pending) sendTrack(pending);
      };

      client.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data) as { type: string; data?: unknown };
          if (msg.type === 'SESSION_DETAIL') {
            const data = msg.data as ChannelFlowDetail;
            if (data.callEnded) {
              // 콜 종료 신호 — 기존 흐름 유지, callEnded 플래그만 갱신
              setDetail((prev) => (prev ? { ...prev, callEnded: true } : data));
            } else {
              setDetail(data);
            }
          }
          // CONNECTED 는 별도 처리 불필요
        } catch (e) {
          console.warn('Failed to parse channel-flow WS message', e);
        }
      };

      client.onclose = () => setConnected(false);
      client.onerror = () => setConnected(false);

      client.connect().catch((e) => console.warn('channel-flow WS connect failed', e));
    },
    [sendTrack],
  );

  /** 드로어 닫힘 — UNTRACK 송신 후 연결 종료. */
  const untrack = useCallback(() => {
    pendingTargetRef.current = null;
    wsRef.current?.send(JSON.stringify({ type: 'UNTRACK' }));
    wsRef.current?.disconnect();
    wsRef.current = null;
    setConnected(false);
    setDetail(null);
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, []);

  return { detail, connected, track, untrack };
}
