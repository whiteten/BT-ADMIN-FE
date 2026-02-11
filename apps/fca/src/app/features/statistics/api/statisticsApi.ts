import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type {
  DialogOptionListItem,
  DialogStatListItem,
  EntityStatListItem,
  IntentStatListItem,
  KeywordStatListItem,
  ServiceStatListItem,
  SlotOptionListItem,
  SlotStatListItem,
} from '../types/statistics.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 통계 API
 */
export const statisticsApi = {
  // 서비스 통계 목록 조회
  getServiceStatList: async (params?: Record<string, unknown>): Promise<ServiceStatListItem[]> => {
    const response = await apiClient.post<ListResponse<ServiceStatListItem>>('/stat-bot-service', params);
    return extractList(response);
  },

  // 대화 통계 목록 조회
  getDialogStatList: async (params?: Record<string, unknown>): Promise<DialogStatListItem[]> => {
    const response = await apiClient.post<ListResponse<DialogStatListItem>>('/stat-bot-dialog', params);
    return extractList(response);
  },

  // 슬롯 통계 목록 조회
  getSlotStatList: async (params?: Record<string, unknown>): Promise<SlotStatListItem[]> => {
    const response = await apiClient.post<ListResponse<SlotStatListItem>>('/stat-bot-slot', params);
    return extractList(response);
  },

  // 의도 통계 목록 조회
  getIntentStatList: async (params?: Record<string, unknown>): Promise<IntentStatListItem[]> => {
    const response = await apiClient.post<ListResponse<IntentStatListItem>>('/stat-nlu-intent', params);
    return extractList(response);
  },

  // 개체 통계 목록 조회
  getEntityStatList: async (params?: Record<string, unknown>): Promise<EntityStatListItem[]> => {
    const response = await apiClient.post<ListResponse<EntityStatListItem>>('/stat-nlu-entity', params);
    return extractList(response);
  },

  // 키워드 통계 목록 조회
  getKeywordStatList: async (params?: Record<string, unknown>): Promise<KeywordStatListItem[]> => {
    const response = await apiClient.post<ListResponse<KeywordStatListItem>>('/stat-nlu-keyword', params);
    return extractList(response);
  },

  // 대화 옵션 목록 조회
  getDialogOptionList: async (params?: Record<string, unknown>): Promise<DialogOptionListItem[]> => {
    const response = await apiClient.get<ListResponse<DialogOptionListItem>>('/stat-dialog-options', { params });
    return extractList(response);
  },

  // 슬롯 옵션 목록 조회
  getSlotOptionList: async (params?: Record<string, unknown>): Promise<SlotOptionListItem[]> => {
    const response = await apiClient.get<ListResponse<SlotOptionListItem>>('/stat-slot-options', { params });
    return extractList(response);
  },
};
