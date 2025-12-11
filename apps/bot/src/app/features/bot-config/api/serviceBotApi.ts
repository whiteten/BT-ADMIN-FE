import ApiClient from '@/shared-util';
import type { ServiceBotBasicInfoUpdateDatas, ServiceBotCreateDatas, ServiceBotItem, ServiceBotListItem, ServiceBotVoiceUpdateDatas } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });
interface ServiceBotListResponse {
  data: { list: { data: { items: ServiceBotListItem[] } } };
}

interface ServiceBotDetailResponse {
  data: { detail: { data: ServiceBotItem } };
}

export const serviceBotApi = {
  getServiceBots: async (params?: Record<string, unknown>): Promise<ServiceBotListItem[]> => {
    const response = await apiClient.get<ServiceBotListResponse>('/service-bots-list', { params });
    return response.data.data.list.data.items ?? [];
  },
  getServiceBot: async (params?: Record<string, unknown>): Promise<ServiceBotItem> => {
    const response = await apiClient.get<ServiceBotDetailResponse>(`/service-bots-detail`, { params });
    return response.data.data.detail.data;
  },
  createServiceBot: async (params: ServiceBotCreateDatas) => {
    const response = await apiClient.post('/service-bots-create', params);
    return response.data;
  },
  updateServiceBot: async ({ params, data }: { params: Record<string, unknown>; data: ServiceBotBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/service-bots-update', data, { params });
    return response.data;
  },
  deleteServiceBot: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete(`/service-bots-delete`, { params });
    return response.data;
  },
  updateServiceBotVoice: async ({ params, data }: { params: Record<string, unknown>; data: ServiceBotVoiceUpdateDatas }) => {
    const response = await apiClient.put('/service-bot-stt-tts-update', data, { params });
    return response.data;
  },
};
