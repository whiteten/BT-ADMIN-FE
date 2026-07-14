import type { ScheduleUsageFlag } from '../constants/scheduleManagementConstants';
import type { ScheduleCronSetting } from '../constants/scheduleManagementFormConstants';

export interface ScheduleManagementItem {
  scheduleId: string;
  scheduleCode: string;
  tenantId: string;
  scheduleName: string;
  serviceName: string;
  methodName: string;
  cronSetting: ScheduleCronSetting;
  parameter: string;
  executionCycle: string;
  usageEnabled: ScheduleUsageFlag;
  historyCollection: ScheduleUsageFlag;
  memo?: string;
  worker: string;
  workDateTime: string;
}
