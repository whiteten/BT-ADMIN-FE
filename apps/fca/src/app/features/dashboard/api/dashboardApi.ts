import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type { BotDashboardResponse } from '../types/dashboard.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dashboardApi = {
  getBotDashboard: async (params?: Record<string, unknown>): Promise<BotDashboardResponse> => {
    const response = await apiClient.get<DetailResponse<BotDashboardResponse>>('/moni-bot-service-dashboard', { params });
    return extractDetail(response);
  },
};
