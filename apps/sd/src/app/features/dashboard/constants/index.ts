/**
 * 통계 유형별 색상 정의
 * 차트 및 UI 요소에서 일관된 색상 사용을 위한 상수
 */
export const STAT_COLORS: Record<string, string> = {
  STAT_CB_INTENT: '#3b82f6', // blue-500
  STAT_CB_ENTITY: '#8b5cf6', // violet-500
  STAT_CB_KEYWORD: '#10b981', // emerald-500
  STAT_IR_BOT_SERVICE: '#f59e0b', // amber-500
  STAT_IR_BOT_DIALOG: '#ef4444', // red-500
  STAT_IR_BOT_SLOT: '#06b6d4', // cyan-500
} as const;

/**
 * 통계 유형별 한글 라벨
 */
export const STAT_LABELS: Record<string, string> = {
  STAT_CB_INTENT: '인텐트',
  STAT_CB_ENTITY: '엔티티',
  STAT_CB_KEYWORD: '키워드',
  STAT_IR_BOT_SERVICE: '서비스',
  STAT_IR_BOT_DIALOG: '대화',
  STAT_IR_BOT_SLOT: '슬롯',
} as const;

/**
 * 날짜 포맷 상수
 */
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm:ss',
  SHORT_DATETIME: 'MM-DD HH:mm:ss',
  HOUR: 'HH:mm',
} as const;

/**
 * 폴링/리프레시 간격 (ms)
 */
export const REFRESH_INTERVALS = {
  STATUS: 10_000, // 10초
  DEFAULT: 30_000, // 30초
} as const;

/**
 * 페이지네이션 기본값
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;
