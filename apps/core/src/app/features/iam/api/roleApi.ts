/**
 * 역할 관리 API
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { Role, RoleCreateRequest, RoleUpdateRequest } from '../types/iam.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const roleApi = {
  /**
   * 역할 목록 조회
   */
  getRoles: async (params?: Record<string, unknown>): Promise<Role[]> => {
    const response = await apiClient.get<ListResponse<Role>>('/role-list', { params });
    return extractList(response);
  },

  /**
   * 역할 생성
   */
  createRole: async (data: RoleCreateRequest) => {
    const response = await apiClient.post('/role-create', data);
    return response?.data;
  },

  /**
   * 역할 수정
   * @param roleId - 역할 ID (BFF path variable로 전달)
   * @param request - 수정 요청 데이터
   */
  updateRole: async (roleId: number, request: RoleUpdateRequest): Promise<Role> => {
    const response = await apiClient.put<DetailResponse<Role>>('/role-update', request, {
      params: { roleId },
    });
    return extractDetail(response);
  },

  /**
   * 역할 삭제
   */
  deleteRole: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/role-delete', { params });
    return response?.data;
  },
};
