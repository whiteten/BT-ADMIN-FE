import ApiClient, { type ApiResponse } from '@/shared-util';
import type { SttChatSentence } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const sttMonitoringApi = {
  getChatContent: async (params: { ucidGkey: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: SttChatSentence[] }>>('/moni-stt-chat-content', { params });
    return response.data?.data?.items ?? [];
  },
};
