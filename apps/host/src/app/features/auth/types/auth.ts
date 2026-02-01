/**
 * WebSocket 티켓 응답 타입
 */
export interface WsTicketResponse {
  ticket: string;
}

/**
 * 로그인 요청 타입
 * V23: username → userAccount로 변경 (로그인 계정 기반)
 */
export interface LoginRequestDatas {
  userAccount: string;
  password: string;
  tenant?: string;
}

/**
 * 사용자 정보 응답 타입 (/api/auth/me)
 * V23: userAccount(계정), username(사람이름), userId 분리
 *
 * @property userAccount - 로그인 계정 (Unique, 인증용)
 * @property username - 사람 이름 (표시용, 동명이인 허용)
 * @property userId - 사용자 PK
 */
export interface UserInfoResponse {
  userAccount: string;
  username: string | null;
  userId: number | null;
  tenant: string;
  roles: string[];
}

/**
 * 비밀번호 변경 요청 타입
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * 로그인 응답 타입 (BFF /api/auth/login 응답)
 */
export interface LoginResponse {
  username: string;
  userId: number;
  tenantId: number;
  forcePasswordChange: boolean;
  passwordExpired: boolean;
  passwordExpiringSoon: boolean;
  daysUntilExpiration: number;
}

/**
 * Login error response from backend (OAuth2 style)
 */
export interface LoginErrorResponse {
  error: 'invalid_request' | 'invalid_grant' | 'account_locked' | 'account_dormant' | 'account_disabled' | 'tenant_required' | 'password_change_required' | 'ip_not_allowed';
  error_description?: string;
  remaining_attempts?: number;
  retry_after?: number;
  // password_change_required 전용 필드
  userId: number;
  userAccount: string;
  tenantId: number;
  passwordExpired: boolean;
  daysUntilExpiration: number;
  passwordResetToken?: string;
  /** Password reset token 만료 시간 (epoch seconds) */
  tokenExpiresAt?: number;
}

/**
 * Password Reset 요청 타입
 * passwordResetToken 기반 비밀번호 변경
 *
 * @property currentPassword - 현재 비밀번호 (expired 모드에서 필수, first-login 모드에서 불필요)
 */
export interface ResetPasswordRequest {
  passwordResetToken: string;
  newPassword: string;
  /** Current password for verification (required for expired mode) */
  currentPassword?: string;
}

/**
 * Password Reset 응답 타입
 */
export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

/**
 * 비밀번호 정책 타입
 */
export interface PasswordPolicy {
  tenantId: number;
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  rejectConsecutiveChars: boolean;
  rejectRepeatedChars: boolean;
  rejectUserId: boolean;
  historyCount: number;
  maxAgeDays: number;
  expirationWarningDays: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  failedAttemptResetMinutes: number;
}

/**
 * 로그인 감사 로그 타입 (간소화)
 */
export interface LoginAuditLog {
  logId: string;
  username: string;
  userAccount?: string;
  userId?: number;
  result: 'SUCCESS' | 'FAILURE' | 'LOCKED';
  failureReason?: string;
  clientIp?: string;
  createdAt: string;
}

/**
 * 로그인 이력 검색 파라미터
 */
export interface LoginAuditLogSearchParams {
  userId?: number;
  username?: string;
  result?: 'SUCCESS' | 'FAILURE' | 'LOCKED';
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

/**
 * 페이징된 로그인 이력 응답
 */
export interface PagedLoginAuditLogResponse {
  items: LoginAuditLog[];
  page: number;
  size: number;
  total: number;
}
