/**
 * 권한 관리 API
 */
import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { MenuWithPermissions } from '../types/iam.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const permissionApi = {
  /**
   * 메뉴별 권한 목록 조회
   * 메뉴 트리 구조와 각 메뉴에 매핑된 권한 목록을 조회한다.
   */
  getMenusWithPermissions: async (): Promise<MenuWithPermissions[]> => {
    const response = await apiClient.get<ListResponse<MenuWithPermissions>>('/permission-list');
    return extractList(response);
  },
};
