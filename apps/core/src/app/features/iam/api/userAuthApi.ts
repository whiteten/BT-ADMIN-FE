/**
 * 사용자 권한 매핑 API
 * BFF Flow: user-auth-map-list, user-auth-map-create, user-auth-map-delete
 */
import ApiClient from '@/shared-util';
import type { UserAuthMap, UserAuthMapCreateRequest, UserAuthMapCreateResponse } from '../types/iam.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

// API 응답 구조 (ApiResponse<List<T>> 또는 ApiResponse<T>)
interface ApiResponse<T> {
  ok: boolean;
  code: string;
  message?: string;
  data: T;
}

export const userAuthApi = {
  /**
   * 사용자 권한 매핑 목록 조회
   * - 특정 사용자의 개별 권한 목록 조회
   * - BFF가 userId를 path variable로 변환
   */
  getList: async (userId: number): Promise<UserAuthMap[]> => {
    const response = await apiClient.get<ApiResponse<UserAuthMap[]>>('/user-auth-map-list', { params: { userId } });
    return response?.data?.data ?? [];
  },

  /**
   * 사용자 권한 매핑 생성
   * - 단일 사용자에 대해 N개 권한 매핑
   * - BFF가 userId를 path variable로 변환
   */
  create: async (userId: number, data: UserAuthMapCreateRequest): Promise<UserAuthMapCreateResponse> => {
    const response = await apiClient.post<ApiResponse<UserAuthMapCreateResponse>>('/user-auth-map-create', data, { params: { userId } });
    return response?.data?.data ?? { totalCreated: 0, authCount: 0 };
  },

  /**
   * 사용자 권한 매핑 삭제
   * - BFF가 userId, mapId를 path variable로 변환
   */
  delete: async (userId: number, mapId: number): Promise<void> => {
    await apiClient.delete('/user-auth-map-delete', { params: { userId, mapId } });
  },
};
