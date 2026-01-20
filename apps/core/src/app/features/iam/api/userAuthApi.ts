/**
 * 사용자 권한 매핑 API
 */
import ApiClient from '@/shared-util';
import type { UserAuthMap, UserAuthMapBatchRequest, UserAuthMapBatchResponse } from '../types/iam.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface UserAuthMapListParams {
  userId?: number;
  status?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED';
}

// API 응답 구조 (ApiResponse<List<T>> 또는 ApiResponse<T>)
interface ApiResponse<T> {
  ok: boolean;
  code: string;
  message?: string;
  data: T;
}

export const userAuthApi = {
  /**
   * 사용자 권한 매핑 목록 조회 (관리자용)
   * - 권한 정보, 사용자 정보, 상태 포함
   * - 응답: ApiResponse<List<UserAuthMapListResponse>>
   */
  getList: async (params?: UserAuthMapListParams): Promise<UserAuthMap[]> => {
    const response = await apiClient.get<ApiResponse<UserAuthMap[]>>('/user-auth-map-list', { params });
    return response?.data?.data ?? [];
  },

  /**
   * 사용자 권한 매핑 배치 생성
   * - N명 사용자 x M개 권한 = N*M건 생성
   * - 응답: ApiResponse<UserAuthMapBatchResponse>
   */
  createBatch: async (data: UserAuthMapBatchRequest): Promise<UserAuthMapBatchResponse> => {
    const response = await apiClient.post<ApiResponse<UserAuthMapBatchResponse>>('/user-auth-map-create-batch', data);
    return response?.data?.data ?? { totalCreated: 0, userCount: 0, authCount: 0, mappings: [] };
  },

  /**
   * 사용자 권한 매핑 삭제
   */
  delete: async (mapId: number): Promise<void> => {
    await apiClient.delete('/user-auth-map-delete', { params: { mapId } });
  },
};
