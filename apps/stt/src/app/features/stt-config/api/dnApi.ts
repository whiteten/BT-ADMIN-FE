import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { SttDnCreateData, SttDnDeleteParams, SttDnItem, SttDnSearchParams } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dnApi = {
  getSttDnList: async (params?: SttDnSearchParams) => {
    const response = await apiClient.get<ListResponse<SttDnItem>>('/stt-dn-list', { params });
    return extractList(response);
  },
  createSttDn: async (data: SttDnCreateData) => {
    return apiClient.post('/stt-dn-create', data);
  },
  deleteSttDn: async (params: SttDnDeleteParams) => {
    return apiClient.delete('/stt-dn-delete', { params });
  },
};
