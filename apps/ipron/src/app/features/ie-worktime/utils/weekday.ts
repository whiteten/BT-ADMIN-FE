/**
 * 업무시간 요일 바이트(8자리) ↔ UI 변환 유틸 (IE 전용 사본).
 *
 * weekdayByte = 8자리 [월화수목금토일휴일], '1'=적용. (레거시 IPR30S4022 정합)
 */
import dayjs, { type Dayjs } from 'dayjs';

/** 요일 필드 정의 (월~일 + 휴일, byte 인덱스 0~7 고정) */
export const WORKTIME_DAY_FIELDS: { key: string; label: string }[] = [
  { key: 'mon', label: '월' },
  { key: 'tue', label: '화' },
  { key: 'wed', label: '수' },
  { key: 'thu', label: '목' },
  { key: 'fri', label: '금' },
  { key: 'sat', label: '토' },
  { key: 'sun', label: '일' },
  { key: 'hol', label: '휴일' },
];

const BYTE_LEN = WORKTIME_DAY_FIELDS.length;

export function byteToLabels(byte?: string | null): string[] {
  if (!byte || byte.length !== BYTE_LEN) return [];
  return WORKTIME_DAY_FIELDS.filter((_, i) => byte[i] === '1').map((d) => d.label);
}

export function byteToKeys(byte?: string | null): string[] {
  if (!byte || byte.length !== BYTE_LEN) return [];
  return WORKTIME_DAY_FIELDS.filter((_, i) => byte[i] === '1').map((d) => d.key);
}

export function keysToByte(keys: string[]): string {
  const set = new Set(keys);
  return WORKTIME_DAY_FIELDS.map((d) => (set.has(d.key) ? '1' : '0')).join('');
}

export function parseHHMM(v?: string | null): Dayjs | null {
  if (!v || v.length < 3) return null;
  return dayjs(v.padStart(4, '0'), 'HHmm');
}

export function displayHHMM(v?: string | null): string {
  if (!v || v.length < 3) return '-';
  const s = v.padStart(4, '0');
  return `${s.slice(0, 2)}:${s.slice(2)}`;
}
