import ApiClient, { type ApiResponse } from '@/shared-util';
import type { CampaignMasterDetailParams, CampaignMasterItem, CampaignMasterListItem } from '../types/campaign';
import type { CampaignScenarioListParams, CampaignScenarioMaster } from '../types/campaignScenario';

const apiClient = new ApiClient({ serviceURL: '/bff' });

function extractListValue<T>(rawData: unknown): T[] | null {
  if (Array.isArray(rawData)) return rawData;

  if (rawData != null && typeof rawData === 'object') {
    if ('items' in rawData && Array.isArray((rawData as { items: unknown }).items)) {
      return (rawData as { items: T[] }).items;
    }
    if ('value' in rawData && Array.isArray((rawData as { value: unknown }).value)) {
      return (rawData as { value: T[] }).value;
    }
  }

  return null;
}

function extractCampaignMasterList(rawData: unknown): CampaignMasterListItem[] | null {
  return extractListValue<CampaignMasterListItem>(rawData);
}

function extractCampaignScenarioList(rawData: unknown): CampaignScenarioMaster[] | null {
  return extractListValue<CampaignScenarioMaster>(rawData);
}

export const campaignApi = {
  /** 캠페인 기본정보(마스터) 목록 조회 */
  getCampaignMasterList: async (params?: Record<string, unknown>): Promise<CampaignMasterListItem[]> => {
    const res = await apiClient.get<ApiResponse<CampaignMasterListItem[]>>('/campaign-master-list', { params });
    const rawData = res.data?.data;
    const items = extractCampaignMasterList(rawData);
    return items ?? [];
  },

  /** 캠페인 기본정보(마스터) 상세 조회 */
  getCampaignMasterDetail: async (params: CampaignMasterDetailParams): Promise<CampaignMasterItem | undefined> => {
    const res = await apiClient.get<ApiResponse<CampaignMasterItem>>('/campaign-master-detail', { params });
    return res.data?.data;
  },

  getCampaignScenarioList: async (params: CampaignScenarioListParams): Promise<CampaignScenarioMaster[]> => {
    const res = await apiClient.get<ApiResponse<CampaignScenarioMaster[]>>('/campaign-scenario-list', { params });
    const items = extractCampaignScenarioList(res.data?.data);
    return items ?? [];
  },
};
