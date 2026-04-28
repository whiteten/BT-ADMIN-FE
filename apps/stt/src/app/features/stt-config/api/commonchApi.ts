import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { CodeItem, TenantItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const commonApi = {
  getTenants: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ListResponse<TenantItem>>('/stt-tenants-list', { params });
    return extractList(response);
  },
  getCodesList: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ListResponse<CodeItem>>('/stt-codes-list', { params });
    return extractList(response);
  },
};
