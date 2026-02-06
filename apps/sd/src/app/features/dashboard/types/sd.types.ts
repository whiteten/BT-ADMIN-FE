// BatchStatusDto
export interface BatchStatus {
  serverTime: string;
  config: BatchConfig;
  checkpoints: Checkpoint[];
  nextExecutionTime: string;
  startupTime: string;
  totalExecutionCount: number;
  exceptions: ExceptionRecord[];
  cdrStatuses: CdrStatus[];
  statStatuses: StatStatus[];
}

export interface BatchConfig {
  cron: string;
  delaySeconds: number;
}

export interface Checkpoint {
  systemType: string;
  dataType: string;
  lastPsrTimeKey: string;
  lastUpdateTime: string;
  status: string;
}

export interface ExceptionRecord {
  triggerExId: string;
  triggerName: string;
  errCode: number;
  errMessage: string;
  errTime: string;
}

export interface CdrStatus {
  cdrType: string;
  tableName: string;
  tableComment: string;
  timeColumn: string;
  latestDbInsertTime: string;
  totalCount: number;
}

export interface StatStatus {
  statType: string;
  systemType: string;
  tablePattern: string;
  latestAggregationTime: string;
  dbUpdateTime: string;
}

// HourlyTrendDto
export interface HourlyTrend {
  statType: string;
  systemType: string;
  hourOfDay: number;
  timeSlot: string;
  count: number;
}

// SchedulerStatus
export interface SchedulerStatus {
  running: boolean;
  paused: boolean;
  lastExecutionTime: string;
  nextScheduledTime: string;
  pausedBy: string;
  pausedAt: string;
  pauseReason: string;
  cron: string;
  delaySeconds: number;
}

// PauseRequest
export interface PauseRequest {
  reason: string;
}

// ApiResponse wrapper (BE returns this)
export interface ApiResponse<T> {
  ok: boolean;
  code: string;
  message: string;
  data: T;
  timestamp: string;
  requestId: string;
}
