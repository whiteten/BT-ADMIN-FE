import type { ScheduleStatus, ScheduleType } from '../constants/scheduleConstants';

export interface ScheduleListItem {
  scheduleId: string;
  tenantId: string;
  campaignId: string;
  executionDate: string;
  scheduleName: string;
  scheduleType: ScheduleType;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  statusMessage: string;
  tenantName: string;
  worker: string;
  workDateTime: string;
}
