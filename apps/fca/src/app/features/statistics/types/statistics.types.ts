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

export interface ServiceStatList {
  items: ServiceStatListItem[];
  summary: ServiceStatListItem | null;
}

export interface DialogStatItem {
  psrTimeKey: string; // 날짜시간
  tenantId?: number; // 테넌트 ID
  serviceId?: string; // 봇 ID
  serviceName: string; // 봇명
  dialogId: string; // 대화 ID
  dialogName: string; // 대화명
  inCount: number; // 진입수
  successCount: number; // 완결수
  failCount: number; // 미완결수
  successPercent: number; // 완결율
  failPercent: number; // 미완결율
}

export type DialogStatListItem = DialogStatItem;

export interface DialogStatList {
  items: DialogStatListItem[];
  summary: DialogStatListItem | null;
}

export interface SlotStatItem {
  psrTimeKey: string; // 날짜시간
  tenantId?: number; // 테넌트 ID
  serviceId?: string; // 봇 ID
  serviceName: string; // 봇명
  dialogId: string; // 대화 ID
  dialogName: string; // 대화명
  prevDialogId: number; // 이전 대화 ID
  prevDialogName: string; // 이전 대화명
  fnId: string; // IFE SubFlow ID
  fnName: string; // IFE SubFlow명
  slotId: string; // 슬롯 ID
  slotName: string; // 슬롯명
  isCustomSlot: number; // 슬롯타입
  prevSlotId: string; //
  prevSlotName: string; //
  entityTag: string; //
  prevEntityTag: string; //
  inCount: number; // 진입수
  successCount: number; // 완결수
  failCount: number; // 미완결수
  successPercent: number; // 완결율
  failPercent: number; // 미완결율
  retryCount: number; // 재시도 횟수
  oneTimeOrLess: number; //
  oneTimeOrLessPercent: number; //
  twoTimes: number; //
  twoTimesPercent: number; //
  threeTimesOrMore: number; //
  threeTimesOrMorePercent: number; //
}

export type SlotStatListItem = SlotStatItem;

export interface SlotStatList {
  items: SlotStatListItem[];
  summary: SlotStatListItem | null;
}

export interface IntentStatItem {
  psrTimeKey: string; // 날짜시간
  tenantId?: number; // 테넌트 ID
  scnId?: string; // 봇 ID
  scnName: string; // 봇명
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

export interface IntentStatList {
  items: IntentStatListItem[];
  summary: IntentStatListItem | null;
}

export interface EntityStatItem {
  psrTimeKey: string; // 날짜시간
  tenantId?: number; // 테넌트 ID
  scnId?: string; // 봇 ID
  scnName: string; // 봇명
  modelId: string; // 모델 ID
  modelName: string; // 모델명
  entityTag: string; // 개체 태그
  entityValue: string; // 개체 값
  entityCnt: number; // 개체 수
}

export type EntityStatListItem = EntityStatItem;

export interface EntityStatList {
  items: EntityStatListItem[];
  summary: EntityStatListItem | null;
}

export interface KeywordStatItem {
  psrTimeKey: string; // 날짜시간
  tenantId?: number; // 테넌트 ID
  scnId?: string; // 봇 ID
  scnName: string; // 봇명
  modelId: string; // 모델 ID
  modelName: string; // 모델명
  entityTag: string; // 개체 태그
  keyword: string; // 키워드
  keywordCnt: number; // 키워드 수
}

export type KeywordStatListItem = KeywordStatItem;

export interface KeywordStatList {
  items: KeywordStatListItem[];
  summary: KeywordStatListItem | null;
}

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

export interface CategoryOptionItem {
  categoryId: string;
  categoryName: string;
}

export type CategoryOptionListItem = CategoryOptionItem;

export interface UserDefColumnDef {
  key: string;
  headerName: string;
  categoryId?: string;
  categoryName?: string;
  seq?: number;
}

export interface UserDefStatItem {
  psrTimeKey: string;
  serviceId?: string;
  serviceName: string;
  dialogId?: string;
  dialogName: string;
  categoryName?: string;
  values?: Record<string, unknown>;
  [key: string]: unknown;
}

export type UserDefStatListItem = UserDefStatItem;

export interface UserDefStatList {
  items: UserDefStatListItem[];
  summary: UserDefStatListItem | null;
  columnDef: UserDefColumnDef[];
}

/** 캠페인 발신결과 통계 — BFF `stat-campaign-call-result` (V69) */
export interface CallResultStatItem {
  psrTimeKey: string; // 통화일자 (YYYYMMDD / YYYYMM / YYYY)
  tenantId?: string; // 테넌트 ID
  tenantName: string; // 테넌트명
  campaignId?: string; // 캠페인 ID
  campaignName: string; // 캠페인명
  campaignListId?: string; // 캠페인 시나리오 ID
  campaignListName: string; // 시나리오명
  seq: number; // 차수
  totalCnt: number; // 전체대상자
  tryCnt: number; // 통화시도
  tryDoneCnt: number; // 통화완료
  tryFailCnt: number; // 통화실패
  exceptCnt: number; // 제외대상
  tryDoneRate: number; // 성공률 (통화완료/통화시도)
  progressStatus90: number; // 통화종료
  transCnt: number; // 호전환 (93)
  preprocessCnt: number; // 수발신중지 (91)
  tryFailRate: number; // 실패율 (통화실패/통화시도)
  progressStatus31: number; // 통화중
  progressStatus32: number; // 무응답
  progressStatus33: number; // 결번
  progressStatus34: number; // 음성사서함
  progressStatus35: number; // 팩스연결
  progressStatus36: number; // 통화거절
  progressStatus37: number; // 전원꺼짐
  progressStatus38: number; // 로밍
  progressStatusEtc: number; // 기타
}

export type CallResultStatListItem = CallResultStatItem;

export interface CallResultStatList {
  items: CallResultStatListItem[];
  summary: CallResultStatListItem | null;
  /** FCA StatListResponse.columnDef — 그리드/엑셀 메타 (V69 stat-campaign-call-result) */
  columnDef: UserDefColumnDef[];
}

/** 활성 테넌트 옵션 — BFF `stat-tenant-options` (V69) */
export interface TenantOptionItem {
  tenantId: string;
  tenantName: string;
}

export type TenantOptionListItem = TenantOptionItem;

/** 캠페인·시나리오 옵션 — BFF `stat-campaign-options` (V69) */
export interface CampaignOptionItem {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  campaignListId?: string;
  campaignListName?: string;
}

export type CampaignOptionListItem = CampaignOptionItem;
