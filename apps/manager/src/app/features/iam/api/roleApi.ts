/**
 * 역할 관리 API
 */
import ApiClient from '@/shared-util';
import type { RoleCreateDatas, RoleUpdateDatas } from '../types/iam.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const roleApi = {
  /**
   * 역할 생성
   */
  createRole: async (data: RoleCreateDatas) => {
    const response = await apiClient.post('/role-create', data);
    return response;
  },

  /**
   * 역할 수정
   */
  updateRole: async ({ params, data }: { params: Record<string, unknown>; data: RoleUpdateDatas }) => {
    const response = await apiClient.put('/role-update', data, { params });
    return response;
  },

  /**
   * 역할 삭제
   */
  deleteRole: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/role-delete', { params });
    return response;
  },
};
