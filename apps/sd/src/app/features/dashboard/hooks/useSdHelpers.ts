import dayjs from 'dayjs';
import type { HourlyTrend, TenMinRow, ChartDataPoint } from '../types/sd.types';
import { STAT_LABELS } from '../types/sd.types';

const DATE_FORMAT = 'YYYY-MM-DD';
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const TIME_FORMAT = 'HH:mm:ss';
const SHORT_DATETIME_FORMAT = 'MM-DD HH:mm:ss';
const HOUR_FORMAT = 'HH:mm';

/**
 * 10분 단위 데이터를 테이블 행 형태로 변환
 */
export function transformToTenMinRows(recentCounts: HourlyTrend[] | undefined): TenMinRow[] {
  if (!recentCounts?.length) return [];

  const statTypes = [...new Set(recentCounts.map((r) => r.statType))];
  const timeSlots = [...new Set(recentCounts.map((r) => r.timeSlot))];

  return timeSlots.map((slot) => {
    const row: TenMinRow = { timeSlot: slot };
    for (const st of statTypes) {
      row[st] = recentCounts.find((r) => r.timeSlot === slot && r.statType === st)?.count ?? 0;
    }
    return row;
  });
}

/**
 * 시간대별 데이터를 차트 데이터 형태로 변환
 */
export function transformToChartData(hourlyTrend: HourlyTrend[] | undefined): ChartDataPoint[] {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const statTypes = [...new Set(hourlyTrend?.map((h) => h.statType) ?? [])];

  return hours.map((hour) => {
    const point: ChartDataPoint = {
      hour: `${String(hour).padStart(2, '0')}시`,
    };
    for (const st of statTypes) {
      point[st] = hourlyTrend?.find((h) => h.hourOfDay === hour && h.statType === st)?.count ?? 0;
    }
    return point;
  });
}

/**
 * 통계 유형 배열에서 고유 값 추출
 */
export function extractUniqueStatTypes(data: HourlyTrend[] | undefined): string[] {
  return [...new Set(data?.map((item) => item.statType) ?? [])];
}

/**
 * 통계 유형에 대한 라벨 반환
 */
export function getStatLabel(statType: string): string {
  return STAT_LABELS[statType] ?? statType;
}

/**
 * 날짜 포맷팅 헬퍼
 */
export function formatDate(
  date: string | null | undefined,
  format: 'DATE' | 'DATETIME' | 'TIME' | 'SHORT_DATETIME' | 'HOUR' = 'DATETIME'
): string {
  if (!date) return '-';
  const formatMap = {
    DATE: DATE_FORMAT,
    DATETIME: DATETIME_FORMAT,
    TIME: TIME_FORMAT,
    SHORT_DATETIME: SHORT_DATETIME_FORMAT,
    HOUR: HOUR_FORMAT,
  };
  return dayjs(date).format(formatMap[format]);
}

/**
 * 숫자 천 단위 콤마 포맷팅
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return value.toLocaleString();
}

/**
 * 날짜 변경 헬퍼 (delta일 만큼 이동)
 */
export function shiftDate(currentDate: string, delta: number): string {
  return dayjs(currentDate).add(delta, 'day').format(DATE_FORMAT);
}

/**
 * 오늘 날짜 반환
 */
export function getToday(): string {
  return dayjs().format(DATE_FORMAT);
}

/**
 * 7일 전 날짜 반환
 */
export function getWeekAgo(): string {
  return dayjs().subtract(7, 'day').format(DATE_FORMAT);
}
