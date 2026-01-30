/**
 * 사용자 권한 매핑 API
 * BFF Flow: user-auth-map-list, user-permission-sync
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { UserAuthMap, UserPermissionSyncRequest, UserPermissionSyncResponse } from '../types/iam.types';

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
   * 사용자 권한 동기화
   * - 선택된 권한 ID 목록을 전달하면 백엔드가 역할과 비교하여 ALLOW/DENY 결정
   * - 역할 권한 매핑과 동일한 방식으로 동작
   */
  sync: async ({ userId, data }: { userId: number; data: UserPermissionSyncRequest }): Promise<UserPermissionSyncResponse> => {
    const response = await apiClient.put<DetailResponse<UserPermissionSyncResponse>>('/user-permission-sync', data, { params: { userId } });
    return extractDetail(response) ?? { allowCount: 0, denyCount: 0, effectiveAuthIds: [] };
  },
};
