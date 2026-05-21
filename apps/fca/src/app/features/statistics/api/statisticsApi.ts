import ApiClient, { type ListResponse, type StatListResponse, extractList, extractStatList } from '@/shared-util';
import type {
  CampaignAchievementStatList,
  CampaignAchievementStatListItem,
  CampaignOptionListItem,
  CampaignResultStatList,
  CampaignResultStatListItem,
  CategoryOptionListItem,
  DialogOptionListItem,
  DialogStatList,
  DialogStatListItem,
  EntityOptionListItem,
  EntityStatList,
  EntityStatListItem,
  IntentOptionListItem,
  IntentStatList,
  IntentStatListItem,
  KeywordStatList,
  KeywordStatListItem,
  ServiceStatList,
  ServiceStatListItem,
  SlotOptionListItem,
  SlotStatList,
  SlotStatListItem,
  TenantOptionListItem,
  UserDefColumnDef,
  UserDefStatList,
  UserDefStatListItem,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 통계 API
 */
export const statisticsApi = {
  // 서비스 통계 목록 조회
  getServiceStatList: async (params?: Record<string, unknown>): Promise<ServiceStatList> => {
    const response = await apiClient.post<StatListResponse<ServiceStatListItem>>('/stat-bot-service', params);
    return extractStatList(response);
  },

  // 대화 통계 목록 조회
  getDialogStatList: async (params?: Record<string, unknown>): Promise<DialogStatList> => {
    const response = await apiClient.post<StatListResponse<DialogStatListItem>>('/stat-bot-dialog', params);
    return extractStatList(response);
  },

  // 슬롯 통계 목록 조회
  getSlotStatList: async (params?: Record<string, unknown>): Promise<SlotStatList> => {
    const response = await apiClient.post<StatListResponse<SlotStatListItem>>('/stat-bot-slot', params);
    return extractStatList(response);
  },

  // 의도 통계 목록 조회
  getIntentStatList: async (params?: Record<string, unknown>): Promise<IntentStatList> => {
    const response = await apiClient.post<StatListResponse<IntentStatListItem>>('/stat-nlu-intent', params);
    return extractStatList(response);
  },

  // 개체 통계 목록 조회
  getEntityStatList: async (params?: Record<string, unknown>): Promise<EntityStatList> => {
    const response = await apiClient.post<StatListResponse<EntityStatListItem>>('/stat-nlu-entity', params);
    return extractStatList(response);
  },

  // 키워드 통계 목록 조회
  getKeywordStatList: async (params?: Record<string, unknown>): Promise<KeywordStatList> => {
    const response = await apiClient.post<StatListResponse<KeywordStatListItem>>('/stat-nlu-keyword', params);
    return extractStatList(response);
  },

  // 사용자 정의 통계 목록 조회
  getUserDefStatList: async (params?: Record<string, unknown>): Promise<UserDefStatList> => {
    const response = await apiClient.post<{ data: { items: UserDefStatListItem[]; summary: UserDefStatListItem | null; columnDef: UserDefColumnDef[] } }>(
      '/stat-bot-user-def',
      params,
    );
    return {
      items: response?.data?.data?.items ?? [],
      summary: response?.data?.data?.summary ?? null,
      columnDef: response?.data?.data?.columnDef ?? [],
    };
  },

  // 대화 옵션 목록 조회
  getDialogOptionList: async (params?: Record<string, unknown>): Promise<DialogOptionListItem[]> => {
    const response = await apiClient.post<ListResponse<DialogOptionListItem>>('/stat-dialog-options', params);
    return extractList(response);
  },

  // 슬롯 옵션 목록 조회
  getSlotOptionList: async (params?: Record<string, unknown>): Promise<SlotOptionListItem[]> => {
    const response = await apiClient.post<ListResponse<SlotOptionListItem>>('/stat-slot-options', params);
    return extractList(response);
  },

  // 의도 옵션 목록 조회
  getIntentOptionList: async (params?: Record<string, unknown>): Promise<IntentOptionListItem[]> => {
    const response = await apiClient.post<ListResponse<IntentOptionListItem>>('/stat-intent-options', params);
    return extractList(response);
  },

  // 개체 옵션 목록 조회
  getEntityOptionList: async (params?: Record<string, unknown>): Promise<EntityOptionListItem[]> => {
    const response = await apiClient.post<ListResponse<EntityOptionListItem>>('/stat-entity-options', params);
    return extractList(response);
  },

  // 카테고리 옵션 목록 조회
  getCategoryOptionList: async (params?: Record<string, unknown>): Promise<CategoryOptionListItem[]> => {
    const response = await apiClient.post<ListResponse<CategoryOptionListItem>>('/stat-category-options', params);
    return extractList(response);
  },

  // 서비스 통계 엑셀 내보내기
  exportServiceStatExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/stat-bot-service-export', params, { responseType: 'blob' });
  },

  // 대화 통계 엑셀 내보내기
  exportDialogStatExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/stat-bot-dialog-export', params, { responseType: 'blob' });
  },

  // 슬롯 통계 엑셀 내보내기
  exportSlotStatExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/stat-bot-slot-export', params, { responseType: 'blob' });
  },

  // 의도 통계 엑셀 내보내기
  exportIntentStatExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/stat-nlu-intent-export', params, { responseType: 'blob' });
  },

  // 개체 통계 엑셀 내보내기
  exportEntityStatExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/stat-nlu-entity-export', params, { responseType: 'blob' });
  },

  // 키워드 통계 엑셀 내보내기
  exportKeywordStatExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/stat-nlu-keyword-export', params, { responseType: 'blob' });
  },

  // 사용자 정의 통계 엑셀 내보내기
  exportUserDefStatExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/stat-bot-user-def-export', params, { responseType: 'blob' });
  },

  // 캠페인 통계(캠페인 결과) 목록 조회 (BFF: stat-campaign-result)
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

  // 캠페인 통계(캠페인 결과) 엑셀보내기 (BFF: stat-campaign-result-export)
  exportCampaignResultStatExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/stat-campaign-result-export', params, { responseType: 'blob' });
  },

  // 캠페인 목적 달성률 통계 목록 조회 (BFF: stat-campaign-achievement-result)
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

  // 캠페인 목적 달성률 통계 엑셀보내기 (BFF: stat-campaign-achievement-result-export)
  exportCampaignAchievementStatExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/stat-campaign-achievement-result-export', params, { responseType: 'blob' });
  },

  // 테넌트 옵션 목록 조회 (BFF: stat-tenant-options)
  getTenantOptionList: async (params?: Record<string, unknown>): Promise<TenantOptionListItem[]> => {
    const response = await apiClient.post<ListResponse<TenantOptionListItem>>('/stat-tenant-options', params ?? {});
    return extractList(response);
  },

  // 캠페인 옵션 목록 조회 (BFF: stat-campaign-options)
  getCampaignOptionList: async (params?: Record<string, unknown>): Promise<CampaignOptionListItem[]> => {
    const response = await apiClient.post<ListResponse<CampaignOptionListItem>>('/stat-campaign-options', params ?? {});
    return extractList(response);
  },

  // IFE 리다이렉트
  getIfeRedirectUrl: async (params: { serviceId: number; subFlowId: string; nodeName: string }): Promise<string | null> => {
    const response = await apiClient.get<{ data: { redirectUrl: string } }>('/stat-bot-slot-ife-redirect', { params });
    return response.data?.data?.redirectUrl ?? '';
  },
};
