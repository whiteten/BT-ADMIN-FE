import type { CampaignItem, CampaignMasterListItem } from '../types/campaign';
import { YN, createEmptyCampaignMaster, toCampaignItem } from '../utils/campaignMasterUtils';

export const MOCK_CAMPAIGN_LIST: CampaignMasterListItem[] = [
  createEmptyCampaignMaster({
    tenantId: 2000000001,
    campaignId: 'campaign-001',
    campaignName: '아웃바운드 캠페인 A',
    campaignStartdate: '2026-03-01',
    campaignStarttime: '09:00:00',
    campaignEnddate: '2026-03-31',
    campaignEndtime: '18:00:00',
    enableYn: YN.YES,
    priority: 1,
    workTime: '2026-03-01 09:30:00',
    workUser: '홍길동',
    campaignType: '로보텔러',
    sortSeq: 1,
  }),
  createEmptyCampaignMaster({
    tenantId: 2000000001,
    campaignId: 'campaign-002',
    campaignName: '리마인드 캠페인 B',
    campaignStartdate: '2026-02-01',
    campaignStarttime: '10:00:00',
    campaignEnddate: '2026-02-28',
    campaignEndtime: '17:00:00',
    enableYn: YN.YES,
    priority: 2,
    workTime: '2026-02-20 14:15:00',
    workUser: '김영희',
    campaignType: '상담사',
    sortSeq: 2,
  }),
  createEmptyCampaignMaster({
    tenantId: 2000000001,
    campaignId: 'campaign-003',
    campaignName: '신규 가입 유도 캠페인',
    campaignStartdate: '2026-01-05',
    campaignStarttime: '08:00:00',
    campaignEnddate: '2026-01-31',
    campaignEndtime: '20:00:00',
    enableYn: YN.NO,
    priority: 3,
    workTime: '2026-01-10 11:00:00',
    workUser: '이철수',
    campaignType: '로보텔러',
    sortSeq: 3,
  }),
];

export const MOCK_CAMPAIGN_DETAILS: Record<string, CampaignItem> = {
  'campaign-001': toCampaignItem(MOCK_CAMPAIGN_LIST[0]),
  'campaign-002': toCampaignItem(MOCK_CAMPAIGN_LIST[1]),
  'campaign-003': toCampaignItem(MOCK_CAMPAIGN_LIST[2]),
};

export const getMockCampaignDetail = (campaignId: string): CampaignItem | undefined => MOCK_CAMPAIGN_DETAILS[campaignId];
