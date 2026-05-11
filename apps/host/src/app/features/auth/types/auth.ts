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
 * 테넌트 요약 (전환 UI용)
 */
export interface TenantSummary {
  tenantId: number;
  tenantName: string;
}

/**
 * 사용자 정보 응답 타입 (/api/auth/me)
 * V23: userAccount(계정), username(사람이름), userId 분리
 * V37: tenantName, availableTenants 추가 (테넌트 전환 UI 지원)
 * V64: globalRoles, roleNames 추가 (시스템 관리자 글로벌 역할 + 역할명 매핑)
 *
 * @property userAccount - 로그인 계정 (Unique, 인증용)
 * @property username - 사람 이름 (표시용, 동명이인 허용)
 * @property userId - 사용자 PK
 * @property tenant - 현재 테넌트 ID (문자열)
 * @property tenantName - 현재 테넌트명
 * @property availableTenants - 접근 가능한 테넌트 목록
 * @property globalRoles - 글로벌 역할 코드 목록 (ROLE_ADMIN 등, 테넌트 무관)
 * @property roles - 현재 테넌트의 역할 코드 목록
 * @property roleNames - 역할 코드 → 역할명 매핑 (FE 표시용)
 */
export interface UserInfoResponse {
  userAccount: string;
  username: string | null;
  userId: number | null;
  tenant: string;
  tenantName: string;
  availableTenants: TenantSummary[];
  /** 사용자의 모든 역할 (글로벌 + 테넌트 합집합) */
  roles: string[];
  /** 역할 코드 → 역할명 매핑 */
  roleNames: Record<string, string>;
  /** 시스템 관리자 여부 */
  isSystemAdmin: boolean;
  /** 비밀번호 초기화 권한 */
  canResetPassword: boolean;
  /** 리소스 접근 관리 권한 */
  canManageResourceAccess: boolean;
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
 * 로그인 응답에 포함되는 테넌트 선택 후보 항목 (tenant_required 응답)
 */
export interface AvailableTenantOption {
  id: number;
  name: string;
}

/**
 * Login error response from backend (OAuth2 style)
 */
export interface LoginErrorResponse {
  error:
    | 'invalid_request'
    | 'invalid_grant'
    | 'account_locked'
    | 'account_dormant'
    | 'account_disabled'
    | 'tenant_required'
    | 'password_change_required'
    | 'ip_not_allowed'
    | 'concurrent_login_blocked';
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
  /** 다중 테넌트 사용자의 선택 가능한 테넌트 목록 (tenant_required 응답 시) */
  available_tenants?: AvailableTenantOption[];
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
