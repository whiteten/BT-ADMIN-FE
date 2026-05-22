import ApiClient, { type ApiResponse } from '@/shared-util';
import type { BotDashboardResponse } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dashboardApi = {
  getBotDashboard: async (params?: Record<string, unknown>): Promise<BotDashboardResponse> => {
    const response = await apiClient.get<ApiResponse<BotDashboardResponse>>('/moni-bot-service-dashboard', { params });
    return response.data?.data;
  },
};
