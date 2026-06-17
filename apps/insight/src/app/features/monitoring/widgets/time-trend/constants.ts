/** 타임트렌드 차트 시리즈 색상 (bt 토큰 hex와 정합). */
export const TREND_COLOR = {
  inbound: '#085fb5', // 인입콜
  answered: '#0a8a4a', // 응대(처리)
  unhandled: '#c92a2a', // 미처리
  abandon: '#b76e00', // 포기율(우축)
} as const;

/** 포기율(우축) 주의 임계(%). */
export const ABANDON_WARN_PCT = 5;

/**
 * 타임라인 표시 시간대 최종 폴백(09~18시).
 * 카탈로그 DEFAULT_SETTINGS_JSON 에도 값이 없을 때만 사용 — 보통은 BE 가 카탈로그 기본값을 내려준다.
 */
export const DEFAULT_HOUR_RANGE = { fromHour: 9, toHour: 18 } as const;
