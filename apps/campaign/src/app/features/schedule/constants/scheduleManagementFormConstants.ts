export const SCHEDULE_CRON_SETTING = {
  SELECT: 'SELECT',
  DIRECT: 'DIRECT',
} as const;
export type ScheduleCronSetting = (typeof SCHEDULE_CRON_SETTING)[keyof typeof SCHEDULE_CRON_SETTING];

export const SCHEDULE_CRON_SETTING_OPTIONS = [
  { label: '선택설정', value: SCHEDULE_CRON_SETTING.SELECT },
  { label: '직접입력', value: SCHEDULE_CRON_SETTING.DIRECT },
] as const;

export const SCHEDULE_CRON_REPEAT = {
  NONE: 'NONE',
  REPEAT: 'REPEAT',
} as const;
export type ScheduleCronRepeat = (typeof SCHEDULE_CRON_REPEAT)[keyof typeof SCHEDULE_CRON_REPEAT];

export const SCHEDULE_CRON_REPEAT_OPTIONS = [
  { label: '반복안함', value: SCHEDULE_CRON_REPEAT.NONE },
  { label: '반복', value: SCHEDULE_CRON_REPEAT.REPEAT },
] as const;

export const SCHEDULE_CRON_ALL_VALUE = 'ALL';

export const SCHEDULE_CRON_DAY_OF_WEEK_OPTIONS = [
  { label: '전체', value: SCHEDULE_CRON_ALL_VALUE },
  { label: '일요일', value: '0' },
  { label: '월요일', value: '1' },
  { label: '화요일', value: '2' },
  { label: '수요일', value: '3' },
  { label: '목요일', value: '4' },
  { label: '금요일', value: '5' },
  { label: '토요일', value: '6' },
] as const;

export const SCHEDULE_CRON_MONTH_OPTIONS = [
  { label: '전체', value: SCHEDULE_CRON_ALL_VALUE },
  ...Array.from({ length: 12 }, (_, index) => ({
    label: String(index + 1),
    value: String(index + 1),
  })),
] as const;

export const SCHEDULE_CRON_DAY_OPTIONS = [
  { label: '전체', value: SCHEDULE_CRON_ALL_VALUE },
  ...Array.from({ length: 31 }, (_, index) => ({
    label: String(index + 1),
    value: String(index + 1),
  })),
] as const;

function createTimeUnitValueOptions(max: number) {
  return [{ label: '전체', value: SCHEDULE_CRON_ALL_VALUE }, ...Array.from({ length: max + 1 }, (_, index) => ({ label: String(index), value: String(index) }))];
}

export const SCHEDULE_CRON_HOUR_VALUE_OPTIONS = createTimeUnitValueOptions(23);
export const SCHEDULE_CRON_MINUTE_VALUE_OPTIONS = createTimeUnitValueOptions(59);
export const SCHEDULE_CRON_SECOND_VALUE_OPTIONS = createTimeUnitValueOptions(59);

export const SCHEDULE_CRON_EXPRESSION_GUIDE = [
  '※ 크론표현식: 초(0~59) 분(0~59) 시(0~23) 일(1~31) 월(1~12) 요일(0~6) 년(생략가능)',
  '예) 0 0 1 * * * (새벽 1시 실행), 0 0/2 * * * * (2분마다 실행)',
] as const;
