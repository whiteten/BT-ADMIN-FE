import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { TrackingFlowItem } from '../../tracking/types/tracking.types';
import type { BotServiceDto, DialogHistoryListItem, PagedDialogHistory } from '../types/history.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const historyApi = {
  getBotServices: async (params?: Record<string, unknown>): Promise<BotServiceDto[]> => {
    const response = await apiClient.get<ListResponse<BotServiceDto>>('/bot-services', { params });
    return extractList(response);
  },
  getDialogHistory: async (params?: Record<string, unknown>): Promise<PagedDialogHistory> => {
    const response = await apiClient.get<{ data: PagedDialogHistory }>('/dialog-history-list', { params });
    return response.data?.data ?? { items: [], page: 0, size: 0, total: 0 };
  },
  getBubbles: async (params?: Record<string, unknown>): Promise<TrackingFlowItem[]> => {
    const response = await apiClient.get<ListResponse<TrackingFlowItem>>('/dialog-history-bubbles', { params });
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
