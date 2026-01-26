import { createQueryKeys } from '@lukemorales/query-key-factory';
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { Role } from './types/iam.types';

const bffClient = new ApiClient({ serviceURL: '/bff' });

export const sharedApi = {
  role: {
    queryKeys: createQueryKeys('sharedApi-roles', {
      getRoles: (params?: Record<string, unknown>) => [params],
      getRole: (params?: Record<string, unknown>) => [params],
    }),
    /**
     * 역할 목록 조회
     */
    getRoles: async (params?: Record<string, unknown>): Promise<Role[]> => {
      const response = await bffClient.get<ListResponse<Role>>('/role-list', { params });
      return extractList(response);
    },
    /**
     * 역할 단건 조회
     */
    getRole: async (params?: Record<string, unknown>): Promise<Role> => {
      const response = await bffClient.get<DetailResponse<Role>>('/role-detail', { params });
      return extractDetail(response);
    },
  },
};
