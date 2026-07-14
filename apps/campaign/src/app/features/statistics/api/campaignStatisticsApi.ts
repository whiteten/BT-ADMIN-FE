import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  CampaignAchievementStatList,
  CampaignAchievementStatListItem,
  CampaignOptionListItem,
  CampaignResultStatList,
  CampaignResultStatListItem,
  TenantOptionListItem,
  UserDefColumnDef,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const campaignStatisticsApi = {
  getCampaignResultStatList: async (params?: Record<string, unknown>): Promise<CampaignResultStatList> => {
    const response = await apiClient.post<{
      data: { items: CampaignResultStatListItem[]; summary: CampaignResultStatListItem | null; columnDef?: UserDefColumnDef[] };
    }>('/stat-campaign-result', params);
    return {
      items: response?.data?.data?.items ?? [],
      summary: response?.data?.data?.summary ?? null,
      columnDef: response?.data?.data?.columnDef ?? [],
    };
  },

  exportCampaignResultStatExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/stat-campaign-result-export', params, { responseType: 'blob' });
  },

  getCampaignAchievementStatList: async (params?: Record<string, unknown>): Promise<CampaignAchievementStatList> => {
    const response = await apiClient.post<{
      data: { items: CampaignAchievementStatListItem[]; summary: CampaignAchievementStatListItem | null; columnDef?: UserDefColumnDef[] };
    }>('/stat-campaign-achievement-result', params);
    return {
      items: response?.data?.data?.items ?? [],
      summary: response?.data?.data?.summary ?? null,
      columnDef: response?.data?.data?.columnDef ?? [],
    };
  },

  exportCampaignAchievementStatExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/stat-campaign-achievement-result-export', params, { responseType: 'blob' });
  },

  getTenantOptionList: async (params?: Record<string, unknown>): Promise<TenantOptionListItem[]> => {
    const response = await apiClient.post<ApiResponse<{ items: TenantOptionListItem[] }>>('/campaign-option-tenant', params ?? {});
    return response.data?.data?.items ?? [];
  },

  getCampaignOptionList: async (params?: Record<string, unknown>): Promise<CampaignOptionListItem[]> => {
    const response = await apiClient.post<ApiResponse<{ items: CampaignOptionListItem[] }>>('/campaign-option-campaign', params ?? {});
    return response.data?.data?.items ?? [];
  },
};
