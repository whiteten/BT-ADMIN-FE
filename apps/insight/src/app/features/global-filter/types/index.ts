import type { ComparisonType, TimeUnit } from '../../report/types';

export type { TimeUnit, ComparisonType };

export interface GlobalFilter {
  period: { from: string; to: string };
  timeUnit: TimeUnit;
  searchValues: Record<string, unknown>;
  comparison: ComparisonType | null;
}

export const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  '10MIN': '10분',
  HOURLY: '시간',
  DAILY: '일별',
  MONTHLY: '월별',
  YEARLY: '연도별',
};

export const COMPARISON_LABELS: Record<ComparisonType, string> = {
  PREV_DAY: '전일',
  PREV_WEEK: '전주',
  PREV_MONTH: '전월',
  PREV_YEAR: '전년',
};

export const COMPARISON_AVAILABILITY: Record<TimeUnit, Record<ComparisonType, boolean>> = {
  '10MIN': { PREV_DAY: true, PREV_WEEK: true, PREV_MONTH: true, PREV_YEAR: true },
  HOURLY: { PREV_DAY: true, PREV_WEEK: true, PREV_MONTH: true, PREV_YEAR: true },
  DAILY: { PREV_DAY: true, PREV_WEEK: true, PREV_MONTH: true, PREV_YEAR: true },
  MONTHLY: { PREV_DAY: false, PREV_WEEK: false, PREV_MONTH: true, PREV_YEAR: true },
  YEARLY: { PREV_DAY: false, PREV_WEEK: false, PREV_MONTH: false, PREV_YEAR: true },
};
