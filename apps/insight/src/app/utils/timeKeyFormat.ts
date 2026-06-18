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

/** 시간축 열거에 필요한 글로벌 공통조건(구조상 GlobalConditions 와 호환). */
export interface TimeKeyConditions {
  excludeDays?: string[];
  startTime?: string | null;
  endTime?: string | null;
  useInterval?: boolean;
  intervalFrom?: string | null;
  intervalTo?: string | null;
  excludeLunch?: boolean;
}

/** 'HHmm' → 자정 기준 분. 잘못된 값이면 fallback. */
function hhmmToMin(hhmm: string | null | undefined, fallback: number): number {
  if (!hhmm || !/^\d{4}$/.test(hhmm)) return fallback;
  return parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(2, 4), 10);
}

/**
 * 조회 기간 전체를 BE 의 PSR_TIME_KEY 원본 키 배열로 빈 구간 없이 열거.
 *
 * 시간축 차트에서 데이터가 없는 슬롯(타임슬롯)도 축에 표시(0 바인딩)하기 위함
 * — BE 는 데이터 있는 구간만 row 로 내려주므로 FE 가 기간 기준으로 축을 채운다.
 *
 * BE 키 범위 의미와 동일하게 재현한다:
 *  - startTime/endTime: 전역 범위의 첫날 시작/마지막날 종료 경계(중간 날은 풀 범위)
 *  - useInterval+interval: 매일 동일 일내 창으로 제한
 *  - excludeDays: 해당 요일(날짜) 통째 제외
 *  - excludeLunch: 점심 시간대는 BE 공통코드라 FE 가 알 수 없음 → 열거 포기(null, distinct 폴백)
 *
 * @returns 원본 키 배열(YYYYMMDD 등). 열거 비대상이면 null.
 */
export function enumerateTimeKeys(from: string, to: string, unit: string, conditions: TimeKeyConditions = {}): string[] | null {
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;

  const skipDays = new Set((conditions.excludeDays ?? []).map((d) => d.toUpperCase()));
  const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const keys: string[] = [];

  switch (unit) {
    case 'DAILY': {
      for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (skipDays.size && skipDays.has(DOW_CODES[d.getDay()])) continue;
        keys.push(ymd(d));
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
    case 'HOURLY':
    case '10MIN': {
      // 점심 제외는 점심 시간대를 FE 가 모르므로 열거하지 않음(데이터 distinct 폴백)
      if (conditions.excludeLunch) return null;

      const step = unit === 'HOURLY' ? 60 : 10;
      const floorStep = (m: number) => Math.floor(m / step) * step;
      const ivOn = !!conditions.useInterval;
      const ivLo = ivOn ? floorStep(hhmmToMin(conditions.intervalFrom, 0)) : 0;
      const ivHi = ivOn ? floorStep(hhmmToMin(conditions.intervalTo, 23 * 60 + 59)) : 23 * 60 + 59;
      const lastDayMin = floorStep(23 * 60 + (step === 60 ? 0 : 50)); // 시간:매 정각, 10분:매 :x0

      for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (skipDays.size && skipDays.has(DOW_CODES[d.getDay()])) continue;
        // 첫날은 startTime, 마지막날은 endTime 으로 경계 클립(중간 날은 풀 범위)
        let lo = d.getTime() === start.getTime() ? floorStep(hhmmToMin(conditions.startTime, 0)) : 0;
        let hi = d.getTime() === end.getTime() ? floorStep(hhmmToMin(conditions.endTime, lastDayMin)) : lastDayMin;
        // interval 은 매일 동일 창으로 추가 제한
        lo = Math.max(lo, ivLo);
        hi = Math.min(hi, ivHi);
        const day = ymd(d);
        for (let t = lo; t <= hi; t += step) {
          const h = Math.floor(t / 60);
          const m = t % 60;
          keys.push(unit === 'HOURLY' ? `${day}${pad(h)}` : `${day}${pad(h)}${pad(m)}`);
        }
      }
      return keys;
    }
    default:
      return null;
  }
}
