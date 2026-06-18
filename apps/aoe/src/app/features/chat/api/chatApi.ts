import ApiClient, { type ApiResponse } from '@/shared-util';
import type { ChatCreateDatas, ChatItem, ChatMessageItem, ChatQueryDatas, ChatUpdateDatas } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const chatApi = {
  getChatList: async (params?: { keyword?: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: ChatItem[] }>>('/aoe-chat-list', { params });
    return response.data?.data?.items ?? [];
  },
  createChat: async (data: ChatCreateDatas) => {
    const response = await apiClient.post<ApiResponse<ChatItem>>('/aoe-chat-create', data);
    return response.data?.data;
  },
  updateChat: async ({ params, data }: { params: { chatId: string }; data: ChatUpdateDatas }) => {
    await apiClient.put('/aoe-chat-update', data, { params });
  },
  deleteChat: async (params: { chatId: string }) => {
    await apiClient.delete('/aoe-chat-delete', { params });
  },
  getChatMessageList: async (params: { chatId: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: ChatMessageItem[] }>>('/aoe-chat-message-list', { params });
    return response.data?.data?.items ?? [];
  },
  /** 질의 — BE 가 엔진 호출 + 메시지 저장까지 수행. 응답이 곧 저장된 메시지 */
  queryChat: async ({ params, data }: { params: { chatId: string }; data: ChatQueryDatas }) => {
    const response = await apiClient.post<ApiResponse<ChatMessageItem>>('/aoe-chat-query', data, { params });
    return response.data?.data;
  },
};
