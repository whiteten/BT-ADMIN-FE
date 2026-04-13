export interface ServiceStatItem {
  psrTimeKey: string; // 날짜시간
  tenantId?: number; // 테넌트 ID
  serviceId?: string; // 서비스 ID
  serviceName: string; // 서비스명
  serviceEnterCount: number; // 진입수
  serviceCompleteCount: number; // 완결수
  serviceFailCount: number; // 미완결수
  serviceCompletePercent: number; // 완결율
  serviceFailPercent: number; // 미완결율
  reqAgentCount: number; // 진입별 상담연결수
  enterReqAgentPercent: number; // 진입별 상담 연결율
  completeReqAgentCount: number; // 완결별 상담연결수
  completeReqAgentPercent: number; // 완결별 상담 연결율
  failReqAgentCount: number; // 미완결별 상담연결수
  failReqAgentPercent: number; // 미완결별 상담 연결율
  botSlotInCount: number; // 질의수
}

export type ServiceStatListItem = ServiceStatItem;

export interface DialogStatItem {
  psrTimeKey: string; // 날짜시간
  tenantId?: number; // 테넌트 ID
  serviceId?: string; // 봇서비스 ID
  serviceName: string; // 봇서비스명
  dialogId: string; // 대화 ID
  dialogName: string; // 대화명
  inCount: number; // 진입수
  successCount: number; // 완결수
  successPercent: number; // 완결율
}

export type DialogStatListItem = DialogStatItem;

export interface SlotStatItem {
  psrTimeKey: string; // 날짜시간
  tenantId?: number; // 테넌트 ID
  serviceId?: string; // 봇서비스 ID
  serviceName: string; // 봇서비스명
  dialogId: string; // 대화 ID
  dialogName: string; // 대화명
  slotId: string; // 슬롯 ID
  slotName: string; // 슬롯명
  isCustomSlot: number; // 슬롯타입
  prevSlotId: string; //
  prevSlotName: string; //
  entityTag: string; //
  prevEntityTag: string; //
  inCount: number; // 진입수
  successCount: number; // 완결수
  successPercent: number; // 완결율
  oneTimeOrLess: number; //
  oneTimeOrLessPercent: number; //
  twoTimes: number; //
  twoTimesPercent: number; //
  threeTimesOrMore: number; //
  threeTimesOrMorePercent: number; //
}

export type SlotStatListItem = SlotStatItem;

export interface IntentStatItem {
  psrTimeKey: string; // 날짜시간
  tenantId?: number; // 테넌트 ID
  scnId?: string; // 봇서비스 ID
  scnName: string; // 봇서비스명
  modelId: string; // 모델 ID
  modelName: string; // 모델명
  intent: string; // 의도
  intentCnt: number; // 의도 수
  confidence: number; // 의도 신뢰도
  thresholdMaxCnt: number; // 임계값 최대 수
  thresholdCheckCnt: number; // 임계값 체크 수
  thresholdFailCnt: number; // 임계값 실패 수
}

export type IntentStatListItem = IntentStatItem;

export interface EntityStatItem {
  psrTimeKey: string; // 날짜시간
  tenantId?: number; // 테넌트 ID
  scnId?: string; // 봇서비스 ID
  scnName: string; // 봇서비스명
  modelId: string; // 모델 ID
  modelName: string; // 모델명
  entityTag: string; // 개체 태그
  entityValue: string; // 개체 값
  entityCnt: number; // 개체 수
}

export type EntityStatListItem = EntityStatItem;

export interface KeywordStatItem {
  psrTimeKey: string; // 날짜시간
  tenantId?: number; // 테넌트 ID
  scnId?: string; // 봇서비스 ID
  scnName: string; // 봇서비스명
  modelId: string; // 모델 ID
  modelName: string; // 모델명
  entityTag: string; // 개체 태그
  keyword: string; // 키워드
  keywordCnt: number; // 키워드 수
}

export type KeywordStatListItem = KeywordStatItem;

export interface DialogOptionItem {
  dialogId: string; // 대화 ID
  dialogName: string; // 대화명
}

export type DialogOptionListItem = DialogOptionItem;

export interface SlotOptionItem {
  slotId: string; // 슬롯 ID
  slotName: string; // 슬롯명
}

export type SlotOptionListItem = SlotOptionItem;

export interface IntentOptionItem {
  intentId: string; // 대화 ID
  intentName: string; // 대화명
}

export type IntentOptionListItem = IntentOptionItem;

export interface EntityOptionItem {
  entityId: string; // 대화 ID
  entityName: string; // 대화명
}

export type EntityOptionListItem = EntityOptionItem;
