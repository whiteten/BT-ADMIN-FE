/**
 * 비밀번호 정책 타입 정의
 */

/**
 * 비밀번호 정책 응답 DTO
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
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 비밀번호 정책 수정 요청 DTO
 */
export interface PasswordPolicyRequest {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireDigit?: boolean;
  rejectConsecutiveChars?: boolean;
  rejectRepeatedChars?: boolean;
  rejectUserId?: boolean;
  historyCount?: number;
  maxAgeDays?: number;
  expirationWarningDays?: number;
  maxFailedAttempts?: number;
  lockoutDurationMinutes?: number;
  failedAttemptResetMinutes?: number;
}

/**
 * 기본 정책 값
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicyRequest = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: false,
  requireLowercase: false,
  requireDigit: false,
  rejectConsecutiveChars: false,
  rejectRepeatedChars: false,
  rejectUserId: true,
  historyCount: 5,
  maxAgeDays: 90,
  expirationWarningDays: 14,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  failedAttemptResetMinutes: 30,
};
