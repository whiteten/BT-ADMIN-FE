import ApiClient, { type ApiResponse } from '@/shared-util';
import type { SttSystemItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const commonApi = {
  getSttSystemList: async () => {
    const response = await apiClient.get<ApiResponse<{ items: SttSystemItem[] }>>('/stt-system-list');
    return response.data?.data?.items ?? [];
  },
};
