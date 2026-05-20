/**
 * ADN 도메인 enum / 옵션 — BE 직렬화 코드(string) 기준.
 */
import type { AdnDefaultStateCode, DnStatusCode } from '../types';

export const DN_STATUS_OPTIONS: ReadonlyArray<{ value: DnStatusCode; label: string }> = [
  { value: '1', label: '로그인' },
  { value: '0', label: '로그아웃' },
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

export function getDnStatusName(value: DnStatusCode | null | undefined): string {
  if (value == null) return '-';
  return DN_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getAdnDftStateName(value: AdnDefaultStateCode | null | undefined): string {
  if (value == null) return '-';
  return ADN_DFT_STATE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
