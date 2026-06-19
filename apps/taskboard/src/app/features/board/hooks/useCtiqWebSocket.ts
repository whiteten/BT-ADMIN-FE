import { useEffect, useRef, useState } from 'react';

export type CtiqRecord = Record<string, string | number | null>;

/** 하나의 Redis hashKey + 그 안에서 조회할 id(필드명) 목록 + (선택) 받을 컬럼 제한. */
export interface CtiWsSubscription {
  hashKey: string;
  ids: string[];
  /** 지정하면 BE가 raw JSON에서 이 컬럼만 추려 보낸다(대소문자 무시). 미지정 시 전체 컬럼. */
  columns?: string[];
}

/** hashKey → (id → KPI record) */
export type CtiWsDataByHashKey = Record<string, Record<string, CtiqRecord>>;

export interface CtiWsResult {
  dataByHashKey: CtiWsDataByHashKey;
  isConnected: boolean;
}

const RECONNECT_DELAY_MS = 3000;

function subscriptionsKey(subs: CtiWsSubscription[]): string {
  return subs
    .map((s) => `${s.hashKey}:${[...s.ids].sort().join(',')}:${[...(s.columns ?? [])].sort().join(',')}`)
    .sort()
    .join('|');
}

/**
 * CTI 실시간 WebSocket 훅 — 여러 hashKey(큐/그룹/상담사 등)를 한 번의 연결로 동시 구독한다.
 * BE: /ws/ctiq (BFF 프록시: /ws/proxy/taskboard/ctiq → ws://taskboard:8600/ws/ctiq)
 *
 * BFF relay(Mono.zip)가 백엔드 idle 구간에서 종료되는 경우가 있으므로
 * onclose 시 RECONNECT_DELAY_MS 후 자동 재연결한다.
 *
 * 프로토콜 (hashKey는 임의 Redis Hash 키를 받을 수 있음 — BE CtiRedisPoller가
 * 처음 보는 hashKey도 즉시 폴링해 응답하므로 신규 hashKey 추가 시 BE 수정 불필요):
 *   요청: { action:"subscribe", subscriptions:[{hashKey:"IC:CTIQ:0", ids:["Q1","Q2"]}, ...] }
 *   응답: { data: { "IC:CTIQ:0": {"Q1":{...kpi}, "Q2":{...kpi}} }, timestamp }
 */
export function useCtiqWebSocket(subscriptions: CtiWsSubscription[], intervalMs = 5000): CtiWsResult {
  const [dataByHashKey, setDataByHashKey] = useState<CtiWsDataByHashKey>({});
  const [isConnected, setIsConnected] = useState(false);

  const subsKey = subscriptionsKey(subscriptions);
  const subsRef = useRef(subscriptions);
  subsRef.current = subscriptions;

  useEffect(() => {
    if (!subsKey) return;

    let destroyed = false;
    let ws: WebSocket | null = null;
    let sendTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (sendTimer) {
        clearInterval(sendTimer);
        sendTimer = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connect = () => {
      if (destroyed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/proxy/taskboard/ctiq`);

      const send = () => {
        if (ws?.readyState === WebSocket.OPEN && subsRef.current.length > 0) {
          ws.send(JSON.stringify({ action: 'subscribe', subscriptions: subsRef.current }));
        }
      };

      ws.onopen = () => {
        setIsConnected(true);
        send();
        sendTimer = setInterval(send, intervalMs);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as { data?: CtiWsDataByHashKey };
          if (msg.data) setDataByHashKey(msg.data);
        } catch {
          /* JSON 파싱 오류 무시 */
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (sendTimer) {
          clearInterval(sendTimer);
          sendTimer = null;
        }
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => setIsConnected(false);
    };

    connect();

    return () => {
      destroyed = true;
      clearTimers();
      ws?.close();
    };
  }, [subsKey, intervalMs]);

  return { dataByHashKey, isConnected };
}
