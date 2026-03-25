export interface CallbotHistorySearchRequest {
  fromDate: string;
  toDate: string;
  serviceIds?: number[];
  intentIds?: string[];
  confidenceMin?: number;
  confidenceMax?: number;
  completeYn?: number;
  ucid?: string;
  ani?: string;
  page?: number;
  size?: number;
  [key: string]: any; // Record<string, unknown> 호환을 위한 인덱스 시그니처
}

export interface PagedCallbotHistory {
  items: CallbotHistoryListItem[];
  page: number;
  size: number;
  total: number;
}

export interface CallbotHistoryListItem {
  ucid: string;
  nextHop: number;
  cdrPkey: number;
  serviceId: number;
  serviceVer: string;
  serviceName: string;
  ani: string;
  dnis: string;
  /** 콜 방향. 1: INBOUND, 2: OUTBOUND */
  callDirection: number | null;
  svcStartTime: string;
  /** 종료일시 */
  svcFinshTime: string | null;
  durationSec: number;
  serviceCompleteYn: number;
  reqAgentYn: number;
  botSlotInCount: number;
  avgConfidence: number | null;
}

export interface BotServiceDto {
  serviceId: number;
  serviceName: string;
}

export interface IntentDto {
  intentId: string;
  intentName: string;
}
