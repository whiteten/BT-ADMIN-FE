/**
 * 로그인 감사 로그 응답 DTO (백엔드 LoginAuditLogResponse와 일치)
 * TB_BT_AUTH_LOGIN_LOG 테이블
 */
export interface LoginAuditLog {
  /** 로그 ID (PK) */
  logId: string;
  /** 사용자명 (로그인 ID) */
  username: string;
  /** 사용자 ID (TB_BT_CM_USER_MST.ID) */
  userId?: number;
  /** 테넌트 ID */
  tenantId?: string;
  /** 세션 ID */
  sessionId?: string;
  /** 로그인 결과 (SUCCESS, FAILURE, LOCKED) */
  result: LoginResult;
  /** 실패 사유 */
  failureReason?: FailureReason;
  /** 클라이언트 IP */
  clientIp?: string;
  /** User-Agent */
  userAgent?: string;
  /** 생성일시 */
  createdAt: string;
}

/**
 * 로그인 결과 타입
 */
export type LoginResult = 'SUCCESS' | 'FAILURE' | 'LOCKED';

/**
 * 실패 사유 타입
 */
export type FailureReason = 'USER_NOT_FOUND' | 'INVALID_PASSWORD' | 'ACCOUNT_DISABLED' | 'ACCOUNT_LOCKED';

/**
 * 로그인 이력 검색 파라미터
 */
export interface LoginAuditLogSearchParams {
  userId?: number;
  username?: string;
  result?: LoginResult;
  tenantId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

/**
 * 로그인 결과 라벨
 */
export const LOGIN_RESULT_LABELS: Record<LoginResult, string> = {
  SUCCESS: '성공',
  FAILURE: '실패',
  LOCKED: '잠금',
} as const;

/**
 * 로그인 결과 색상
 */
export const LOGIN_RESULT_COLORS: Record<LoginResult, string> = {
  SUCCESS: 'text-green-600 bg-green-50',
  FAILURE: 'text-red-600 bg-red-50',
  LOCKED: 'text-orange-600 bg-orange-50',
} as const;

/**
 * 실패 사유 라벨
 */
export const FAILURE_REASON_LABELS: Record<FailureReason, string> = {
  USER_NOT_FOUND: '사용자 없음',
  INVALID_PASSWORD: '비밀번호 불일치',
  ACCOUNT_DISABLED: '계정 비활성화',
  ACCOUNT_LOCKED: '계정 잠금',
} as const;
