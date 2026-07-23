/**
 * 권한 관리 API
 */
import { uniqBy } from 'lodash';
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { Permission, PermissionCreateRequest, PermissionFlat, PermissionGroup } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const permissionApi = {
  /**
   * 앱별 권한 목록 조회
   * 메뉴 트리 구조와 각 메뉴에 매핑된 권한 목록을 앱별로 그룹화하여 조회한다.
   */
  getGroupedPermissions: async (): Promise<PermissionGroup[]> => {
    const response = await apiClient.get<ApiResponse<{ items: PermissionGroup[] }>>('/permission-list');
    return response.data?.data?.items ?? [];
  },

  /**
   * 권한 Flat 목록 조회
   * 메뉴 정보를 포함한 Flat 형식의 권한 목록을 조회한다.
   */
  getAuthList: async (): Promise<PermissionFlat[]> => {
    const response = await apiClient.get<ApiResponse<{ items: PermissionFlat[] }>>('/permission-auth-list');
    // authKey 는 Transfer rowKey·그리드 getRowId 로 쓰여 유일해야 하는데, BE 가 동일 authKey 를 중복으로 내려주는 사례가 있어 방어적으로 제거한다.
    return uniqBy(response.data?.data?.items ?? [], (item) => item.authKey);
  },

  /**
   * 권한 생성
   */
  create: async (data: PermissionCreateRequest): Promise<Permission> => {
    const response = await apiClient.post<ApiResponse<Permission>>('/permission-create', data);
    return response?.data?.data;
  },

  /**
   * 권한 삭제
   */
  delete: async (authKey: string): Promise<void> => {
    await apiClient.delete('/permission-delete', { params: { authKey } });
  },
};
