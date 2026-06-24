import type { ScheduleUsageFlag } from '../constants/scheduleManagementConstants';

export interface ScheduleManagementItem {
  scheduleId: string;
  tenantId: string;
  scheduleName: string;
  serviceName: string;
  methodName: string;
  parameter: string;
  executionCycle: string;
  usageEnabled: ScheduleUsageFlag;
  historyCollection: ScheduleUsageFlag;
  worker: string;
  workDateTime: string;
}
