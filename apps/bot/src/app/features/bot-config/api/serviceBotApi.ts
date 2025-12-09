import ApiClient from '@/shared-util';
import type { ServiceBotCreateRequest, ServiceBotListItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

interface ServiceBotListResponse {
  data: { list: { data: { items: ServiceBotListItem[] } } };
}

export const serviceBotApi = {
  getServiceBots: async (params?: Record<string, unknown>): Promise<ServiceBotListItem[]> => {
    const response = await apiClient.get<ServiceBotListResponse>('/service-bots-list', { params });
    return response.data.data.list.data.items ?? [];
  },
  createServiceBot: async (data: ServiceBotCreateRequest) => {
    const response = await apiClient.post('/service-bots-create', data);
    return response.data;
  },
};
