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

/** 단위별 최대 조회 기간(일). Number.POSITIVE_INFINITY = 제한 없음. */
export type TimeUnitLimits = Record<TimeUnit, number>;

/** 일 수 정규화 — 0/음수/NaN(미설정·null·빈값)은 "제한 없음"(Infinity). */
const toDays = (raw: number): number => (Number.isFinite(raw) && raw > 0 ? raw : Number.POSITIVE_INFINITY);

/**
 * 통계 설정(TIMEUNIT_LIMIT) → 단위별 최대 조회 기간(일) 맵.
 * <p>
 * - 설정값 0/빈값/null = 제한 없음.
 * - API 미로딩·권한없음 시 시드 기본값({@link DEFAULT_TIME_UNIT_LIMIT})으로 폴백.
 */
export function useTimeUnitLimits(): { limits: TimeUnitLimits; isLoading: boolean } {
  const { data, isLoading } = useGetStatConfigs({
    params: { category: 'TIMEUNIT_LIMIT' },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const limits = useMemo<TimeUnitLimits>(() => {
    // 시드 기본값으로 초기화 (API 실패해도 동일 정책 적용)
    const base: TimeUnitLimits = {
      '10MIN': toDays(DEFAULT_TIME_UNIT_LIMIT.MI),
      HOURLY: toDays(DEFAULT_TIME_UNIT_LIMIT.HH),
      DAILY: toDays(DEFAULT_TIME_UNIT_LIMIT.DD),
      MONTHLY: toDays(DEFAULT_TIME_UNIT_LIMIT.MM),
      YEARLY: toDays(DEFAULT_TIME_UNIT_LIMIT.YY),
    };
    (data ?? []).forEach((item) => {
      if (item.configCategory !== 'TIMEUNIT_LIMIT') return;
      const unit = CODE_TO_UNIT[item.configKey as TimeUnitCode];
      if (!unit) return;
      base[unit] = toDays(Number(item.configValue));
    });
    return base;
  }, [data]);

  return { limits, isLoading };
}
