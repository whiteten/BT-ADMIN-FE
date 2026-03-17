export interface DialogHistorySearchRequest {
  fromDate: string;
  toDate: string;
  serviceId?: number;
  completeYn?: number;
  ucid?: string;
  page?: number;
  size?: number;
  [key: string]: any; // Record<string, unknown> 호환을 위한 인덱스 시그니처
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

export interface ChatBubbleItemDto {
  mentId?: string;
  text: string;
  result?: string;
  subFlowName?: string;
  itemName?: string;
}

export interface ChatBubbleDto {
  seq: number;
  speakerType: 'IVR' | 'CUSTOMER' | 'MULTIMODAL_IVR' | 'MULTIMODAL_CUSTOMER' | 'UNKNOWN';
  startDelta: number;
  totalDuration: number;
  items: ChatBubbleItemDto[];
}
