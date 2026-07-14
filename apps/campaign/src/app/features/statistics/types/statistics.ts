export interface UserDefColumnDef {
  key: string;
  headerName: string;
  categoryId?: string;
  categoryName?: string;
  seq?: number;
}

/** 캠페인 결과 통계 — 그리드 행 */
export interface CampaignResultStatItem {
  psrTimeKey: string;
  tenantId?: string;
  tenantName: string;
  campaignId?: string;
  campaignName: string;
  viewDate: string;
  campaignListId?: string;
  campaignListName?: string;
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
  thirdAttemptSelfCallSuccessRatePct?: number;
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
  surveyCompleteCnt?: number;
  negativeAnswerCnt?: number;
  successRatePct?: number;
  avgCallDurationSec?: number;
  transferReceiptCnt?: number;
  transferRejectCnt?: number;
  transferMidGuideCnt?: number;
  transferCancelGuideCnt?: number;
  transferAuthFailCnt?: number;
  transferAvgCallDurationSec?: number;
  noticeCompleteCnt?: number;
  noticeIncompleteCnt?: number;
  noticeSuccessRatePct?: number;
  noticeNoSendCnt?: number;
  noticeAvgCallDurationSec?: number;
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

/** 활성 테넌트 옵션 — BFF `stat-tenant-options` */
export interface TenantOptionItem {
  tenantId: string;
  tenantName: string;
}

export type TenantOptionListItem = TenantOptionItem;

/** 캠페인·시나리오 옵션 — BFF `stat-campaign-options` */
export interface CampaignOptionItem {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  campaignListId?: string;
  campaignListName?: string;
}

export type CampaignOptionListItem = CampaignOptionItem;
