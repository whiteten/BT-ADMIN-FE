import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { ChannelStatusItem, ChannelStatusSearchParams } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const channelStatusApi = {
  getChannelStatusList: async (params: ChannelStatusSearchParams) => {
    const response = await apiClient.get<ListResponse<ChannelStatusItem>>('/moni-stt-channel-status', { params });
    return extractList(response);
  },
};
