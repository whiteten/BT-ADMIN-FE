export const SCHEDULE_TYPE = {
  EXECUTE: 'EXECUTE',
  IMMEDIATE_EXECUTE: 'IMMEDIATE_EXECUTE',
} as const;
export type ScheduleType = (typeof SCHEDULE_TYPE)[keyof typeof SCHEDULE_TYPE];

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  EXECUTE: '실행',
  IMMEDIATE_EXECUTE: '즉시실행',
};

export const SCHEDULE_TYPE_FILTER_OPTIONS = [
  { label: SCHEDULE_TYPE_LABELS.EXECUTE, value: SCHEDULE_TYPE.EXECUTE },
  { label: SCHEDULE_TYPE_LABELS.IMMEDIATE_EXECUTE, value: SCHEDULE_TYPE.IMMEDIATE_EXECUTE },
] as const;

export const SCHEDULE_STATUS = {
  NORMAL: 'NORMAL',
  ERROR: 'ERROR',
  NONE: 'NONE',
} as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUS)[keyof typeof SCHEDULE_STATUS];

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  NORMAL: '정상',
  ERROR: '오류',
  NONE: '없음',
};

export const SCHEDULE_STATUS_FILTER_OPTIONS = [
  { label: SCHEDULE_STATUS_LABELS.NORMAL, value: SCHEDULE_STATUS.NORMAL },
  { label: SCHEDULE_STATUS_LABELS.ERROR, value: SCHEDULE_STATUS.ERROR },
  { label: SCHEDULE_STATUS_LABELS.NONE, value: SCHEDULE_STATUS.NONE },
] as const;
