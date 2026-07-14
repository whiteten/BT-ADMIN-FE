export const SCHEDULE_USAGE_FLAG = {
  YES: 'YES',
  NO: 'NO',
} as const;
export type ScheduleUsageFlag = (typeof SCHEDULE_USAGE_FLAG)[keyof typeof SCHEDULE_USAGE_FLAG];

export const SCHEDULE_USAGE_FLAG_LABELS: Record<ScheduleUsageFlag, string> = {
  YES: '예',
  NO: '아니오',
};
