import dayjs, { type Dayjs } from 'dayjs';
import type { TimeUnit } from '../types';

// timeUnit별 최대 검색 기간 (일 단위) — stat-config(TIMEUNIT_LIMIT) 미로딩 시 폴백 기본값
const MAX_DATE_RANGE: Record<TimeUnit, number> = {
  '10MIN': 2, // 10분단위: 2일
  HOURLY: 7, // 시간별: 7일
  DAILY: 15, // 일간: 15일
  MONTHLY: 180, // 월간: 6개월 (약 180일)
  YEARLY: 1825, // 년간: 5년 (약 1825일)
};

// timeUnit별 검색 기간 설명 (경고 메시지용 폴백)
export const DATE_RANGE_LABEL: Record<TimeUnit, string> = {
  '10MIN': '2일',
  HOURLY: '7일',
  DAILY: '15일',
  MONTHLY: '6개월',
  YEARLY: '5년',
};

/**
 * 단위별 최대 조회 기간(일). limits(통계설정) 우선, 없으면 폴백 기본값.
 * 항상 유한값(무제한 없음).
 */
export const getMaxDays = (unit: TimeUnit, limits?: Partial<Record<TimeUnit, number>>): number => limits?.[unit] ?? MAX_DATE_RANGE[unit] ?? 15;

/** 경고 메시지용 라벨 — 통계설정 값 반영. */
export const getRangeLabel = (unit: TimeUnit, limits?: Partial<Record<TimeUnit, number>>): string => `${getMaxDays(unit, limits)}일`;

// 날짜 범위 검증 (timeUnit별 최대 기간 체크)
export const validateDateRange = (startDate: Dayjs, endDate: Dayjs, unit: TimeUnit, limits?: Partial<Record<TimeUnit, number>>): boolean => {
  if (endDate.isBefore(startDate, 'day')) return false;
  return endDate.diff(startDate, 'day') <= getMaxDays(unit, limits);
};

// 시작일 DatePicker용 disabledDate (미래 날짜 비활성화)
export const createDisabledDate = (_unit: TimeUnit) => {
  return (current: Dayjs) => {
    if (!current) return false;
    return current.isAfter(dayjs(), 'day');
  };
};

// 종료일 DatePicker용 disabledDate (시작일 이전 + maxDays 초과 비활성화)
export const createEndDisabledDate = (startDate: Dayjs | null, unit: TimeUnit, limits?: Partial<Record<TimeUnit, number>>) => {
  return (current: Dayjs) => {
    if (!current) return false;
    if (current.isAfter(dayjs(), 'day')) return true;
    if (startDate) {
      if (current.isBefore(startDate, 'day')) return true;
      if (current.diff(startDate, 'day') > getMaxDays(unit, limits)) return true;
    }
    return false;
  };
};
