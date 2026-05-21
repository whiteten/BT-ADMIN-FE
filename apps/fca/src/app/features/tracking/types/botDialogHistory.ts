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
  hasIntent?: boolean;
  /** 재학습 상태 필터. APPLIED=수정-반영, NOT_APPLIED=수정-미반영, UNMODIFIED=미수정 */
  retrainFilter?: string;
  /** 작업자 필터. ME=내가 수정 */
  workerFilter?: string;
  slotEntityTag?: string;
  /** 슬롯 인식 실패 최소 건수 (BOT_SLOT_FAIL_COUNT >= N). */
  slotFailCountMin?: number;
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
  /** 슬롯 인식 실패 수 (STT 결과를 BOT이 인지하지 못한 건수) */
  botSlotFailCount: number | null;
  avgConfidence: number | null;
  /** 재학습 수정 여부 */
  retrainYn: boolean | null;
  /** 현재 사용자가 직접 수정했는지 여부 */
  retrainByMe: boolean | null;
  /** 녹취 여부. 0: 미녹취, 1: 녹취 */
  recordYn: number | null;
  /** 녹취 파일명 */
  recordName: string | null;
}

/** 슬롯 Sankey 차트 집계 항목 */
export interface SlotSankeyItem {
  seq: number;
  prevEntityTag: string | null;
  entityTag: string;
  value: number;
}

export interface BotServiceDto {
  serviceId: number;
  serviceName: string;
}

export interface IntentDto {
  intentId: string;
  intentName: string;
}
