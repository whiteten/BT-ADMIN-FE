import type { ComparisonType, TimeUnit } from '../../report/types';

export type { TimeUnit, ComparisonType };

/**
 * 글로벌 공통 검색조건 (봇 통계 공통 조회조건과 동일 — 기간/단위처럼 모든 패널에 적용).
 * searchValues(컬럼키 전용)와 분리해서 별도 객체로 관리·전송한다.
 * 시간 문자열은 모두 'HHmm' 4자리. excludeDays는 ['MON'..'SUN'].
 * (점심/공휴일 제외는 소스 테이블 연동 전이라 이번 범위 제외)
 */
export interface GlobalConditions {
  startTime: string | null;
  endTime: string | null;
  useInterval: boolean;
  intervalFrom: string | null;
  intervalTo: string | null;
  excludeDays: string[];
}

export interface GlobalFilter {
  period: { from: string; to: string };
  timeUnit: TimeUnit;
  searchValues: Record<string, unknown>;
  comparison: ComparisonType | null;
  conditions: GlobalConditions;
}

export const DEFAULT_GLOBAL_CONDITIONS: GlobalConditions = {
  startTime: null,
  endTime: null,
  useInterval: false,
  intervalFrom: null,
  intervalTo: null,
  excludeDays: [],
};

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
