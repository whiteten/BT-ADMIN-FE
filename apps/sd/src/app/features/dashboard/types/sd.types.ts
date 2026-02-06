// ============================================
// API Response Types
// ============================================

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

// ============================================
// UI Component Types
// ============================================

/** 10분 단위 테이블 행 타입 */
export interface TenMinRow {
  timeSlot: string;
  [statType: string]: string | number;
}

/** 차트 데이터 포인트 타입 */
export interface ChartDataPoint {
  hour: string;
  [statType: string]: string | number;
}

// ============================================
// Constants
// ============================================

/** 통계 유형별 색상 정의 */
export const STAT_COLORS: Record<string, string> = {
  STAT_CB_INTENT: '#3b82f6',
  STAT_CB_ENTITY: '#8b5cf6',
  STAT_CB_KEYWORD: '#10b981',
  STAT_IR_BOT_SERVICE: '#f59e0b',
  STAT_IR_BOT_DIALOG: '#ef4444',
  STAT_IR_BOT_SLOT: '#06b6d4',
} as const;

/** 통계 유형별 한글 라벨 */
export const STAT_LABELS: Record<string, string> = {
  STAT_CB_INTENT: '인텐트',
  STAT_CB_ENTITY: '엔티티',
  STAT_CB_KEYWORD: '키워드',
  STAT_IR_BOT_SERVICE: '서비스',
  STAT_IR_BOT_DIALOG: '대화',
  STAT_IR_BOT_SLOT: '슬롯',
} as const;

/** 폴링/리프레시 간격 (ms) */
export const REFRESH_INTERVALS = {
  STATUS: 10_000,
  DEFAULT: 30_000,
} as const;
