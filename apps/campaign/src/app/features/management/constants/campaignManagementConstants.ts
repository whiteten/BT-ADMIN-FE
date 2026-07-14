export const CAMPAIGN_SERVICE_TYPE_FILTER = {
  ALL: 'ALL',
  ROBOTELLER: '로보텔러',
  AGENT: '상담사',
} as const;
export type CampaignServiceTypeFilter = (typeof CAMPAIGN_SERVICE_TYPE_FILTER)[keyof typeof CAMPAIGN_SERVICE_TYPE_FILTER];

export const CAMPAIGN_IN_USE_FILTER = {
  ALL: 'ALL',
  IN_USE: 'IN_USE',
  NOT_IN_USE: 'NOT_IN_USE',
} as const;
export type CampaignInUseFilter = (typeof CAMPAIGN_IN_USE_FILTER)[keyof typeof CAMPAIGN_IN_USE_FILTER];

export const CAMPAIGN_SERVICE_TYPE_OPTIONS = [
  { label: '상담사', value: '상담사' },
  { label: '로보텔러', value: '로보텔러' },
] as const;

export const CAMPAIGN_SERVICE_TYPE_FILTER_OPTIONS = [
  { label: '전체', value: CAMPAIGN_SERVICE_TYPE_FILTER.ALL },
  { label: '로보텔러', value: CAMPAIGN_SERVICE_TYPE_FILTER.ROBOTELLER },
  { label: '상담사', value: CAMPAIGN_SERVICE_TYPE_FILTER.AGENT },
] as const;

export const CAMPAIGN_IN_USE_OPTIONS = [
  { label: '사용', value: true },
  { label: '미사용', value: false },
] as const;

export const CAMPAIGN_IN_USE_FILTER_OPTIONS = [
  { label: '전체', value: CAMPAIGN_IN_USE_FILTER.ALL },
  { label: '사용', value: CAMPAIGN_IN_USE_FILTER.IN_USE },
  { label: '미사용', value: CAMPAIGN_IN_USE_FILTER.NOT_IN_USE },
] as const;
