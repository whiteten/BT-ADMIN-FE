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
