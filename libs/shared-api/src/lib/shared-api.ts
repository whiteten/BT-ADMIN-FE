import { createQueryKeys } from '@lukemorales/query-key-factory';
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { FavoriteCreateDatas, FavoriteUpdateDatas } from './types/favorite.type';
import type { Role } from './types/iam.types';
import type { NavigationData } from './types/navi.types';
import type { PageVariant, PageVariantUpsertRequest } from './types/pageVariant.types';

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
      const response = await bffClient.get<ApiResponse<{ items: Role[] }>>('/role-list', { params });
      return response.data?.data?.items ?? [];
    },
    /**
     * 역할 단건 조회
     */
    getRole: async (params?: Record<string, unknown>): Promise<Role> => {
      const response = await bffClient.get<ApiResponse<Role>>('/role-detail', { params });
      return response.data?.data;
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
      const response = await bffClient.get<ApiResponse<unknown>>('/session-status', { params });
      return response;
    },
    /**
     * 네비게이션 데이터 조회
     */
    getNavigation: async (params?: Record<string, unknown>): Promise<NavigationData> => {
      const response = await bffClient.get<ApiResponse<NavigationData>>('/navigation', { params });
      return response.data?.data;
    },
  },
  pageVariant: {
    queryKeys: createQueryKeys('sharedApi:pageVariant', {
      getPageVariants: null,
    }),
    /**
     * 화면 지정 목록 조회
     */
    getPageVariants: async (): Promise<PageVariant[]> => {
      const response = await bffClient.get<ApiResponse<{ items: PageVariant[] }>>('/page-variant-list');
      return response.data?.data?.items ?? [];
    },
    /**
     * 화면 지정 upsert (없으면 생성, 있으면 갱신)
     */
    upsertPageVariant: async (data: PageVariantUpsertRequest): Promise<PageVariant> => {
      const response = await bffClient.post<ApiResponse<PageVariant>>('/page-variant-upsert', data);
      return response?.data?.data;
    },
    /**
     * 화면 지정 삭제 (appId + path 키) — 기본 화면으로 복원
     */
    deletePageVariant: async ({ appId, path }: { appId: string; path: string }): Promise<void> => {
      await bffClient.delete('/page-variant-delete', { params: { appId, path } });
    },
  },
  favorite: {
    createFavorite: async ({ params, data }: { params: Record<string, unknown>; data: FavoriteCreateDatas }) => {
      const response = await bffClient.post<ApiResponse<void>>('/favorites-create', data, { params });
      return response;
    },
    updateFavorite: async ({ params, data }: { params: Record<string, unknown>; data: FavoriteUpdateDatas }) => {
      const response = await bffClient.put<ApiResponse<void>>('/favorites-update', data, { params });
      return response;
    },
    deleteFavorite: async (params: Record<string, unknown>) => {
      const response = await bffClient.delete<ApiResponse<void>>('/favorites-delete', { params });
      return response;
    },
  },
};
