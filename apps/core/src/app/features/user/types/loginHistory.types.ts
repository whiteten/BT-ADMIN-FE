/**
 * 로그인 이력 응답 DTO (백엔드 LoginHistoryResponse와 일치)
 */
export interface LoginHistory {
  id: number;
  userId: number;
  username: string;
  loginType: LoginType;
  loginAt: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  success: boolean;
  failureReason?: string;
  sessionId?: string;
  tenantId?: number;
}

/**
 * 로그인 이벤트 유형
 */
export type LoginType = 'LOGIN' | 'LOGOUT' | 'FAILED' | 'KICKED' | 'TIMEOUT';

/**
 * 로그인 이력 검색 파라미터
 */
export interface LoginHistorySearchParams {
  userId?: number;
  tenantId?: number;
  loginType?: LoginType;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  page?: number;
  size?: number;
}

/**
 * 로그인 이벤트 유형 라벨 매핑
 */
export const LOGIN_TYPE_LABELS: Record<LoginType, string> = {
  LOGIN: '로그인',
  LOGOUT: '로그아웃',
  FAILED: '실패',
  KICKED: '강제 종료',
  TIMEOUT: '타임아웃',
};

/**
 * 로그인 이벤트 유형 색상 매핑
 */
export const LOGIN_TYPE_COLORS: Record<LoginType, string> = {
  LOGIN: 'text-green-600 bg-green-50',
  LOGOUT: 'text-gray-600 bg-gray-50',
  FAILED: 'text-red-600 bg-red-50',
  KICKED: 'text-orange-600 bg-orange-50',
  TIMEOUT: 'text-yellow-600 bg-yellow-50',
};
