import ApiClient, { type ApiResponse } from '@/shared-util';
import type { SearchConditionCreateDatas, SearchConditionDetail, SearchConditionListItem, SqlPreviewRequest, SqlPreviewResult } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const searchConditionApi = {
  getSearchConditions: async (params?: Record<string, unknown>): Promise<SearchConditionListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: SearchConditionListItem[] }>>('/insight-statistics-search-condition-list', { params });
    return response.data?.data?.items ?? [];
  },

  getSearchCondition: async (searchCondId: number): Promise<SearchConditionDetail> => {
    const response = await apiClient.get<ApiResponse<SearchConditionDetail>>('/insight-statistics-search-condition-detail', { params: { searchCondId } });
    return response.data?.data;
  },

  createSearchCondition: async (data: SearchConditionCreateDatas): Promise<SearchConditionDetail> => {
    const response = await apiClient.post<ApiResponse<SearchConditionDetail>>('/insight-statistics-search-condition-create', data);
    return response.data?.data;
  },

  updateSearchCondition: async (searchCondId: number, data: SearchConditionCreateDatas): Promise<SearchConditionDetail> => {
    const response = await apiClient.put<ApiResponse<SearchConditionDetail>>('/insight-statistics-search-condition-update', data, { params: { searchCondId } });
    return response.data?.data;
  },

  deleteSearchCondition: async (searchCondId: number): Promise<void> => {
    await apiClient.delete('/insight-statistics-search-condition-delete', { params: { searchCondId } });
  },

  /**
   * SQL 미리보기.
   * 백엔드는 ApiResponse<List<T>>를 반환 — BFF 단일 스텝 통과 후 data가 배열 직접 노출.
   * BFF step_id에 따라 data 키가 달라질 수 있어 response.data.data를 수동 추출·캐스팅한다.
   */
  previewSql: async (data: SqlPreviewRequest): Promise<SqlPreviewResult[]> => {
    const response = await apiClient.post<Record<string, unknown>>('/insight-statistics-search-condition-preview', data);
    // BFF step_id에 따라 data 키가 다를 수 있음 (value / items / 배열 직접)
    const raw = (response as unknown as { data: { data: unknown } })?.data?.data;
    if (Array.isArray(raw)) return raw as SqlPreviewResult[];
    if (raw && typeof raw === 'object') {
      // step_id = "value" 또는 "items"
      const arr = (raw as Record<string, unknown>).value ?? (raw as Record<string, unknown>).items;
      if (Array.isArray(arr)) return arr as SqlPreviewResult[];
    }
    return [];
  },
};
