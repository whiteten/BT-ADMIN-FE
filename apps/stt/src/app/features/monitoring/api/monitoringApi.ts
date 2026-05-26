import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  CallStatusItem,
  CallStatusSearchParams,
  CallStatusSummaryItem,
  ChannelStatusItem,
  ChannelStatusSearchParams,
  DnStatusItem,
  DnStatusSearchParams,
  SttChatSentence,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const monitoringApi = {
  getChannelStatusList: async (params: ChannelStatusSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: ChannelStatusItem[] }>>('/moni-stt-channel-status', { params });
    return response.data?.data?.items ?? [];
  },
  getDnStatusList: async (params?: DnStatusSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: DnStatusItem[] }>>('/moni-stt-dn-status', { params });
    return response.data?.data?.items ?? [];
  },
  getRealtimeSentence: async (params: { ucidGkey: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: SttChatSentence[] }>>('/moni-stt-realtime-sentence', { params });
    return response.data?.data?.items ?? [];
  },
  getCallStatusList: async (params: CallStatusSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: CallStatusItem[]; summary: CallStatusSummaryItem[] }>>('/moni-stt-call-status', { params });
    const data = response.data?.data;
    return {
      summary: [...(data?.summary ?? [])].sort((a, b) => a.sort - b.sort),
      items: data?.items ?? [],
    };
  },
};
