export const EXECUTION_STATUS = {
  WAITING: 'WAITING',
  IN_PROGRESS: 'IN_PROGRESS',
  STOPPED: 'STOPPED',
  COMPLETED: 'COMPLETED',
} as const;

export type ExecutionStatus = (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS];

export const EXECUTION_TARGET_STATUS = {
  WAITING: 'WAITING',
  CALLING: 'CALLING',
  ENDED: 'ENDED',
  CALL_FAILED: 'CALL_FAILED',
  BUSY: 'BUSY',
  NO_ANSWER: 'NO_ANSWER',
  DISCONNECTED: 'DISCONNECTED',
  VOICEMAIL: 'VOICEMAIL',
  FAX_CONNECTED: 'FAX_CONNECTED',
  CALL_REJECTED: 'CALL_REJECTED',
  POWER_OFF: 'POWER_OFF',
  ROAMING: 'ROAMING',
  OTHER: 'OTHER',
  SERVER_INTEGRATION_FAILED: 'SERVER_INTEGRATION_FAILED',
  DATA_ERROR: 'DATA_ERROR',
  AI_INTEGRATION_FAILED: 'AI_INTEGRATION_FAILED',
  TEST_CASE_FAILED: 'TEST_CASE_FAILED',
  STT_ERROR: 'STT_ERROR',
  TTS_ERROR: 'TTS_ERROR',
  DTMF_ERROR: 'DTMF_ERROR',
  NEEDS_CONFIRMATION: 'NEEDS_CONFIRMATION',
  EXCLUDED: 'EXCLUDED',
  RESERVATION_SET: 'RESERVATION_SET',
  EXCLUDED_DUPLICATE: 'EXCLUDED_DUPLICATE',
  TEST_CASE: 'TEST_CASE',
  DNC_STOP: 'DNC_STOP',
  RECRUITMENT_ERROR: 'RECRUITMENT_ERROR',
  CONSULTATION_TRANSFER: 'CONSULTATION_TRANSFER',
  CALLBACK_SAVED: 'CALLBACK_SAVED',
  CALL_DISTRIBUTION_WAIT_END: 'CALL_DISTRIBUTION_WAIT_END',
} as const;

export type ExecutionTargetStatus = (typeof EXECUTION_TARGET_STATUS)[keyof typeof EXECUTION_TARGET_STATUS];

export const EXECUTION_MONITORING_MODE = {
  MANUAL: 'MANUAL',
  AUTO: 'AUTO',
} as const;

export type ExecutionMonitoringMode = (typeof EXECUTION_MONITORING_MODE)[keyof typeof EXECUTION_MONITORING_MODE];

export const EXECUTION_PROCESS_STATUS_FILTER = {
  WAITING: 'WAITING',
  IN_PROGRESS: 'IN_PROGRESS',
  STOPPED: 'STOPPED',
} as const;

export type ExecutionProcessStatusFilter = (typeof EXECUTION_PROCESS_STATUS_FILTER)[keyof typeof EXECUTION_PROCESS_STATUS_FILTER];

export const EXECUTION_DETAIL_SEARCH_CONDITION = {
  CUSTOMER_NAME: 'CUSTOMER_NAME',
  CUSTOMER_NUMBER: 'CUSTOMER_NUMBER',
  PHONE_NUMBER: 'PHONE_NUMBER',
  CALL_ID: 'CALL_ID',
} as const;

export type ExecutionDetailSearchCondition = (typeof EXECUTION_DETAIL_SEARCH_CONDITION)[keyof typeof EXECUTION_DETAIL_SEARCH_CONDITION];

export const EXECUTION_BATCH_CHANGE_ACTION = {
  WAITING: 'WAITING',
  EXCLUDED: 'EXCLUDED',
  RETRY: 'RETRY',
} as const;

export type ExecutionBatchChangeAction = (typeof EXECUTION_BATCH_CHANGE_ACTION)[keyof typeof EXECUTION_BATCH_CHANGE_ACTION];

export interface CampaignExecutionItem {
  executionId: string;
  tenantId: string;
  campaignId: string;
  scenarioListId: string;
  campaignName: string;
  campaignDisplayId?: string;
  executionDate: string;
  scenarioName: string;
  scenarioDisplayId?: string;
  channel: string;
  actionChannel?: string;
  campaignCode?: string;
  callCount: number;
  priority: number;
  round: number;
  processTimeStart?: string;
  processTimeEnd?: string;
  processStartTime?: string;
  processEndTime?: string;
  processFinalTime?: string;
  notificationCriteria?: number;
  description?: string;
  workDateTime?: string;
  status: ExecutionStatus;
  timelinePct: number;
  progressRatePct: number;
  targetCount: number;
  completedCount: number;
  waitingCount: number;
  inProgressCount: number;
  endedCount: number;
  failedCount: number;
  excludedCount: number;
  busyCount: number;
  noAnswerCount: number;
  disconnectedCount: number;
  faxConnectedCount: number;
  callRejectedCount: number;
  powerOffCount: number;
  roamingCount: number;
  otherFailureCount: number;
}

export interface ExecutionTargetExtraInfoItem {
  key: string;
  value: string;
  description: string;
}

export interface ExecutionTargetItem {
  targetId: string;
  executionId: string;
  senderKey?: string;
  customerKey?: string;
  customerName: string;
  phoneNumber: string;
  customerNumber: string;
  processStatus: ExecutionTargetStatus;
  round?: number;
  createdAt?: string;
  reservationTime?: string;
  callDateTime?: string;
  callId?: string;
  workDateTime: string;
  extraInfoItems?: ExecutionTargetExtraInfoItem[];
}
