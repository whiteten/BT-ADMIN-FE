import ApiClient, { type ApiResponse } from '@/shared-util';
import type { StatConfigBulkSaveRequest, StatConfigItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 통계 글로벌 정책 API (BFF aggregation flow 경유).
 * - 조회: insight-statistics-stat-config-detail → GET  /api/insight/statistics/stat-config
 * - 저장: insight-statistics-stat-config-update → PUT  /api/insight/statistics/stat-config (bulk)
 */
export const statConfigApi = {
  /** 전체 정책 조회. category 지정 시 해당 카테고리만. */
  getConfigs: async (params?: { category?: string }): Promise<StatConfigItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: StatConfigItem[] }>>('/insight-statistics-stat-config-detail', { params });
    return response.data?.data?.items ?? [];
  },

  /** 일괄 저장. */
  saveConfigs: async (data: StatConfigBulkSaveRequest): Promise<StatConfigItem[]> => {
    const response = await apiClient.put<ApiResponse<{ items: StatConfigItem[] }>>('/insight-statistics-stat-config-update', data);
    return response.data?.data?.items ?? [];
  },
};
