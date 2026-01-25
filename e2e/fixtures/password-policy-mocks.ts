/**
 * 비밀번호 정책 Mock 데이터
 * 다양한 정책 설정으로 UI 동작 테스트
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

// 엄격한 정책 (모든 규칙 활성화)
export const strictPolicy: PasswordPolicy = {
  tenantId: 1,
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  rejectConsecutiveChars: true,
  rejectRepeatedChars: true,
  rejectUserId: true,
  historyCount: 5,
  maxAgeDays: 90,
  expirationWarningDays: 7,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  failedAttemptResetMinutes: 15,
};

// 완화된 정책 (최소 규칙만)
export const lenientPolicy: PasswordPolicy = {
  tenantId: 1,
  minLength: 4,
  maxLength: 128,
  requireUppercase: false,
  requireLowercase: false,
  requireDigit: false,
  rejectConsecutiveChars: false,
  rejectRepeatedChars: false,
  rejectUserId: false,
  historyCount: 0,
  maxAgeDays: 365,
  expirationWarningDays: 30,
  maxFailedAttempts: 10,
  lockoutDurationMinutes: 5,
  failedAttemptResetMinutes: 30,
};

// 기본 정책
export const defaultPolicy: PasswordPolicy = {
  tenantId: 1,
  minLength: 8,
  maxLength: 128,
  requireUppercase: false,
  requireLowercase: false,
  requireDigit: false,
  rejectConsecutiveChars: false,
  rejectRepeatedChars: false,
  rejectUserId: true,
  historyCount: 3,
  maxAgeDays: 180,
  expirationWarningDays: 14,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
  failedAttemptResetMinutes: 15,
};
