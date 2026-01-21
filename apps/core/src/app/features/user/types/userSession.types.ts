/**
 * 사용자 세션 응답 DTO (백엔드 UserSessionResponse와 일치)
 */
export interface UserSession {
  id: number;
  userId: number;
  sessionId: string;
  loginAt: string;
  lastActivityAt?: string;
  expiresAt?: string;
  logoutAt?: string;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  deviceInfo?: string;
  logoutReason?: string;
  tenantId?: number;
}

/**
 * 세션 검색 파라미터
 */
export interface UserSessionSearchParams {
  userId?: number;
  tenantId?: number;
  isActive?: boolean;
  ipAddress?: string;
  page?: number;
  size?: number;
}

/**
 * 세션 상태 라벨
 */
export const SESSION_STATUS_LABELS = {
  active: '활성',
  inactive: '비활성',
} as const;

/**
 * 세션 상태 색상
 */
export const SESSION_STATUS_COLORS = {
  active: 'text-green-600 bg-green-50',
  inactive: 'text-gray-600 bg-gray-50',
} as const;

/**
 * 로그아웃 사유 라벨
 */
export const LOGOUT_REASON_LABELS: Record<string, string> = {
  USER_LOGOUT: '사용자 로그아웃',
  ADMIN_FORCE: '관리자 강제 종료',
  TIMEOUT: '세션 타임아웃',
  KICKED: '다른 세션에 의해 종료',
  EXPIRED: '세션 만료',
};
