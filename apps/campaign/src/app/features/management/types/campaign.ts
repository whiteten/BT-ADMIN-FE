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
