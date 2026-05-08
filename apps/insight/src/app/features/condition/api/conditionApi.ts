import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { SearchConditionItem, SearchConditionRequest, UserFilterItem, UserFilterRequest } from '../types/condition.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 검색조건 관리 API
 */
export const conditionApi = {
  getList: async (params?: Record<string, unknown>): Promise<SearchConditionItem[]> => {
    const response = await apiClient.get<ListResponse<SearchConditionItem>>('/dashboard-condition-list', { params });
    return extractList(response);
  },

  getDetail: async (params?: Record<string, unknown>): Promise<SearchConditionItem> => {
    const response = await apiClient.get<DetailResponse<SearchConditionItem>>('/dashboard-condition-detail', {
      params,
    });
    return extractDetail(response);
  },

  create: async (data: SearchConditionRequest) => {
    const response = await apiClient.post('/dashboard-condition-create', data);
    return response;
  },

  update: async ({ params, data }: { params: Record<string, unknown>; data: SearchConditionRequest }) => {
    const response = await apiClient.put('/dashboard-condition-update', data, { params });
    return response;
  },

  delete: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/dashboard-condition-delete', { params });
    return response;
  },
};

/**
 * 사용자 필터 API
 */
export const userFilterApi = {
  getList: async (params?: Record<string, unknown>): Promise<UserFilterItem[]> => {
    const response = await apiClient.get<ListResponse<UserFilterItem>>('/dashboard-user-filter-list', { params });
    return extractList(response);
  },

  save: async (data: UserFilterRequest) => {
    const response = await apiClient.put('/dashboard-user-filter-save', data);
    return response;
  },
};
