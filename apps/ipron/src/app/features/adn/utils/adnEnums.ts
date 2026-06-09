/**
 * ADN 도메인 enum / 옵션 — BE 직렬화 코드(string) 기준.
 *
 * ADN DN_STATUS 코드는 공통 DnStatus enum 과 다름 (ADN 전용 코드).
 * TB_CC_COMMONCODE (CLASS_CD='DN_STATUS', ADDCOND1_VALUE='ADN') 실 DB 확인 값:
 *   '8' = 로그인(Login), '9' = 로그아웃(Logout)
 *
 * EXT_AUTHTYPE 코드: TB_CC_COMMONCODE CLASS_CD='IE_EXT_AUTHTYPE'
 *   '1' = 고정 IP (STATIC), '2' = 동적 IP (DYNAMIC)
 */
import type { AdnDefaultStateCode, DnStatusCode, ExtAuthtypeCode } from '../types';

export const DN_STATUS_OPTIONS: ReadonlyArray<{ value: DnStatusCode; label: string }> = [
  { value: '8', label: '로그인' },
  { value: '9', label: '로그아웃' },
];

export const ADN_DFT_STATE_OPTIONS: ReadonlyArray<{ value: AdnDefaultStateCode; label: string }> = [
  { value: '1', label: 'Ready' },
  { value: '2', label: 'Not Ready' },
  { value: '3', label: 'After Work' },
];

export const MD5_AUTH_OPTIONS = [
  { value: 0, label: '해제' },
  { value: 1, label: '설정' },
] as const;

/**
 * 내선 IP 인증 유형 옵션.
 * AS-IS IPR20S2023 changeExtAuthType() — CLASS_CD='IE_EXT_AUTHTYPE' 대응.
 * '1'=고정IP, '2'=동적IP.
 */
export const EXT_AUTHTYPE_OPTIONS: ReadonlyArray<{ value: ExtAuthtypeCode; label: string }> = [
  { value: '1', label: '고정 IP' },
  { value: '2', label: '동적 IP' },
];

export function getDnStatusName(value: DnStatusCode | null | undefined): string {
  if (value == null) return '-';
  return DN_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getAdnDftStateName(value: AdnDefaultStateCode | null | undefined): string {
  if (value == null) return '-';
  return ADN_DFT_STATE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
