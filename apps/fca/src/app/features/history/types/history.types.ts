export interface DialogHistorySearchRequest {
  fromDate: string;
  toDate: string;
  serviceIds?: number[];
  completeYn?: number;
  ucid?: string;
  page?: number;
  size?: number;
  [key: string]: any; // Record<string, unknown> 호환을 위한 인덱스 시그니처
}

export interface PagedDialogHistory {
  items: DialogHistoryListItem[];
  page: number;
  size: number;
  total: number;
}

export interface DialogHistoryListItem {
  ucid: string;
  nextHop: number;
  cdrPkey: number;
  svcStartTime: string;
  serviceName: string;
  ani: string;
  serviceCompleteYn: number;
  reqAgentYn: number;
  dialogCount: number;
  durationSec: number;
}

export interface BotServiceDto {
  serviceId: number;
  serviceName: string;
}
