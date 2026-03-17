import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { BotServiceDto, ChatBubbleDto, DialogHistoryListItem } from '../types/history.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const historyApi = {
  getBotServices: async (params?: Record<string, unknown>): Promise<BotServiceDto[]> => {
    const response = await apiClient.get<ListResponse<BotServiceDto>>('/dialog-history-bot-services', { params });
    return extractList(response);
  },
  getDialogHistory: async (params?: Record<string, unknown>): Promise<ListResponse<DialogHistoryListItem>> => {
    const response = await apiClient.get<ListResponse<DialogHistoryListItem>>('/dialog-history-list', { params });
    return response.data;
  },
  getBubbles: async (params?: Record<string, unknown>): Promise<ChatBubbleDto[]> => {
    const response = await apiClient.get<ListResponse<ChatBubbleDto>>('/dialog-history-bubbles', { params });
    return extractList(response);
  },
  getNluAnalysis: async (params?: Record<string, unknown>): Promise<any> => {
    const response = await apiClient.get<DetailResponse<any>>('/dialog-history-nlu-analysis', { params });
    return extractDetail(response);
  },
  getExcelDownloadUrl: (params?: Record<string, unknown>): string => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return `/bff/dialog-history-excel?${query}`;
  },
};
