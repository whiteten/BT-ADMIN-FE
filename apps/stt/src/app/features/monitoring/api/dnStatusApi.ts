import ApiClient, { type ApiResponse } from '@/shared-util';
import type { DnStatusItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dnStatusApi = {
  getDnStatusList: async () => {
    const response = await apiClient.get<ApiResponse<{ items: DnStatusItem[] }>>('/moni-stt-dn-status');
    return response.data?.data?.items ?? [];
  },
};
