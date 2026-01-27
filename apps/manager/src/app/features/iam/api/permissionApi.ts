/**
 * 권한 관리 API
 */
import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { Permission } from '../types/iam.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface PermissionSearchParams {
  appId?: string;
  keyword?: string;
}

export const permissionApi = {
  /**
   * 권한 목록 조회 (필터 적용 가능)
   */
  getPermissions: async (params?: PermissionSearchParams): Promise<Permission[]> => {
    const response = await apiClient.get<ListResponse<Permission>>('/permission-list', { params });
    return extractList(response);
  },
};
