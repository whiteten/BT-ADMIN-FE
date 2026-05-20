import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { DnStatusItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dnStatusApi = {
  getDnStatusList: async () => {
    const response = await apiClient.get<ListResponse<DnStatusItem>>('/moni-stt-dn-status');
    return extractList(response);
  },
};
