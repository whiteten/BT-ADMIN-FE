/**
 * 상담사 상태 로그(여정) — 타입 정의
 * menuKey: ipron-tracking-agent-journey
 * BE endpoint: POST /api/ipron/tracking/agent-state-log
 */

/** 조회 요청 파라미터 */
export interface AgentStateLogRequest {
  /** 상담사 ID (TB_IC_AGENTMASTER.AGENT_ID) */
  agentId: string;
  /** 조회 날짜 yyyyMMdd */
  date: string;
  /** 시작 시간 HHmmss (옵션) */
  startTime?: string;
  /** 종료 시간 HHmmss (옵션) */
  endTime?: string;
}

// ─── Timeline 스키마 ──────────────────────────────────────────────────────────

/**
 * 상태 스팬 — 연속 구간
 * state: SESSION|READY|CALL_IN|CALL_OUT|DIALING|HELD|AFTERWORK|NOTREADY
 */
export interface TimelineSpan {
  state: string;
  label: string;
  /** "HH:mm:ss.SSSSSS" 형식 (로컬 시각) */
  startTime: string;
  /** "HH:mm:ss.SSSSSS" 형식 (로컬 시각) */
  endTime: string;
  colorKey: string;
  /** "#RRGGBB" 형식 */
  colorHex: string;
  /**
   * 렌더 레인(z-index/row) 결정용.
   * 낮을수록 우선(SESSION=0 이 가장 위 레인).
   */
  priority: number;
}

/**
 * 이벤트 마커 — 시점 이벤트
 * eventType: LOGIN|LOGIN_COMPLETE|LOGOUT|RINGING|MAKECALL|SERVICE_INITIATED|ANSWER|CLEARCALL|HOLD|RETRIEVE|STATE_CHANGE
 */
export interface TimelineMarker {
  eventType: string;
  label: string;
  /** "HH:mm:ss.SSSSSS" 형식 (로컬 시각) */
  time: string;
  icon: string;
  colorKey: string;
  /** "#RRGGBB" 형식 */
  colorHex: string;
  rawToken: string;
}

export interface Timeline {
  spans: TimelineSpan[];
  markers: TimelineMarker[];
}

// ─── 응답 스키마 ─────────────────────────────────────────────────────────────

/** 조회 응답 — BE ApiResponse.data 내부 */
export interface AgentStateLogResponse {
  /** 조회 대상 상담사 ID */
  agentId: string;
  /** 조회 날짜 yyyyMMdd */
  date: string;
  /** IC LTS 서버 IP 목록 */
  ltsIps: string[];
  /**
   * @deprecated ltsIps 로 마이그레이션 중.
   * 단일 IP 를 반환하는 구버전 BE 호환용.
   */
  ltsIp?: string;
  /** raw 로그 라인 배열 */
  lines: string[];
  /** raw 로그 전체 문자열 */
  raw: string;
  /** 타임라인 구조 */
  timeline: Timeline;
}
