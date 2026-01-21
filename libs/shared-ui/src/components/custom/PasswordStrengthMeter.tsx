/**
 * 비밀번호 강도 표시 컴포넌트
 * - 비밀번호 정책 기반 실시간 검증
 * - 시각적 피드백 (색상, 텍스트, 체크리스트)
 */

import { useMemo } from 'react';
import { Progress } from 'antd';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * 비밀번호 정책 타입 (core 앱의 타입과 동일)
 */
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  rejectConsecutiveChars: boolean;
  rejectRepeatedChars: boolean;
  rejectUserId: boolean;
}

export interface PasswordStrengthMeterProps {
  password: string;
  policy?: PasswordPolicy;
  userId?: string;
  showChecklist?: boolean;
  className?: string;
}

interface ValidationResult {
  rule: string;
  label: string;
  passed: boolean;
}

/**
 * 기본 정책 값
 */
const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: false,
  requireLowercase: false,
  requireDigit: false,
  rejectConsecutiveChars: false,
  rejectRepeatedChars: false,
  rejectUserId: true,
};

/**
 * 연속 문자 패턴 검사 (abc, 123 등)
 */
function hasConsecutiveChars(password: string): boolean {
  for (let i = 0; i < password.length - 2; i++) {
    const c1 = password.charCodeAt(i);
    const c2 = password.charCodeAt(i + 1);
    const c3 = password.charCodeAt(i + 2);
    if (c2 === c1 + 1 && c3 === c2 + 1) {
      return true;
    }
    if (c2 === c1 - 1 && c3 === c2 - 1) {
      return true;
    }
  }
  return false;
}

/**
 * 반복 문자 패턴 검사 (aaa, 111 등)
 */
function hasRepeatedChars(password: string): boolean {
  for (let i = 0; i < password.length - 2; i++) {
    if (password[i] === password[i + 1] && password[i + 1] === password[i + 2]) {
      return true;
    }
  }
  return false;
}

/**
 * 비밀번호 검증
 */
function validatePassword(password: string, policy: PasswordPolicy, userId?: string): ValidationResult[] {
  const results: ValidationResult[] = [];

  // 최소 길이
  results.push({
    rule: 'minLength',
    label: `최소 ${policy.minLength}자 이상`,
    passed: password.length >= policy.minLength,
  });

  // 최대 길이
  if (password.length > 0) {
    results.push({
      rule: 'maxLength',
      label: `최대 ${policy.maxLength}자 이하`,
      passed: password.length <= policy.maxLength,
    });
  }

  // 대문자 필수
  if (policy.requireUppercase) {
    results.push({
      rule: 'uppercase',
      label: '대문자 포함',
      passed: /[A-Z]/.test(password),
    });
  }

  // 소문자 필수
  if (policy.requireLowercase) {
    results.push({
      rule: 'lowercase',
      label: '소문자 포함',
      passed: /[a-z]/.test(password),
    });
  }

  // 숫자 필수
  if (policy.requireDigit) {
    results.push({
      rule: 'digit',
      label: '숫자 포함',
      passed: /[0-9]/.test(password),
    });
  }

  // 연속 문자 금지
  if (policy.rejectConsecutiveChars) {
    results.push({
      rule: 'consecutive',
      label: '연속 문자 없음 (abc, 123 등)',
      passed: !hasConsecutiveChars(password),
    });
  }

  // 반복 문자 금지
  if (policy.rejectRepeatedChars) {
    results.push({
      rule: 'repeated',
      label: '반복 문자 없음 (aaa, 111 등)',
      passed: !hasRepeatedChars(password),
    });
  }

  // 사용자 ID 포함 금지
  if (policy.rejectUserId && userId) {
    results.push({
      rule: 'userId',
      label: '사용자 ID 미포함',
      passed: !password.toLowerCase().includes(userId.toLowerCase()),
    });
  }

  return results;
}

/**
 * 강도 계산 (0-100)
 */
function calculateStrength(results: ValidationResult[]): number {
  if (results.length === 0) return 0;
  const passedCount = results.filter((r) => r.passed).length;
  return Math.round((passedCount / results.length) * 100);
}

/**
 * 강도에 따른 색상 및 텍스트
 */
function getStrengthInfo(strength: number): { color: string; text: string; status: 'exception' | 'active' | 'success' } {
  if (strength < 40) {
    return { color: '#ff4d4f', text: '약함', status: 'exception' };
  }
  if (strength < 70) {
    return { color: '#faad14', text: '보통', status: 'active' };
  }
  if (strength < 100) {
    return { color: '#52c41a', text: '강함', status: 'active' };
  }
  return { color: '#52c41a', text: '매우 강함', status: 'success' };
}

export function PasswordStrengthMeter({ password, policy = DEFAULT_POLICY, userId, showChecklist = true, className }: PasswordStrengthMeterProps) {
  const validationResults = useMemo(() => {
    if (!password) return [];
    return validatePassword(password, policy, userId);
  }, [password, policy, userId]);

  const strength = useMemo(() => calculateStrength(validationResults), [validationResults]);

  const strengthInfo = useMemo(() => getStrengthInfo(strength), [strength]);

  // 비밀번호가 없으면 표시하지 않음
  if (!password) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 강도 바 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">비밀번호 강도</span>
          <span style={{ color: strengthInfo.color }} className="font-medium">
            {strengthInfo.text}
          </span>
        </div>
        <Progress percent={strength} showInfo={false} status={strengthInfo.status} strokeColor={strengthInfo.color} size="small" />
      </div>

      {/* 체크리스트 */}
      {showChecklist && validationResults.length > 0 && (
        <div className="space-y-1.5">
          {validationResults.map((result) => (
            <div key={result.rule} className={cn('flex items-center gap-2 text-sm', result.passed ? 'text-green-600' : 'text-gray-400')}>
              {result.passed ? <Check className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
              <span>{result.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 비밀번호 모든 정책 충족 여부 확인 (외부에서 사용)
 */
export function isPasswordValid(password: string, policy: PasswordPolicy, userId?: string): boolean {
  const results = validatePassword(password, policy, userId);
  return results.every((r) => r.passed);
}
