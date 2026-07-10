export type CampaignScenarioListParams = {
  campaignId: string;
};

/** BFF `campaign-scenario-list` 응답 row */
export interface CampaignScenarioMaster {
  tenantId: number;
  campaignId: string;
  campaignListId: number;
  campaignListName: string;
  enableYn: string | null;
  extractionSdate: string | null;
  extractionEdate: string | null;
  recvFilePrefix: string | null;
  recvFilePath: string | null;
  expansion1: string | null;
  expansion2: string | null;
  expansion3: string | null;
  expansion4: string | null;
  expansion5: string | null;
  expansion6: string | null;
  expansion7: string | null;
  expansion8: string | null;
  expansion9: string | null;
  ascDesc1: string | null;
  ascDesc2: string | null;
  ascDesc3: string | null;
  sortColumn1: string | null;
  sortColumn2: string | null;
  sortColumn3: string | null;
  dtmfDomaincd: string | null;
  voiceDomaincd: string | null;
  webchatDomaincd: string | null;
  messageIdChat: string | null;
  messageIdLms: string | null;
  workTime: string | null;
  workUser: string | null;
}

export interface CampaignScenarioListItem {
  scenarioId: string;
  scenario: string;
  scenarioName: string;
  campaignId: string;
  campaignName: string;
  fileIdentifier: string;
  conditionNumber: number;
  callerNumber: string;
  campaignCode: string;
  transferDn: string;
  callMultiplier: number;
  notificationCriteria: number;
  priority: number;
  inUse: boolean;
  sequence: number;
  sequenceDescription: string;
  campaignStatus: string;
  targetStatus: string;
  fileLocation: string;
  worker: string;
  workDateTime: string;
}
