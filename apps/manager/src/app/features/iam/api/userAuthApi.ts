/**
 * 사용자 권한 매핑 API
 * BFF Flow: user-auth-map-list, user-auth-map-create, user-auth-map-delete
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { UserAuthMap, UserAuthMapCreateDatas, UserAuthMapCreateResponse } from '../types/iam.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const userAuthApi = {
  /**
   * 사용자 권한 매핑 목록 조회
   * - 특정 사용자의 개별 권한 목록 조회
   * - BFF가 userId를 path variable로 변환
   */
  getList: async (params?: Record<string, unknown>): Promise<UserAuthMap[]> => {
    const response = await apiClient.get<ListResponse<UserAuthMap>>('/user-auth-map-list', { params });
    return extractList(response);
  },

  /**
   * 사용자 권한 매핑 생성
   * - 단일 사용자에 대해 N개 권한 매핑
   * - BFF가 userId를 path variable로 변환
   */
  create: async ({ params, data }: { params: Record<string, unknown>; data: UserAuthMapCreateDatas }) => {
    const response = await apiClient.post<DetailResponse<UserAuthMapCreateResponse>>('/user-auth-map-create', data, { params });
    return extractDetail(response) ?? { totalCreated: 0, authCount: 0 };
  },

  /**
   * 사용자 권한 매핑 삭제
   * - BFF가 userId, mapId를 path variable로 변환
   */
  delete: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/user-auth-map-delete', { params });
    return response;
  },
};
