export const CHART_COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#F06548',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  pink: '#EC4899',
  orange: '#F97316',
  indigo: '#6366F1',
  teal: '#14B8A6',
} as const;

/** 워드클라우드 텍스트용 색상 (흰색 배경 기준, 가독성 높은 50색) */
// prettier-ignore
export const WORD_CLOUD_COLORS = [
  '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#0891B2', '#C026D3', '#EA580C', '#4F46E5', '#0D9488',
  '#B91C1C', '#1D4ED8', '#15803D', '#A16207', '#6D28D9', '#0E7490', '#A21CAF', '#C2410C', '#4338CA', '#0F766E',
  '#9333EA', '#E11D48', '#16A34A', '#CA8A04', '#2DD4BF', '#DB2777', '#0284C7', '#65A30D', '#9F1239', '#7E22CE',
  '#047857', '#B45309', '#1E40AF', '#BE123C', '#6B21A8', '#0369A1', '#4D7C0F', '#9A3412', '#3730A3', '#115E59',
  '#86198F', '#BE185D', '#1E3A8A', '#166534', '#92400E', '#581C87', '#155E75', '#7C2D12', '#312E81', '#134E4A',
] as const;

export const DEFAULT_ROW_CNT = 10;
export const GRID_COLS = 12;
export const REFRESH_INTERVAL = 3000;
