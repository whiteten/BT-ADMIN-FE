import { useMemo } from 'react';
import { useGetStatConfigs } from '../../stat-config/hooks/useStatConfigQueries';
import { DEFAULT_TIME_UNIT_LIMIT, type TimeUnitCode } from '../../stat-config/types';
import type { TimeUnit } from '../types';

/** stat-config 코드(MI/HH/DD/MM/YY) → 글로벌필터 단위(10MIN/HOURLY/DAILY/MONTHLY/YEARLY). */
const CODE_TO_UNIT: Record<TimeUnitCode, TimeUnit> = {
  MI: '10MIN',
  HH: 'HOURLY',
  DD: 'DAILY',
  MM: 'MONTHLY',
  YY: 'YEARLY',
};

/** 단위별 최대 조회 기간(일). 항상 유한(무제한 없음). */
export type TimeUnitLimits = Record<TimeUnit, number>;

/** 일 수 정규화 — 0/음수/NaN(미설정·null·빈값)은 무제한이 아니라 단위 기본값(fallback)으로 대체. */
const toDays = (raw: number, fallback: number): number => (Number.isFinite(raw) && raw > 0 ? raw : fallback);

/**
 * 통계 설정(TIMEUNIT_LIMIT) → 단위별 최대 조회 기간(일) 맵.
 * <p>
 * - 무제한 불가: 설정값 0/빈값/null 은 단위 시드 기본값으로 폴백(가드 항상 동작).
 * - API 미로딩·권한없음 시에도 시드 기본값({@link DEFAULT_TIME_UNIT_LIMIT})으로 폴백.
 */
export function useTimeUnitLimits(): { limits: TimeUnitLimits; isLoading: boolean } {
  const { data, isLoading } = useGetStatConfigs({
    params: { category: 'TIMEUNIT_LIMIT' },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const limits = useMemo<TimeUnitLimits>(() => {
    // 시드 기본값으로 초기화 (API 실패해도 동일 정책 적용)
    const base: TimeUnitLimits = {
      '10MIN': DEFAULT_TIME_UNIT_LIMIT.MI,
      HOURLY: DEFAULT_TIME_UNIT_LIMIT.HH,
      DAILY: DEFAULT_TIME_UNIT_LIMIT.DD,
      MONTHLY: DEFAULT_TIME_UNIT_LIMIT.MM,
      YEARLY: DEFAULT_TIME_UNIT_LIMIT.YY,
    };
    (data ?? []).forEach((item) => {
      if (item.configCategory !== 'TIMEUNIT_LIMIT') return;
      const code = item.configKey as TimeUnitCode;
      const unit = CODE_TO_UNIT[code];
      if (!unit) return;
      base[unit] = toDays(Number(item.configValue), DEFAULT_TIME_UNIT_LIMIT[code]);
    });
    return base;
  }, [data]);

  return { limits, isLoading };
}
