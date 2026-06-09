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
