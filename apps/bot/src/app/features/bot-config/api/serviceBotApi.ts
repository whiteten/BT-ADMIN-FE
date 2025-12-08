import ApiClient from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bot/service-bots' });

export const serviceBotApi = {
  getServiceBots: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get('', { params });
    return response.data;
  },
};
