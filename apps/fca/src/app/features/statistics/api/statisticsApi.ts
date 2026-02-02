import ApiClient, { type StatListResponse, extractStatList } from '@/shared-util';
import type { DialogStatListItem, EntityStatListItem, IntentStatListItem, KeywordStatListItem, ServiceStatListItem, SlotStatListItem } from '../types/statistics.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 통계 API
 */
export const statisticsApi = {
  // 서비스 통계 목록 조회
  getServiceStatList: async (params?: Record<string, unknown>): Promise<ServiceStatListItem[]> => {
    const response = await apiClient.get<StatListResponse<ServiceStatListItem>>('/stat-bot-service', { params });
    return extractStatList(response);
  },

  // 대화 통계 목록 조회
  getDialogStatList: async (params?: Record<string, unknown>): Promise<DialogStatListItem[]> => {
    const response = await apiClient.get<StatListResponse<DialogStatListItem>>('/stat-bot-dialog', { params });
    return extractStatList(response);
  },

  // 슬롯 통계 목록 조회
  getSlotStatList: async (params?: Record<string, unknown>): Promise<SlotStatListItem[]> => {
    const response = await apiClient.get<StatListResponse<SlotStatListItem>>('/stat-bot-slot', { params });
    return extractStatList(response);
  },

  // 의도 통계 목록 조회
  getIntentStatList: async (params?: Record<string, unknown>): Promise<IntentStatListItem[]> => {
    const response = await apiClient.get<StatListResponse<IntentStatListItem>>('/stat-nlu-intent', { params });
    return extractStatList(response);
  },

  // 개체 통계 목록 조회
  getEntityStatList: async (params?: Record<string, unknown>): Promise<EntityStatListItem[]> => {
    const response = await apiClient.get<StatListResponse<EntityStatListItem>>('/stat-nlu-entity', { params });
    return extractStatList(response);
  },

  // 키워드 통계 목록 조회
  getKeywordStatList: async (params?: Record<string, unknown>): Promise<KeywordStatListItem[]> => {
    const response = await apiClient.get<StatListResponse<KeywordStatListItem>>('/stat-nlu-keyword', { params });
    return extractStatList(response);
  },
};
