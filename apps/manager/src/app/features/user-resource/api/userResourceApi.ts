/**
 * 사용자 리소스 접근 매핑 API
 * BFF Flow: user-resource-map-list, user-resource-map-sync, bot-list, model-list
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { BotService, NluModel, UserResourceMap, UserResourceSyncRequest, UserResourceSyncResponse } from '../types/userResource.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const userResourceApi = {
  /**
   * 사용자 리소스 매핑 목록 조회
   */
  getList: async (userId: number): Promise<UserResourceMap[]> => {
    const response = await apiClient.get<ListResponse<UserResourceMap>>('/user-resource-map-list', {
      params: { userId },
    });
    return extractList(response);
  },

  /**
   * 사용자 리소스 매핑 동기화 (최종 형상 전송)
   */
  sync: async ({ userId, data }: { userId: number; data: UserResourceSyncRequest }): Promise<UserResourceSyncResponse> => {
    const response = await apiClient.put<DetailResponse<UserResourceSyncResponse>>('/user-resource-map-sync', data, {
      params: { userId },
    });
    return extractDetail(response) ?? { botCount: 0, modelCount: 0 };
  },

  /**
   * 봇 서비스 목록 조회
   */
  getBots: async (): Promise<BotService[]> => {
    try {
      const response = await apiClient.get<ListResponse<BotService>>('/bot-list', { silent: true });
      return extractList(response);
    } catch {
      return [];
    }
  },

  /**
   * NLU 모델 목록 조회
   */
  getModels: async (): Promise<NluModel[]> => {
    try {
      const response = await apiClient.get<ListResponse<NluModel>>('/model-list', { silent: true });
      return extractList(response);
    } catch {
      return [];
    }
  },
};
