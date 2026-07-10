import ApiClient, { type ApiResponse } from '@/shared-util';
import type { CodeItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const commonApi = {
  getCodesList: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<{ items: CodeItem[] }>>('/ivr-codes-list', { params });
    return response.data?.data?.items ?? [];
  },
};
