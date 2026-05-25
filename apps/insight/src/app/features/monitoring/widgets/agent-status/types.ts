/**
 * BE INSIGHT AgentStatusWidget(`widgetType = "agent-status-matrix"`) 응답 row 타입.
 *
 * - BE는 레거시 SWAT 운영 Redis 키 `IC:AGENT:{GROUP_ID}:{MEDIA_TYPE}` 해시 row를
 *   그대로 JSON 으로 직렬화하여 전달한다.
 * - 모든 필드는 선택적 (Redis row 가 부분 데이터일 수 있음). FE 측에서 안전하게 사용.
 */
export interface AgentRow {
  AGENT_ID?: number | string;
  AGENT_NAME?: string;
  AGENT_LOGIN_ID?: string;
  LOGIN_DN_NO?: string | number;
  NODE_ID?: number | string;
  TNT_ID?: number | string;
  TENANT_ID?: number | string;
  GROUP_ID?: number | string;
  MEDIA_TYPE?: number | string;
  /** 10:로그아웃, 20:로그인 포괄, 30:이석, 40·41·42:대기, 50:통화, 51:벨울림, 52:다이얼링, 53:보류, 60:후처리 */
  AGENT_STATUS?: number | string;
  /** 통화 50 + REASON_CODE 10=IB / 20=OB. 이석/후처리 시 사유코드 */
  REASON_CODE?: number | string;
  /** Redis 저장 시점 epoch (또는 yyyyMMddHHmmss 문자열) */
  STATUS_TIME?: number | string;
  /** 상태 유지 시간 (초) */
  STATUS_DURATION?: number | string;
  AGENT_BUSY_STATUS?: number | string;
  LOGIN_TIME?: number | string;
  LOGOUT_TIME?: number | string;
  LOGIN_STATUS?: number | string;
  [extra: string]: unknown;
}

/** 시맨틱 그룹 (시안 §1 5-칩 분류). */
export type StatusGroup = 'available' | 'talking' | 'ringing' | 'wrapup' | 'offline';

/** 상태별 색상 시맨틱 (단일 키, 시안 5.A `bt-*` 토큰 매핑). */
export type StatusColor = 'success' | 'primary' | 'warn' | 'wrap' | 'muted' | 'danger';
