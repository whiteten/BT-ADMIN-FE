import {
  ACHIEVEMENT_CATEGORY_CAMPAIGNS,
  type AchievementCampaignConfig,
  type AchievementScenarioConfig,
  type CampaignAchievementStatCategory,
} from './campaignAchievementStatConfig';
import type { CampaignOptionListItem } from '../../../features/statistics/types';

const normalize = (value: string) => value.replace(/\s+/g, '').toLowerCase();

export const toCampaignOptionValue = (tenantId: string | number, campaignId: string) => `C:${tenantId}:${campaignId}`;

export const toScenarioOptionValue = (tenantId: string | number, campaignId: string, campaignListId: string | number) => `L:${tenantId}:${campaignId}:${campaignListId}`;

export function parseCampaignIds(selections: string[]): string[] {
  const campaignIds: string[] = [];
  for (const v of selections) {
    if (!v.startsWith('C:')) continue;
    const parts = v.split(':');
    if (parts.length >= 3) campaignIds.push(parts.slice(2).join(':'));
  }
  return campaignIds;
}

export function parseScenarioListIds(selections: string[]): number[] {
  const campaignListIds: number[] = [];
  const seen = new Set<number>();
  for (const v of selections) {
    if (!v.startsWith('L:')) continue;
    const parts = v.split(':');
    if (parts.length < 3) continue;
    const listId = Number(parts[parts.length - 1]);
    if (Number.isNaN(listId) || seen.has(listId)) continue;
    seen.add(listId);
    campaignListIds.push(listId);
  }
  return campaignListIds;
}

export function isAllOptionsSelected(selected: string[], options: { value: string }[]) {
  if (options.length === 0) return false;
  const selectedSet = new Set(selected);
  return options.every((o) => selectedSet.has(o.value));
}

function matchesCampaignConfig(option: CampaignOptionListItem, config: AchievementCampaignConfig): boolean {
  if (config.campaignId && option.campaignId === config.campaignId) return true;
  const apiName = normalize(option.campaignName ?? '');
  const configName = normalize(config.campaignName);
  return apiName.includes(configName) || configName.includes(apiName);
}

function matchesScenarioConfig(option: CampaignOptionListItem, config: AchievementScenarioConfig): boolean {
  if (config.campaignListId && String(option.campaignListId) === config.campaignListId) return true;
  if (!config.matchNames?.length) return false;
  const apiName = normalize(option.campaignListName ?? '');
  return config.matchNames.every((keyword) => apiName.includes(normalize(keyword)));
}

function findScenarioConfig(campaignConfig: AchievementCampaignConfig, option: CampaignOptionListItem): AchievementScenarioConfig | undefined {
  return campaignConfig.scenarios.find((scenario) => matchesScenarioConfig(option, scenario));
}

export function buildAchievementCampaignOptions(category: CampaignAchievementStatCategory, campaignOptionList: CampaignOptionListItem[] | undefined) {
  const campaignConfigs = ACHIEVEMENT_CATEGORY_CAMPAIGNS[category];
  const seen = new Set<string>();
  const options: { label: string; value: string }[] = [];

  for (const config of campaignConfigs) {
    const matched = (campaignOptionList ?? []).filter((option) => matchesCampaignConfig(option, config));
    const representative = matched[0];
    if (!representative) continue;

    const value = toCampaignOptionValue(representative.tenantId, representative.campaignId);
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({
      label: representative.campaignName?.trim() || config.campaignName,
      value,
    });
  }

  return options;
}

export function buildAchievementScenarioOptions(category: CampaignAchievementStatCategory, campaignOptionList: CampaignOptionListItem[] | undefined, campaignSelections: string[]) {
  const selectedCampaigns = new Set(campaignSelections);
  const campaignConfigs = ACHIEVEMENT_CATEGORY_CAMPAIGNS[category];
  const seen = new Set<string>();
  const options: { label: string; value: string }[] = [];

  for (const config of campaignConfigs) {
    for (const option of campaignOptionList ?? []) {
      if (option.campaignListId == null || String(option.campaignListId).length === 0) continue;
      if (!matchesCampaignConfig(option, config)) continue;

      const campaignValue = toCampaignOptionValue(option.tenantId, option.campaignId);
      if (!selectedCampaigns.has(campaignValue)) continue;

      const scenarioConfig = findScenarioConfig(config, option);
      if (!scenarioConfig) continue;

      const value = toScenarioOptionValue(option.tenantId, option.campaignId, option.campaignListId);
      if (seen.has(value)) continue;
      seen.add(value);

      const scenarioName = option.campaignListName?.trim() || String(option.campaignListId);
      options.push({
        label: scenarioName,
        value,
      });
    }
  }

  return options;
}
