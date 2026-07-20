import { useEffect, useRef, useState } from 'react';
import { buildWsUrl } from '@/shared-util';
import { isPublicMode } from '../api/publicAuth';

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

/** WS 연결 상태 — 배너 표시용. connecting: 최초 연결 시도, connected: 정상, reconnecting: 끊겨서 재시도 중. */
export type CtiWsStatus = 'connecting' | 'connected' | 'reconnecting';

export interface CtiWsResult {
  dataByHashKey: CtiWsDataByHashKey;
  isConnected: boolean;
  /** 배너/상태 표시용 3단계 상태. isConnected는 status==='connected'와 동일(하위호환). */
  status: CtiWsStatus;
}

/** 재연결 간격 — 최초 3초에서 실패할수록 1.5배씩 늘리되 30초 상한. 연결 성공 시 3초로 리셋. */
const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 30000;

function subscriptionsKey(subs: CtiWsSubscription[]): string {
  return subs
    .map((s) => `${s.hashKey}:${[...s.ids].sort().join(',')}:${[...(s.columns ?? [])].sort().join(',')}`)
    .sort()
    .join('|');
}

/**
 * CTI 실시간 WebSocket 훅 — 여러 hashKey(큐/그룹/상담사·table-redis 등)를 한 번의 연결로 동시 구독한다.
 * BE: /ws/taskboard-rt (BFF 프록시: /ws/proxy/taskboard/taskboard-rt → ws://taskboard:8600/ws/taskboard-rt)
 * (경로명은 "taskboard-rt"이지만 훅/핸들러 이름은 큐 전용이던 시절 이름 그대로 유지 — 2026-06-25 CHANGELOG 참고)
 *
 * 구독은 연결 시 1번만 보낸다 — BE가 5초 주기로 "값이 바뀐 id만" 알아서 푸시해주므로, 클라이언트가
 * 주기적으로 같은 구독을 재전송할 필요가 없다(구독 hashKey/id 수가 늘어나도 변경 없는 항목은 매번
 * 다시 안 보내 페이로드가 무한히 커지지 않음). 받은 메시지는 기존 상태에 병합(merge)한다 — 서버가
 * 보내는 게 "전체 스냅샷"이 아니라 "이번에 바뀐 것만"이라, 통째로 교체하면 안 바뀐 나머지 id가
 * 사라진다.
 *
 * subscriptions 자체가 바뀌면(디스플레이/화면 전환 등) 소켓을 새로 맺고 누적 상태를 리셋한다 —
 * 이전 화면에서 구독하던 hashKey의 값이 새 화면에 남아있으면 안 되기 때문.
 *
 * BFF relay(Mono.zip)가 백엔드 idle 구간에서 종료되는 경우가 있으므로
 * onclose 시 RECONNECT_DELAY_MS 후 자동 재연결한다.
 *
 * 프로토콜(hashKey는 임의 Redis Hash 키를 받을 수 있음 — BE CtiRedisPoller가
 * 처음 보는 hashKey도 즉시 폴링해 응답하므로 신규 hashKey 추가 시 BE 수정 불필요):
 *   요청(연결 시 1회): { action:"subscribe", subscriptions:[{hashKey:"IC:CTIQ:0", ids:["Q1","Q2"]}, ...] }
 *   응답(연결 직후 1회 전체 스냅샷, 이후 5초 주기로 변경분만): { data: { "IC:CTIQ:0": {"Q1":{...kpi}} }, timestamp }
 */
export function useCtiqWebSocket(subscriptions: CtiWsSubscription[]): CtiWsResult {
  const [dataByHashKey, setDataByHashKey] = useState<CtiWsDataByHashKey>({});
  const [status, setStatus] = useState<CtiWsStatus>('connecting');

  const subsKey = subscriptionsKey(subscriptions);
  const subsRef = useRef(subscriptions);
  subsRef.current = subscriptions;

  useEffect(() => {
    if (!subsKey) return;

    // 구독 대상이 바뀌면(디스플레이 전환 등) 이전 화면의 누적값을 들고 있지 않도록 리셋.
    setDataByHashKey({});
    setStatus('connecting');

    let destroyed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = RECONNECT_BASE_MS;
    // 공개(client-credentials) 토큰은 브라우저 WebSocket API 제약상 Authorization 헤더로 실어 보낼 수
    // 없어 /ws/proxy/**(인증 필수) 핸드셰이크가 항상 실패한다(세션 쿠키가 있는 "로그인 상태로 공개
    // URL 접속" 케이스는 예외 — 그 경우 아래에서 실제 연결에 성공하면 정상적으로 무한 재연결로 전환됨).
    // 세션 없는 순수 공개 접근에서 매번 재연결을 시도하면 콘솔에 실패 로그만 계속 쌓이므로,
    // 한 번도 연결에 성공한 적이 없으면 재시도를 포기한다.
    let everConnected = false;

    // 끊김 시 재연결 예약. 이미 예약돼 있으면 중복 예약하지 않는다(onerror + onclose가 함께 와도 1번만).
    // 간격은 실패할수록 1.5배씩 늘려 30초 상한(서버 장기 다운 시 3초마다 무한 재시도로 인한 부하 완화).
    const scheduleReconnect = () => {
      if (destroyed || reconnectTimer) return;
      // 순수 공개 접근에서 한 번도 연결 못 했으면 재시도 포기(위 주석 참조).
      if (isPublicMode() && !everConnected) return;
      setStatus('reconnecting');
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        reconnectDelay = Math.min(reconnectDelay * 1.5, RECONNECT_MAX_MS);
        connect();
      }, reconnectDelay);
    };

    const connect = () => {
      if (destroyed) return;

      ws = new WebSocket(buildWsUrl('/ws/proxy/taskboard/taskboard-rt'));

      ws.onopen = () => {
        everConnected = true;
        reconnectDelay = RECONNECT_BASE_MS; // 성공했으니 백오프 리셋
        setStatus('connected');
        if (subsRef.current.length > 0) {
          ws?.send(JSON.stringify({ action: 'subscribe', subscriptions: subsRef.current }));
        }
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as { data?: CtiWsDataByHashKey };
          const incoming = msg.data;
          if (!incoming) return;
          // 델타 병합 — 이번에 온 hashKey의 id들만 기존 값 위에 덮어쓰고, 안 온 나머지는 그대로 유지.
          setDataByHashKey((prev) => {
            const next: CtiWsDataByHashKey = { ...prev };
            for (const [hashKey, idMap] of Object.entries(incoming)) {
              next[hashKey] = { ...(prev[hashKey] ?? {}), ...idMap };
            }
            return next;
          });
        } catch {
          /* JSON 파싱 오류 무시 */
        }
      };

      ws.onclose = () => {
        if (!destroyed) scheduleReconnect();
      };

      // onerror만 오고 onclose가 안 오는 브라우저/네트워크 상황 대비 — 소켓을 명시적으로 닫아 onclose를
      // 유발하고, 그 경로에서 재연결이 예약되게 한다(scheduleReconnect 중복은 위 가드가 막음).
      ws.onerror = () => {
        if (destroyed) return;
        try {
          ws?.close();
        } catch {
          /* 이미 닫히는 중 */
        }
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [subsKey]);

  return { dataByHashKey, isConnected: status === 'connected', status };
}
