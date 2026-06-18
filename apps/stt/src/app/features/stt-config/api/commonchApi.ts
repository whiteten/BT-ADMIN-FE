import ApiClient, { type ApiResponse } from '@/shared-util';
import type { CodeItem, SttSystemItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const commonApi = {
  getCodesList: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<{ items: CodeItem[] }>>('/stt-codes-list', { params });
    return response.data?.data?.items ?? [];
  },
  getSttSystemList: async () => {
    const response = await apiClient.get<ApiResponse<{ items: SttSystemItem[] }>>('/stt-system-list');
    return response.data?.data?.items ?? [];
  },
};
