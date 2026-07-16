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
  excludeLunch: boolean;
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
  /**
   * 운영자 모드 전용 — 조회 대상 테넌트 (필수 선행 조건).
   * 선택 전에는 조회가 차단되고, 선택 시 하위 검색조건 옵션·패널 데이터가 모두
   * 이 테넌트 기준으로 조회된다. 일반 모드에서는 null (컨텍스트 테넌트 사용).
   */
  tenantId?: string | null;
}

export const DEFAULT_GLOBAL_CONDITIONS: GlobalConditions = {
  startTime: null,
  endTime: null,
  excludeLunch: false,
  useInterval: false,
  intervalFrom: null,
  intervalTo: null,
  excludeDays: [],
};

export const WEEKDAY_OPTIONS = [
  { label: '월요일', value: 'MON' },
  { label: '화요일', value: 'TUE' },
  { label: '수요일', value: 'WED' },
  { label: '목요일', value: 'THU' },
  { label: '금요일', value: 'FRI' },
  { label: '토요일', value: 'SAT' },
  { label: '일요일', value: 'SUN' },
];

export const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  '10MIN': '10분',
  HOURLY: '시간',
  DAILY: '일별',
  MONTHLY: '월별',
  YEARLY: '연도별',
};

/**
 * 빠른검색 프리셋 — 단위별로 노출 목록이 달라진다 (레거시 SWAT UnitTypeControlV2 동일).
 * 선택 시 검색일자(기간)를 해당 범위로 세팅한다. 백엔드 비교(comparison)와는 무관.
 */
export type QuickPreset = 'TODAY' | 'PREV_DAY' | 'LAST_WEEK' | 'CUR_MONTH' | 'PREV_MONTH' | 'LAST_3MONTH' | 'CUR_YEAR' | 'PREV_YEAR' | 'LAST_3YEAR';

export const QUICK_PRESET_LABELS: Record<QuickPreset, string> = {
  TODAY: '오늘',
  PREV_DAY: '전일',
  LAST_WEEK: '최근1주일',
  CUR_MONTH: '당월',
  PREV_MONTH: '전월',
  LAST_3MONTH: '최근3개월',
  CUR_YEAR: '금년',
  PREV_YEAR: '전년',
  LAST_3YEAR: '최근3년',
};

export const QUICK_PRESETS_BY_UNIT: Record<TimeUnit, QuickPreset[]> = {
  '10MIN': ['TODAY', 'PREV_DAY'],
  HOURLY: ['TODAY', 'PREV_DAY', 'LAST_WEEK'],
  DAILY: ['TODAY', 'PREV_DAY', 'LAST_WEEK'],
  MONTHLY: ['CUR_MONTH', 'PREV_MONTH', 'LAST_3MONTH'],
  YEARLY: ['CUR_YEAR', 'PREV_YEAR', 'LAST_3YEAR'],
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
