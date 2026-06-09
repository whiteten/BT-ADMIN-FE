/**
 * PSR_TIME_KEY 시간축 라벨 포맷터.
 *
 * BE는 통계 단위(mi/hh/dd/mm/yy)에 따라 구분자 없는 숫자 키를 내려준다.
 * 자릿수로 단위를 판정해 표시용 구분자를 삽입한다.
 *
 *  4자리 YYYY          → YYYY            (연)
 *  6자리 YYYYMM        → YYYY-MM         (월)
 *  8자리 YYYYMMDD      → YYYY-MM-DD      (일)
 * 10자리 YYYYMMDDHH    → YYYY-MM-DD HH   (시간)
 * 12자리 YYYYMMDDHHmi  → YYYY-MM-DD HH:mi(십분)
 *
 * 시간 키 형태(순수 숫자 4/6/8/10/12자리)가 아니면 원본 문자열 그대로 반환.
 */
export function formatTimeKey(value: unknown): string {
  const s = String(value ?? '');
  if (!/^\d+$/.test(s)) return s;

  const y = s.slice(0, 4);
  const mo = s.slice(4, 6);
  const d = s.slice(6, 8);
  const h = s.slice(8, 10);
  const mi = s.slice(10, 12);

  switch (s.length) {
    case 4:
      return y;
    case 6:
      return `${y}-${mo}`;
    case 8:
      return `${y}-${mo}-${d}`;
    case 10:
      return `${y}-${mo}-${d} ${h}`;
    case 12:
      return `${y}-${mo}-${d} ${h}:${mi}`;
    default:
      return s;
  }
}

/** PSR_TIME_KEY 형태(순수 숫자 4/6/8/10/12자리)인지 판정. */
export function isTimeKey(value: unknown): boolean {
  const s = String(value ?? '');
  return /^\d+$/.test(s) && [4, 6, 8, 10, 12].includes(s.length);
}

const DOW_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * 조회 기간 전체를 BE 의 PSR_TIME_KEY 원본 키 배열로 빈 구간 없이 열거.
 *
 * 시간축 차트에서 데이터가 없는 일자/월/년 슬롯도 축에 표시하기 위함
 * (BE 는 데이터 있는 구간만 row 로 내려줌 → FE 에서 축을 기간 기준으로 채운다).
 *
 * 일내 구간(시간/10분)은 interval·점심 제외 등 변수가 많아 열거 대상에서 제외(null 반환)
 * → 호출 측은 데이터 distinct 키로 폴백한다. 일간은 excludeDays(요일 제외)를 반영.
 *
 * @returns 원본 키 배열(YYYYMMDD 등). 열거 비대상 단위면 null.
 */
export function enumerateTimeKeys(from: string, to: string, unit: string, excludeDays: string[] = []): string[] | null {
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;

  const keys: string[] = [];
  switch (unit) {
    case 'DAILY': {
      const skip = new Set(excludeDays.map((d) => d.toUpperCase()));
      for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (skip.size && skip.has(DOW_CODES[d.getDay()])) continue;
        keys.push(`${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`);
      }
      return keys;
    }
    case 'MONTHLY': {
      for (const d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d.setMonth(d.getMonth() + 1)) {
        keys.push(`${d.getFullYear()}${pad(d.getMonth() + 1)}`);
      }
      return keys;
    }
    case 'YEARLY': {
      for (let y = start.getFullYear(); y <= end.getFullYear(); y++) keys.push(`${y}`);
      return keys;
    }
    default:
      // 10MIN / HOURLY 등 일내 단위는 열거하지 않음
      return null;
  }
}
