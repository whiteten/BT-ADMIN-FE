import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { SttChatSentence } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const sttMonitoringApi = {
  getChatContent: async (params: { ucidGkey: string }) => {
    const response = await apiClient.get<ListResponse<SttChatSentence>>('/moni-stt-chat-content', { params });
    return extractList(response);
  },
};
