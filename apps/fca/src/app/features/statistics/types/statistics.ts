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

/** 캠페인 결과 통계 — 그리드 행 (BFF 연동 전 필드명은 대시보드 campaignStatsOverview 기준) */
export interface CampaignResultStatItem {
  psrTimeKey: string;
  tenantId?: string;
  tenantName: string;
  campaignId?: string;
  campaignName: string;
  viewDate: string;
  campaignScenarioName: string;
  campaignListId?: string;
  campaignListName: string;
  seq: number;
  totalTargetCnt?: number;
  outboundProgressCnt?: number;
  outboundAttemptCnt?: number;
  progressRatePct?: number;
  retryOutboundCnt?: number;
  selfCallCnt?: number;
  selfCallCompleteRatePct?: number;
  failCnt?: number;
  absentCnt?: number;
  firstAttemptSelfCallSuccessRatePct?: number;
  secondAttemptSelfCallSuccessRatePct?: number;
  verifyFailRatePct?: number;
}

export type CampaignResultStatListItem = CampaignResultStatItem;

export interface CampaignResultStatList {
  items: CampaignResultStatListItem[];
  summary: CampaignResultStatListItem | null;
  columnDef: UserDefColumnDef[];
}

/** 캠페인 목적 달성률 통계 — 그리드 행 */
export interface CampaignAchievementStatItem {
  psrTimeKey?: string;
  viewDate?: string;
  tenantId?: string;
  tenantName?: string;
  campaignId?: string;
  campaignName?: string;
  campaignListId?: string;
  seq?: number;
  /** 해피콜 */
  surveyCompleteCnt?: number;
  negativeAnswerCnt?: number;
  successRatePct?: number;
  avgCallDurationSec?: number;
  /** 실물이전 */
  transferReceiptCnt?: number;
  transferRejectCnt?: number;
  transferMidGuideCnt?: number;
  transferCancelGuideCnt?: number;
  transferAuthFailCnt?: number;
  transferAvgCallDurationSec?: number;
  /** 만기안내 */
  noticeCompleteCnt?: number;
  noticeIncompleteCnt?: number;
  noticeSuccessRatePct?: number;
  noticeNoSendCnt?: number;
  noticeAvgCallDurationSec?: number;
  /** 단기연체 */
  overdueCompleteCnt?: number;
  overdueIncompleteCnt?: number;
  overdueSuccessRatePct?: number;
  overdueNoSendCnt?: number;
  overdueAvgCallDurationSec?: number;
}

export type CampaignAchievementStatListItem = CampaignAchievementStatItem;

export interface CampaignAchievementStatList {
  items: CampaignAchievementStatListItem[];
  summary: CampaignAchievementStatListItem | null;
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
