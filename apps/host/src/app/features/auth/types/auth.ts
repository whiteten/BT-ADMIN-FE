export interface LoginRequestDatas {
  username: string;
  password: string;
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
  forceChangeOnFirstLogin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 로그인 응답 타입
 */
export interface LoginResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  jti: string;
  mode: string;
  sid: string;
  tenant: string;
  roles: string[];
  userId: number;
  passwordExpired: boolean;
  passwordExpiringSoon: boolean;
  daysUntilExpiration: number | null;
  forcePasswordChange: boolean;
}
