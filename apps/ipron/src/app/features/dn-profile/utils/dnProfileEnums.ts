/**
 * 내선 프로파일 Enum 라벨 매핑
 * SD-DN-PROFILE.md 기준
 * - dnProfileType: 0=내선(EXT,AGT), 1=TRUNK
 * - rtpOption (DN용): 0=사용안함, 1=내선통화, 2=내선 + 국선통화
 * - rtpOption (TRUNK용): 0=사용안함, 1=전송모드, 2=수신모드, 3=모두사용
 * - natOption: 0=미지정, 1=미사용, 2=rport(rfc3581), 3=route, 4=rport+route
 */
import type { DnProfileType, NatOption } from '../types/dnProfile.types';

// ─── DN 프로파일 유형 ────────────────────────────────────────────────────────
export const DN_PROFILE_TYPE_LABELS: Record<DnProfileType, string> = {
  '0': '내선 (EXT, AGT)',
  '1': 'TRUNK',
};

export const DN_PROFILE_TYPE_OPTIONS = [
  { label: '내선 (EXT, AGT)', value: '0' as DnProfileType },
  { label: 'TRUNK', value: '1' as DnProfileType },
];

// ─── RTP 중개 옵션 ──────────────────────────────────────────────────────────
export const RTP_OPTION_LABELS_DN: Record<number, string> = {
  0: '사용안함',
  1: '내선통화',
  2: '내선 + 국선통화',
};

export const RTP_OPTION_LABELS_TRUNK: Record<number, string> = {
  0: '사용안함',
  1: '전송모드',
  2: '수신모드',
  3: '모두사용',
};

export const RTP_OPTION_OPTIONS_DN = [
  { label: '사용안함', value: 0 },
  { label: '내선통화', value: 1 },
  { label: '내선 + 국선통화', value: 2 },
];

export const RTP_OPTION_OPTIONS_TRUNK = [
  { label: '사용안함', value: 0 },
  { label: '전송모드', value: 1 },
  { label: '수신모드', value: 2 },
  { label: '모두사용', value: 3 },
];

/** dnProfileType 에 따라 RTP 라벨 반환 */
export const getRtpLabel = (type: DnProfileType | null | undefined, value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  if (type === '1') return RTP_OPTION_LABELS_TRUNK[value] ?? String(value);
  return RTP_OPTION_LABELS_DN[value] ?? String(value);
};

/** dnProfileType 에 따라 RTP options 배열 반환 */
export const getRtpOptions = (type: DnProfileType | null | undefined) => {
  return type === '1' ? RTP_OPTION_OPTIONS_TRUNK : RTP_OPTION_OPTIONS_DN;
};

// ─── NAT 옵션 ───────────────────────────────────────────────────────────────
export const NAT_OPTION_LABELS: Record<NatOption, string> = {
  '0': '미지정',
  '1': '미사용',
  '2': 'rport (rfc3581)',
  '3': 'route',
  '4': 'rport + route',
};

export const NAT_OPTION_OPTIONS = [
  { label: '미지정', value: '0' as NatOption },
  { label: '미사용', value: '1' as NatOption },
  { label: 'rport (rfc3581)', value: '2' as NatOption },
  { label: 'route', value: '3' as NatOption },
  { label: 'rport + route', value: '4' as NatOption },
];

// ─── Boolean(YesNo) 라벨 ─────────────────────────────────────────────────────
export const YES_NO_LABEL = (v: boolean | null | undefined): string => (v === true ? '사용' : v === false ? '사용안함' : '-');

export const ON_OFF_LABEL = (v: boolean | null | undefined): string => (v === true ? '설정' : v === false ? '해제' : '-');
