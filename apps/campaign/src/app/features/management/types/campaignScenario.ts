export interface CampaignScenarioListItem {
  scenarioId: string;
  scenario: string;
  scenarioName: string;
  fileIdentifier: string;
  conditionNumber: number;
  callerNumber: string;
  campaignCode: string;
  transferDn: string;
  callMultiplier: number;
  notificationCriteria: string;
  priority: number;
  inUse: boolean;
  sequence: number;
  sequenceDescription: string;
  campaignStatus: string;
  targetStatus: string;
  workDateTime: string;
}
