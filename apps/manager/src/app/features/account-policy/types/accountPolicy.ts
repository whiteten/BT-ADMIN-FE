/**
 * 계정 보안 정책 타입 정의
 */

/**
 * 중복 로그인 금지 시 동작
 */
export type ConcurrentLoginAction = 'KICK_EXISTING' | 'BLOCK_NEW';

/**
 * 계정 보안 정책 응답 DTO
 */
export interface AccountPolicy {
  tenantId: number;
  // 비밀번호 복잡도
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  rejectConsecutiveChars: boolean;
  rejectRepeatedChars: boolean;
  rejectUserId: boolean;
  // 비밀번호 이력/만료
  historyCount: number;
  maxAgeDays: number;
  expirationWarningDays: number;
  // 계정 잠금
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  failedAttemptResetMinutes: number;
  // 휴면 정책
  dormantDays: number;
  // 세션 정책
  concurrentLoginAction: ConcurrentLoginAction;
  // 감사
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 계정 보안 정책 수정 요청 DTO
 */
export interface AccountPolicyUpdateData {
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
  dormantDays?: number;
  concurrentLoginAction?: ConcurrentLoginAction;
}

/**
 * 기본 정책 값
 */
export const DEFAULT_ACCOUNT_POLICY: AccountPolicyUpdateData = {
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
  dormantDays: 90,
  concurrentLoginAction: 'KICK_EXISTING',
};

/**
 * 중복 로그인 동작 옵션
 */
export const CONCURRENT_LOGIN_ACTION_OPTIONS = [
  { value: 'KICK_EXISTING', label: '기존 세션 종료', description: '새 로그인 시 기존 세션을 강제 종료합니다' },
  { value: 'BLOCK_NEW', label: '새 로그인 차단', description: '이미 로그인된 상태에서 새 로그인을 차단합니다' },
] as const;
