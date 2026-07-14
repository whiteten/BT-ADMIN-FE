export const SCHEDULE_SERVER_ACTIVE = {
  YES: 'Y',
  NO: 'N',
} as const;
export type ScheduleServerActive = (typeof SCHEDULE_SERVER_ACTIVE)[keyof typeof SCHEDULE_SERVER_ACTIVE];

export const SCHEDULE_SERVER_ACTIVE_LABELS: Record<ScheduleServerActive, string> = {
  Y: 'Y',
  N: 'N',
};

export const SCHEDULE_SERVER_PROTOCOL = {
  HTTP: 'http',
  HTTPS: 'https',
} as const;
export type ScheduleServerProtocol = (typeof SCHEDULE_SERVER_PROTOCOL)[keyof typeof SCHEDULE_SERVER_PROTOCOL];

export const SCHEDULE_SERVER_PROTOCOL_OPTIONS = [
  { label: 'http', value: SCHEDULE_SERVER_PROTOCOL.HTTP },
  { label: 'https', value: SCHEDULE_SERVER_PROTOCOL.HTTPS },
] as const;

export const DEFAULT_SCHEDULE_SERVER_PORT = 9090;
