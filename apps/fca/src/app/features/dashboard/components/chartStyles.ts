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

export const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger];

export const LINE_COLORS = [CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.purple];

export const commonAxisStyle = {
  axisLine: { lineStyle: { color: '#E9EBEC' } },
  axisTick: { show: false },
  axisLabel: { color: '#495057', fontSize: 12 },
} as const;

export const commonGridStyle = {
  left: 20,
  right: 30,
  bottom: 20,
  top: 20,
  containLabel: true,
} as const;

export const commonSplitLineStyle = {
  lineStyle: { type: 'dashed' as const, color: '#E9EBEC' },
} as const;
