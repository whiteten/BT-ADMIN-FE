import type { CampaignItem, CampaignListItem } from '../types/campaign';

export const MOCK_CAMPAIGN_LIST: CampaignListItem[] = [
  {
    campaignId: 'campaign-001',
    campaignName: '아웃바운드 캠페인 A',
    startDateTime: '2026-03-01T09:00:00',
    endDateTime: '2026-03-31T18:00:00',
    inUse: true,
    priority: 1,
    workDateTime: '2026-03-01T09:30:00',
    serviceType: '로보텔러',
  },
  {
    campaignId: 'campaign-002',
    campaignName: '리마인드 캠페인 B',
    startDateTime: '2026-02-01T10:00:00',
    endDateTime: '2026-02-28T17:00:00',
    inUse: true,
    priority: 2,
    workDateTime: '2026-02-20T14:15:00',
    serviceType: '상담사',
  },
  {
    campaignId: 'campaign-003',
    campaignName: '신규 가입 유도 캠페인',
    startDateTime: '2026-01-05T08:00:00',
    endDateTime: '2026-01-31T20:00:00',
    inUse: false,
    priority: 3,
    workDateTime: '2026-01-10T11:00:00',
    serviceType: '로보텔러',
  },
];

export const MOCK_CAMPAIGN_DETAILS: Record<string, CampaignItem> = {
  'campaign-001': {
    ...MOCK_CAMPAIGN_LIST[0],
    sortOrder: 1,
    serviceType: '로보텔러',
    worker: '홍길동',
  },
  'campaign-002': {
    ...MOCK_CAMPAIGN_LIST[1],
    sortOrder: 2,
    serviceType: '상담사',
    worker: '김영희',
  },
  'campaign-003': {
    ...MOCK_CAMPAIGN_LIST[2],
    sortOrder: 3,
    serviceType: '로보텔러',
    worker: '이철수',
  },
};

export const getMockCampaignDetail = (campaignId: string): CampaignItem | undefined => MOCK_CAMPAIGN_DETAILS[campaignId];
