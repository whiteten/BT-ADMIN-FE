import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { EngineItem, TenantItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const commonApi = {
  getTenants: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ListResponse<TenantItem>>('/stt-tenants-list', { params });
    return extractList(response);
  },
  getEngineList: async () => {
    const response = await apiClient.get<ListResponse<EngineItem>>('/stt-engine-list');
    return extractList(response);
  },
};
