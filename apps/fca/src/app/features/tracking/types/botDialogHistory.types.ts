export interface BotDialogHistorySearchRequest {
  fromDate: string;
  toDate: string;
  serviceIds?: number[];
  intentNames?: string[];
  confidenceMin?: number;
  confidenceMax?: number;
  completeYn?: number;
  ucid?: string;
  ani?: string;
  page?: number;
  size?: number;
  [key: string]: any; // Record<string, unknown> 호환을 위한 인덱스 시그니처
}

export interface PagedBotDialogHistory {
  items: BotDialogHistoryListItem[];
  page: number;
  size: number;
  total: number;
}

export interface BotDialogHistoryListItem {
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
  /** 녹취 여부. 0: 미녹취, 1: 녹취 */
  recordYn: number | null;
  /** 녹취 파일명 */
  recordName: string | null;
}

export interface BotServiceDto {
  serviceId: number;
  serviceName: string;
}

export interface IntentDto {
  intentId: string;
  intentName: string;
}
