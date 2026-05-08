import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { ConditionRequest, OptionItem, SearchConditionItem, UserFilterItem, UserFilterRequest } from '../types/condition.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 검색조건 관리 API (v3.1)
 */
export const conditionApi = {
  getList: async (params?: Record<string, unknown>): Promise<SearchConditionItem[]> => {
    const response = await apiClient.get<ListResponse<SearchConditionItem>>('/insight-condition-list', { params });
    return extractList(response);
  },

  getDetail: async (params?: Record<string, unknown>): Promise<SearchConditionItem> => {
    const response = await apiClient.get<DetailResponse<SearchConditionItem>>('/insight-condition-detail', {
      params,
    });
    return extractDetail(response);
  },

  create: async (data: ConditionRequest) => {
    const response = await apiClient.post('/insight-condition-create', data);
    return response;
  },

  update: async ({ params, data }: { params: Record<string, unknown>; data: ConditionRequest }) => {
    const response = await apiClient.put('/insight-condition-update', data, { params });
    return response;
  },

  delete: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/insight-condition-delete', { params });
    return response;
  },

  /** v3.1: 동적 옵션 조회 (STATIC/QUERY 구분) */
  getOptions: async (conditionId: number, parentValue?: string | number): Promise<OptionItem[]> => {
    const params: Record<string, unknown> = { conditionId };
    if (parentValue !== undefined && parentValue !== null) {
      params.parentValue = parentValue;
    }
    const response = await apiClient.get<ListResponse<OptionItem>>('/insight-condition-options', { params });
    return extractList(response);
  },
};

/**
 * 사용자 필터 API
 */
export const userFilterApi = {
  getList: async (params?: Record<string, unknown>): Promise<UserFilterItem[]> => {
    const response = await apiClient.get<ListResponse<UserFilterItem>>('/insight-user-filter-list', { params });
    return extractList(response);
  },

  save: async (data: UserFilterRequest) => {
    const response = await apiClient.put('/insight-user-filter-save', data);
    return response;
  },
};
