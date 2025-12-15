import ApiClient from '@/shared-util';
import type {
  ServiceBotBasicInfoUpdateDatas,
  ServiceBotCreateDatas,
  ServiceBotItem,
  ServiceBotListItem,
  ServiceBotScheduleUpdateDatas,
  ServiceBotVersionCreateDatas,
  ServiceBotVersionItem,
  ServiceBotVersionListItem,
  ServiceBotVersionUpdateDatas,
  ServiceBotVoiceUpdateDatas,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });
interface ServiceBotListResponse {
  data: { list: { data: { items: ServiceBotListItem[] } } };
}

interface ServiceBotDetailResponse {
  data: { detail: { data: ServiceBotItem } };
}

interface ServiceBotVersionListResponse {
  data: { list: { data: ServiceBotVersionListItem[] } };
}

interface ServiceBotVersionDetailResponse {
  data: { detail: { data: ServiceBotVersionItem } };
}

export const serviceBotApi = {
  getServiceBots: async (params?: Record<string, unknown>): Promise<ServiceBotListItem[]> => {
    const response = await apiClient.get<ServiceBotListResponse>('/service-bots-list', { params });
    return response?.data?.data?.list?.data?.items ?? [];
  },
  getServiceBot: async (params?: Record<string, unknown>): Promise<ServiceBotItem> => {
    const response = await apiClient.get<ServiceBotDetailResponse>(`/service-bots-detail`, { params });
    return response?.data?.data?.detail?.data;
  },
  createServiceBot: async (data: ServiceBotCreateDatas) => {
    const response = await apiClient.post('/service-bots-create', data);
    return response?.data;
  },
  updateServiceBot: async ({ params, data }: { params: Record<string, unknown>; data: ServiceBotBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/service-bots-update', data, { params });
    return response?.data;
  },
  deleteServiceBot: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete(`/service-bots-delete`, { params });
    return response?.data;
  },
  updateServiceBotVoice: async ({ params, data }: { params: Record<string, unknown>; data: ServiceBotVoiceUpdateDatas }) => {
    const response = await apiClient.put('/service-bots-stt-tts-update', data, { params });
    return response?.data;
  },
  updateServiceBotSchedule: async ({ params, data }: { params: Record<string, unknown>; data: ServiceBotScheduleUpdateDatas }) => {
    const response = await apiClient.put('/service-bots-schedule-update', data, { params });
    return response?.data;
  },
  getServiceBotVersions: async (params?: Record<string, unknown>): Promise<ServiceBotVersionListItem[]> => {
    const response = await apiClient.get<ServiceBotVersionListResponse>('/service-bots-version-list', { params });
    return response?.data?.data?.list?.data ?? [];
  },
  getServiceBotVersion: async (params?: Record<string, unknown>): Promise<ServiceBotVersionItem> => {
    const response = await apiClient.get<ServiceBotVersionDetailResponse>('/service-bots-version-detail', { params });
    return response?.data?.data?.detail?.data;
  },
  createServiceBotVersion: async ({ params, data }: { params: Record<string, unknown>; data: ServiceBotVersionCreateDatas }) => {
    const response = await apiClient.post('/service-bots-version-create', data, { params });
    return response?.data;
  },
  updateServiceBotVersion: async ({ params, data }: { params: Record<string, unknown>; data: ServiceBotVersionUpdateDatas }) => {
    const response = await apiClient.put('/service-bots-version-update', data, { params });
    return response?.data;
  },
  deleteServiceBotVersion: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/service-bots-version-delete', { params });
    return response?.data;
  },
};
