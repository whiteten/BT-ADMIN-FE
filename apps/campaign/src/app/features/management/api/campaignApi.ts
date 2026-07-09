import ApiClient, { type ApiResponse } from '@/shared-util';
import type { CampaignMasterDetailParams, CampaignMasterItem, CampaignMasterListItem } from '../types/campaign';

const apiClient = new ApiClient({ serviceURL: '/bff' });

function extractCampaignMasterList(rawData: unknown): CampaignMasterListItem[] | null {
  if (Array.isArray(rawData)) return rawData;

  if (rawData != null && typeof rawData === 'object') {
    if ('items' in rawData && Array.isArray((rawData as { items: unknown }).items)) {
      return (rawData as { items: CampaignMasterListItem[] }).items;
    }
    if ('value' in rawData && Array.isArray((rawData as { value: unknown }).value)) {
      return (rawData as { value: CampaignMasterListItem[] }).value;
    }
  }

  return null;
}

export const campaignApi = {
  /** 캠페인 기본정보(마스터) 목록 조회 */
  getCampaignMasterList: async (params?: Record<string, unknown>): Promise<CampaignMasterListItem[]> => {
    const res = await apiClient.get<ApiResponse<CampaignMasterListItem[]>>('/campaign-master-list', { params });
    const rawData = res.data?.data;
    const items = extractCampaignMasterList(rawData);
    return items ?? [];
  },

  getCampaignMasterDetail: async (params: CampaignMasterDetailParams): Promise<CampaignMasterItem | undefined> => {
    const res = await apiClient.get<ApiResponse<CampaignMasterItem>>('/campaign-master-detail', { params });
    return res.data?.data;
  },
};
