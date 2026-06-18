/** AOE 모니터링 대시보드 타입 (BE: AOE:MONI:DASH:* 조회 결과) */

export interface AoeSummary {
  todayInboundCalls: number;
  inProgressCalls: number;
  completedCalls: number;
  failedCalls: number;
  avgTurnsPerCall: number;
  todayLlmCalls: number;
  todayLlmCost: number;
  avgLlmCallsPerCall: number;
  avgCostPerCall: number;
}

export interface AoeLlmModel {
  provider: string;
  modelName: string;
  callCount: number;
  ratio: number;
  cost: number;
  avgTokensPerCall: number;
}

export interface AoeHourly {
  hour: string;
  inboundCalls: number;
  completedCalls: number;
  failedCalls: number;
  inProgressCalls: number;
  llmCalls: number;
  llmCost: number;
  cumulativeLlmCost: number;
}

export interface AoeAgentSummary extends AoeSummary {
  agentId: string;
  agentName: string;
}

export interface AoeDashboardResponse {
  baseDate: string;
  agentId: string | null;
  summary: AoeSummary | null;
  llmModels: AoeLlmModel[] | null;
  hourly: AoeHourly[] | null;
  agentSummary: AoeAgentSummary[] | null;
}

/** 위젯 키 */
export type AoeWidgetType = 'summary' | 'llmModels' | 'hourly' | 'agentSummary';

/** WebSocket 메시지 타입 */
export const AOE_MONI_MSG = {
  CONNECTED: 'CONNECTED',
  SUBSCRIBE: 'SUBSCRIBE',
  SUBSCRIBED: 'SUBSCRIBED',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  UNSUBSCRIBED: 'UNSUBSCRIBED',
  DATA: 'DATA',
  ERROR: 'ERROR',
} as const;

export interface AoeMoniServerMessage {
  type: string;
  wsId?: string;
  widgetId?: string;
  widgetType?: AoeWidgetType;
  data?: unknown;
  message?: string;
}

/** 위젯별 수신 데이터 맵 */
export interface AoeMoniWidgetData {
  summary?: AoeSummary;
  llmModels?: AoeLlmModel[];
  hourly?: AoeHourly[];
  agentSummary?: AoeAgentSummary[];
}
