import { createQueryKeys } from '@lukemorales/query-key-factory';
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { BookmarkCreateDatas, BookmarkUpdateDatas } from './types/bookmark.type';
import type { Role } from './types/iam.types';
import type { NavigationData } from './types/navi.types';

const bffClient = new ApiClient({ serviceURL: '/bff' });

export const sharedApi = {
  role: {
    queryKeys: createQueryKeys('sharedApi:role', {
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
  common: {
    queryKeys: createQueryKeys('sharedApi:common', {
      getSession: (params?: Record<string, unknown>) => [params],
      getNavigation: (params?: Record<string, unknown>) => [params],
    }),
    /**
     * 세션 조회 - health check
     */
    getSession: async (params?: Record<string, unknown>): Promise<unknown> => {
      const response = await bffClient.get<DetailResponse<unknown>>('/session-status', { params });
      return extractDetail(response);
    },
    /**
     * 네비게이션 데이터 조회
     */
    getNavigation: async (params?: Record<string, unknown>): Promise<NavigationData> => {
      const response = await bffClient.get<DetailResponse<NavigationData>>('/navigation', { params });
      return extractDetail(response);
    },
  },
  bookmark: {
    createBookmark: async ({ params, data }: { params: Record<string, unknown>; data: BookmarkCreateDatas }) => {
      const response = await bffClient.post<DetailResponse<void>>('/favorites-create', data, { params });
      return response;
    },
    updateBookmark: async ({ params, data }: { params: Record<string, unknown>; data: BookmarkUpdateDatas }) => {
      const response = await bffClient.put<DetailResponse<void>>('/favorites-update', data, { params });
      return response;
    },
    deleteBookmark: async (params: Record<string, unknown>) => {
      const response = await bffClient.delete<DetailResponse<void>>('/favorites-delete', { params });
      return response;
    },
  },
};
