/** 캠페인 마스터 — BFF `campaign-master-list` / `campaign-master-detail` */
export interface CampaignMaster {
  tenantId: number;
  campaignId: string;
  campaignName: string;
  campaignType: number | null;
  campaignState: number | null;
  campaignAction: number | null;
  campaignCallingno: string | null;
  campaignStartdate: string | null;
  campaignStarttime: string | null;
  campaignEnddate: string | null;
  campaignEndtime: string | null;
  callbackStartdate: string | null;
  callbackStarttime: string | null;
  callbackEnddate: string | null;
  callbackEndtime: string | null;
  /** 활성화 여부. 1:활성, 0:비활성 (TB_AR_CAMPAIGNMASTER.ENABLE_YN) */
  enableYn: number | null;
  priority: number | null;
  sortSeq: number | null;
  retryCount: number | null;
  retryDelay: number | null;
  workTime: string | null;
  workUser: string | null;
  ageYn: number | null;
  solYn: number | null;
  /** 구분. R:로보텔러, C:상담원 (TB_AR_CAMPAIGNMASTER.EXPANSION1) */
  expansion1: string | null;
  expansion2: string | null;
  expansion3: string | null;
  expansion4: string | null;
  expansion5: string | null;
}

export type CampaignMasterListItem = CampaignMaster;
export type CampaignMasterItem = CampaignMaster;

export type CampaignMasterDetailParams = {
  campaignId: string;
  tenantId?: number;
};

export type CampaignMasterCreateDatas = Pick<
  CampaignMaster,
  'campaignName' | 'campaignStartdate' | 'campaignStarttime' | 'campaignEnddate' | 'campaignEndtime' | 'sortSeq' | 'priority' | 'expansion1' | 'enableYn'
>;

export type CampaignMasterUpdateDatas = CampaignMasterCreateDatas;

/** 카드 UI 표시용 — API 응답을 목록 페이지에서 매핑해 사용 */
export interface CampaignListItem {
  campaignId: string;
  campaignName: string;
  startDateTime: string;
  endDateTime: string;
  inUse: boolean;
  priority: number;
  workDateTime: string;
  serviceType: string;
}

export interface CampaignItem extends CampaignListItem {
  sortOrder: number;
  worker: string;
}
