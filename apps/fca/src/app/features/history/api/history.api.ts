import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { TrackingFlowItem } from '../../tracking/types/tracking.types';
import type { BotServiceDto, IntentDto, PagedCallbotHistory } from '../types/history.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const historyApi = {
  getBotServices: async (params?: Record<string, unknown>): Promise<BotServiceDto[]> => {
    const response = await apiClient.get<ListResponse<BotServiceDto>>('/bot-services', { params });
    return extractList(response);
  },
  getCallbotHistory: async (params?: Record<string, unknown>): Promise<PagedCallbotHistory> => {
    const { _t, ...body } = params ?? {};
    const response = await apiClient.post<{ data: PagedCallbotHistory }>('/callbot-history-list', body);
    return response.data?.data ?? { items: [], page: 0, size: 0, total: 0 };
  },
  getIntents: async (params?: Record<string, unknown>): Promise<IntentDto[]> => {
    const response = await apiClient.get<ListResponse<IntentDto>>('/callbot-history-intents', { params });
    return extractList(response);
  },
  getBubbles: async (params?: Record<string, unknown>): Promise<TrackingFlowItem[]> => {
    const response = await apiClient.get<ListResponse<TrackingFlowItem>>('/callbot-history-bubbles', { params });
    return extractList(response);
  },
  getIfeRedirectUrl: async (params: { serviceId: number; serviceVer: string; subFlowId: string; nodeName: string }): Promise<string | null> => {
    const response = await apiClient.get<{ data: { redirectUrl: string } }>('/callbot-history-ife-redirect', { params });
    return response.data?.data?.redirectUrl ?? '';
  },
};
