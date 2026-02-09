import { useCallback, useState } from 'react';
import { message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

// timeUnit별 최대 검색 기간 (일 단위)
const MAX_DATE_RANGE: Record<string, number> = {
  MI: 2, // 10분간: 2일
  HH: 7, // 시간: 7일
  DD: 15, // 일간: 15일
  MM: 180, // 월간: 6개월 (약 180일)
  YY: 1825, // 년간: 5년 (약 1825일)
};

// timeUnit별 검색 기간 설명
const DATE_RANGE_LABEL: Record<string, string> = {
  MI: '2일',
  HH: '7일',
  DD: '15일',
  MM: '6개월',
  YY: '5년',
};

export const TIME_FORMAT: Record<string, string> = {
  MI: 'YYYY-MM-DD HH시 mm분',
  HH: 'YYYY-MM-DD HH시',
  DD: 'YYYY-MM-DD',
  MM: 'YYYY-MM',
  YY: 'YYYY',
};

interface UseDateRangeLimitProps {
  initialTimeUnit?: string;
  initialDays?: number;
}

// 공통 유틸 함수들 (export)
export const getTimeFormat = (unit?: string) => TIME_FORMAT[unit ?? ''] ?? 'YYYY-MM-DD';
export const getMaxDays = (unit: string) => MAX_DATE_RANGE[unit] ?? 15;

export const validateDateRange = (startDate: Dayjs, endDate: Dayjs, unit: string): boolean => {
  // endDate가 startDate보다 이전이면 false
  if (endDate.isBefore(startDate, 'day')) {
    return false;
  }

  const daysDiff = endDate.diff(startDate, 'day');
  const maxDays = getMaxDays(unit);
  return daysDiff <= maxDays;
};

export function useDateRangeLimit({ initialTimeUnit = 'DD', initialDays = 7 }: UseDateRangeLimitProps = {}) {
  const [draftDateRange, setDraftDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(initialDays, 'day'), dayjs()]);
  const [queryDateRange, setQueryDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(initialDays, 'day'), dayjs()]);
  const [timeUnit, setTimeUnit] = useState<string>(initialTimeUnit);

  const adjustDateRange = (unit: string): [Dayjs, Dayjs] => {
    const maxDays = getMaxDays(unit);
    const end = dayjs();
    const start = end.subtract(maxDays, 'day');
    return [start, end];
  };

  const handleTimeUnitChange = useCallback(
    (value?: string) => {
      const newUnit = value ?? '';
      setTimeUnit(newUnit);

      // timeUnit 변경 시 현재 날짜 범위가 제한을 초과하면 자동 조정
      if (!validateDateRange(draftDateRange[0], draftDateRange[1], newUnit)) {
        const adjustedRange = adjustDateRange(newUnit);
        setDraftDateRange(adjustedRange);
        message.warning(`${DATE_RANGE_LABEL[newUnit]} 이내로 날짜 범위가 조정되었습니다.`);
      }
    },
    [draftDateRange],
  );

  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (dates?.[0] && dates?.[1]) {
        const startDate = dates[0];
        const endDate = dates[1];

        // 날짜 범위 검증
        if (!validateDateRange(startDate, endDate, timeUnit)) {
          message.warning(`검색 기간은 ${DATE_RANGE_LABEL[timeUnit]} 이내로 설정해주세요.`);
          return;
        }

        setDraftDateRange([startDate, endDate]);
      }
    },
    [timeUnit],
  );

  // RangePicker에서 선택 불가능한 날짜 설정
  const disabledDate = useCallback(
    (current: Dayjs, info: { from?: Dayjs }) => {
      if (!current) return false;

      const maxDays = getMaxDays(timeUnit);
      const today = dayjs();

      // 미래 날짜 비활성화
      if (current.isAfter(today, 'day')) {
        return true;
      }

      // 시작 날짜가 선택되었을 때, 최대 범위를 벗어나는 날짜 비활성화
      if (info.from) {
        // endDate가 startDate보다 이전이면 비활성화
        if (current.isBefore(info.from, 'day')) {
          return true;
        }
        // 최대 범위를 벗어나는 날짜 비활성화
        const daysDiff = current.diff(info.from, 'day');
        return daysDiff > maxDays;
      }

      return false;
    },
    [timeUnit],
  );

  const handleSearch = useCallback(() => {
    setQueryDateRange(draftDateRange);
  }, [draftDateRange]);

  return {
    draftDateRange,
    queryDateRange,
    timeUnit,
    handleTimeUnitChange,
    handleDateRangeChange,
    handleSearch,
    disabledDate,
    getTimeFormat: () => getTimeFormat(timeUnit),
    validateDateRange,
    getMaxDays,
  };
}

// 개별 DatePicker용 disabledDate 함수 생성 헬퍼 (시작일 DatePicker)
export const createDisabledDate = (_timeUnit: string) => {
  return (current: Dayjs) => {
    if (!current) return false;
    const today = dayjs();
    // 미래 날짜 비활성화
    if (current.isAfter(today, 'day')) {
      return true;
    }
    return false;
  };
};

// 종료일 DatePicker용 disabledDate 함수 생성 헬퍼
export const createEndDisabledDate = (startDate: Dayjs | null, timeUnit: string) => {
  return (current: Dayjs) => {
    if (!current) return false;
    const today = dayjs();
    if (current.isAfter(today, 'day')) return true;
    if (startDate) {
      if (current.isBefore(startDate, 'day')) return true;
      const maxDays = getMaxDays(timeUnit);
      if (current.diff(startDate, 'day') > maxDays) return true;
    }
    return false;
  };
};
