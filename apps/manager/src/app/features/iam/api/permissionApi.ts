/**
 * 권한 관리 API
 */
import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { Permission, PermissionCreateRequest, PermissionFlat, PermissionGroup } from '../types/iam.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const permissionApi = {
  /**
   * 앱별 권한 목록 조회
   * 메뉴 트리 구조와 각 메뉴에 매핑된 권한 목록을 앱별로 그룹화하여 조회한다.
   */
  getGroupedPermissions: async (): Promise<PermissionGroup[]> => {
    const response = await apiClient.get<ListResponse<PermissionGroup>>('/permission-list');
    return extractList(response);
  },

  /**
   * 권한 Flat 목록 조회
   * 메뉴 정보를 포함한 Flat 형식의 권한 목록을 조회한다.
   */
  getAuthList: async (): Promise<PermissionFlat[]> => {
    const response = await apiClient.get<ListResponse<PermissionFlat>>('/permission-auth-list');
    return extractList(response);
  },

  /**
   * 권한 생성
   */
  create: async (data: PermissionCreateRequest): Promise<Permission> => {
    const response = await apiClient.post<{ data: Permission }>('/permission-create', data);
    return response?.data?.data;
  },

  /**
   * 권한 삭제
   */
  delete: async (authKey: string): Promise<void> => {
    await apiClient.delete('/permission-delete', { params: { authKey } });
  },
};
