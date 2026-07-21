/**
 * 사용자 지정 시계 위젯의 기본 포맷.
 * 지원 토큰: yyyy(4자리 연도)/mm(월)/dd(일)/hh24(0~23시)/hh12(1~12시)/mi(분)/ss(초)/
 * ampm(AM·PM)/apk(오전·오후). AM/PM 형식은 hh12 + ampm(또는 apk) 조합으로 만든다.
 */
export const DEFAULT_CUSTOM_CLOCK_FORMAT = 'yyyy년 mm월 dd일 hh24시 mi분 ss초';

/** AM/PM 형식 프리셋 — 12시간제 + 오전/오후 표기 */
export const AMPM_CLOCK_FORMAT = 'yyyy년 mm월 dd일 apk hh12시 mi분 ss초';

/** 토큰 외 나머지 글자(공백, "년"/"월"/"일" 등)는 그대로 둔다. 토큰은 길이가 긴 것부터 매칭해 hh24가 h로 먼저 잘리지 않게 한다. */
const TOKEN_PATTERN = /yyyy|hh24|hh12|ampm|apk|mm|dd|mi|ss/gi;

export function formatCustomClock(date: Date, format: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const h24 = date.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const isAm = h24 < 12;
  const tokenValues: Record<string, string> = {
    yyyy: String(date.getFullYear()),
    mm: pad(date.getMonth() + 1),
    dd: pad(date.getDate()),
    hh24: pad(h24),
    hh12: pad(h12),
    mi: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
    ampm: isAm ? 'AM' : 'PM',
    apk: isAm ? '오전' : '오후',
  };
  return format.replace(TOKEN_PATTERN, (matched) => tokenValues[matched.toLowerCase()] ?? matched);
}
