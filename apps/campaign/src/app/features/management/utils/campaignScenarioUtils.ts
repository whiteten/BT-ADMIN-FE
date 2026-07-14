import { isYnEnabled } from './campaignMasterUtils';
import { TRANSFER_DN_NONE } from '../constants/campaignScenarioConstants';
import type { CampaignScenarioListItem, CampaignScenarioMaster } from '../types/campaignScenario';

function toNumberOrZero(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function toCampaignScenarioListItem(master: CampaignScenarioMaster, campaignName = ''): CampaignScenarioListItem {
  const scenarioId = String(master.campaignListId);

  return {
    scenarioId,
    scenario: scenarioId,
    scenarioName: master.campaignListName ?? '',
    campaignId: master.campaignId,
    campaignName,
    fileIdentifier: master.recvFilePrefix ?? '',
    conditionNumber: toNumberOrZero(master.expansion9),
    callerNumber: '',
    campaignCode: master.campaignId,
    transferDn: TRANSFER_DN_NONE,
    callMultiplier: 1,
    notificationCriteria: 0,
    priority: 0,
    inUse: isYnEnabled(master.enableYn),
    sequence: 0,
    sequenceDescription: master.ascDesc1 ?? '',
    campaignStatus: '',
    targetStatus: '',
    fileLocation: master.recvFilePath ?? '',
    worker: master.workUser ?? '',
    workDateTime: master.workTime ?? '',
  };
}
