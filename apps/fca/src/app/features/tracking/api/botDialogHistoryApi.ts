import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { BotServiceDto, IntentDto, PagedBotDialogHistory } from '../types/botDialogHistory.types';
import type { NluAnalysisItem, TrackingFlowItem } from '../types/tracking.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const botDialogHistoryApi = {
  getBotServices: async (params?: Record<string, unknown>): Promise<BotServiceDto[]> => {
    const response = await apiClient.get<ListResponse<BotServiceDto>>('/bot-services', { params });
    return extractList(response);
  },
  getBotDialogHistory: async (params?: Record<string, unknown>): Promise<PagedBotDialogHistory> => {
    const { _t, ...body } = params ?? {};
    const response = await apiClient.post<{ data: PagedBotDialogHistory }>('/bot-dialog-history-list', body);
    return response.data?.data ?? { items: [], page: 0, size: 0, total: 0 };
  },
  getIntents: async (params?: Record<string, unknown>): Promise<IntentDto[]> => {
    const response = await apiClient.get<ListResponse<IntentDto>>('/bot-dialog-history-intents', { params });
    return extractList(response);
  },
  getBubbles: async (params?: Record<string, unknown>): Promise<TrackingFlowItem[]> => {
    const response = await apiClient.get<ListResponse<TrackingFlowItem>>('/bot-dialog-history-bubbles', { params });
    return extractList(response);
  },
  getNluAnalysis: async (params?: Record<string, unknown>): Promise<NluAnalysisItem[]> => {
    const response = await apiClient.get<ListResponse<NluAnalysisItem>>('/bot-dialog-history-nlu-analysis', { params });
    return extractList(response);
  },
  getIfeRedirectUrl: async (params: { serviceId: number; serviceVer: string; subFlowId: string; nodeName: string }): Promise<string | null> => {
    const response = await apiClient.get<{ data: { redirectUrl: string } }>('/bot-dialog-history-ife-redirect', { params });
    return response.data?.data?.redirectUrl ?? '';
  },
  exportExcel: async (params?: Record<string, unknown>) => {
    return await apiClient.post<Blob>('/bot-dialog-history-export', params, { responseType: 'blob' });
  },
};
