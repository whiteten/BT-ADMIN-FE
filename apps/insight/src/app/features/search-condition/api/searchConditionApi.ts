import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { SearchConditionCreateDatas, SearchConditionDetail, SearchConditionListItem, SqlPreviewRequest, SqlPreviewResult } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const searchConditionApi = {
  getSearchConditions: async (params?: Record<string, unknown>): Promise<SearchConditionListItem[]> => {
    const response = await apiClient.get<ListResponse<SearchConditionListItem>>('/insight-statistics-search-condition-list', { params });
    return extractList(response);
  },

  getSearchCondition: async (searchCondId: number): Promise<SearchConditionDetail> => {
    const response = await apiClient.get<DetailResponse<SearchConditionDetail>>('/insight-statistics-search-condition-detail', { params: { searchCondId } });
    return extractDetail(response);
  },

  createSearchCondition: async (data: SearchConditionCreateDatas): Promise<SearchConditionDetail> => {
    const response = await apiClient.post<DetailResponse<SearchConditionDetail>>('/insight-statistics-search-condition-create', data);
    return extractDetail(response);
  },

  updateSearchCondition: async (searchCondId: number, data: SearchConditionCreateDatas): Promise<SearchConditionDetail> => {
    const response = await apiClient.put<DetailResponse<SearchConditionDetail>>('/insight-statistics-search-condition-update', data, { params: { searchCondId } });
    return extractDetail(response);
  },

  deleteSearchCondition: async (searchCondId: number): Promise<void> => {
    await apiClient.delete('/insight-statistics-search-condition-delete', { params: { searchCondId } });
  },

  previewSql: async (data: SqlPreviewRequest): Promise<SqlPreviewResult[]> => {
    const response = await apiClient.post<ListResponse<SqlPreviewResult>>('/insight-statistics-search-condition-preview', data);
    return extractList(response);
  },
};
