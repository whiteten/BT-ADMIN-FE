/**
 * Zod 기반 검증 스키마 및 Ant Design Form 통합 유틸리티
 */

import type { Rule } from 'antd/es/form';
import { z } from 'zod';

/**
 * 한국 전화번호 정규식
 * - 휴대폰: 010, 011, 016, 017, 018, 019로 시작
 * - 지역번호: 02(서울), 031~064(지역)
 * - 하이픈 있거나 없거나 모두 허용
 */
const PHONE_REGEX = /^(01[016789]-?\d{3,4}-?\d{4}|0[2-6][1-5]?-?\d{3,4}-?\d{4})$/;

/**
 * IP 주소 정규식 (숫자와 점만 허용)
 */
const IP_REGEX = /^[0-9.]+$/;

/**
 * 이메일 정규식 (RFC 5322 간소화 버전)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ============================================================
// Zod 스키마 정의
// ============================================================

/**
 * 한국 전화번호 스키마
 */
export const phoneSchema = z.string().regex(PHONE_REGEX, '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)').or(z.literal(''));

/**
 * 이메일 스키마
 */
export const emailSchema = z.string().regex(EMAIL_REGEX, '올바른 이메일 형식이 아닙니다. (예: user@example.com)').or(z.literal(''));

/**
 * IP 주소 스키마 (숫자와 점만 허용)
 */
export const ipSchema = z.string().regex(IP_REGEX, 'IP 주소는 숫자와 점(.)만 입력 가능합니다.');

// ============================================================
// Ant Design Form Rule 생성 유틸리티
// ============================================================

/**
 * Zod 스키마를 Ant Design Form Rule로 변환
 * @param schema Zod 스키마
 * @param options 추가 옵션
 */
export function zodToAntdRule<T>(schema: z.ZodType<T>, options?: { required?: boolean; message?: string }): Rule {
  return {
    validator: async (_, value) => {
      // 빈 값 처리: required가 아니면 빈 값 허용
      if (!options?.required && (value === undefined || value === null || value === '')) {
        return Promise.resolve();
      }

      const result = schema.safeParse(value);
      if (result.success) {
        return Promise.resolve();
      }

      const errorMessage = options?.message ?? result.error.issues[0]?.message ?? '유효하지 않은 값입니다.';
      return Promise.reject(new Error(errorMessage));
    },
  };
}

// ============================================================
// 사전 정의된 Ant Design Form Rules
// ============================================================

/**
 * 전화번호 검증 규칙 (선택)
 */
export const phoneRule: Rule = zodToAntdRule(phoneSchema);

/**
 * 이메일 검증 규칙 (선택)
 */
export const emailRule: Rule = zodToAntdRule(emailSchema);

/**
 * IP 주소 검증 규칙 (필수)
 */
export const ipRule: Rule = zodToAntdRule(ipSchema, { required: true });

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 전화번호 유효성 검사
 */
export function isValidPhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success;
}

/**
 * 이메일 유효성 검사
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

/**
 * IP 주소 유효성 검사 (숫자와 점만 허용)
 */
export function isValidIP(ip: string): boolean {
  return ipSchema.safeParse(ip).success;
}
