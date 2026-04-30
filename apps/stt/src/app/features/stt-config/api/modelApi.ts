import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { SttModelItem, SttModelSearchParams } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const modelApi = {
  getSttModelList: async (params?: SttModelSearchParams) => {
    const response = await apiClient.get<ListResponse<SttModelItem>>('/stt-model-list', { params });
    return extractList(response);
  },
};
