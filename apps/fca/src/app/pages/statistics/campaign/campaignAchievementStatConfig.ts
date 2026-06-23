import achievementStatMapping from './config/campaignAchievementStat.json';

/** 구분별 시나리오 필터 — 표시명은 API campaignListName 사용 */
export interface AchievementScenarioConfig {
  campaignListId?: string;
  matchNames?: string[];
}

/** 구분별 캠페인 필터 — 표시명은 API campaignName 사용 */
export interface AchievementCampaignConfig {
  campaignId?: string;
  campaignName: string;
  scenarios: AchievementScenarioConfig[];
}

interface AchievementCategoryMapping {
  label: string;
  campaigns: AchievementCampaignConfig[];
}

type AchievementStatMappingFile = Record<string, AchievementCategoryMapping>;

const mapping = achievementStatMapping as AchievementStatMappingFile;

export type CampaignAchievementStatCategory = keyof typeof mapping & string;

export const CAMPAIGN_ACHIEVEMENT_STAT_CATEGORY_CODES = Object.keys(mapping) as CampaignAchievementStatCategory[];

export const CAMPAIGN_ACHIEVEMENT_STAT_CATEGORY_LABELS = Object.fromEntries(Object.entries(mapping).map(([code, entry]) => [code, entry.label])) as Record<
  CampaignAchievementStatCategory,
  string
>;

export const CAMPAIGN_ACHIEVEMENT_STAT_CATEGORY_OPTIONS = CAMPAIGN_ACHIEVEMENT_STAT_CATEGORY_CODES.map((code) => ({
  label: CAMPAIGN_ACHIEVEMENT_STAT_CATEGORY_LABELS[code],
  value: code,
}));

export const ACHIEVEMENT_CATEGORY_CAMPAIGNS = Object.fromEntries(Object.entries(mapping).map(([code, entry]) => [code, entry.campaigns])) as Record<
  CampaignAchievementStatCategory,
  AchievementCampaignConfig[]
>;
