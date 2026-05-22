/**
 * 앱 관리 API
 */
import ApiClient, { type ApiResponse } from '@/shared-util';

export interface App {
  appId: string;
  appName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const appApi = {
  /**
   * 앱 목록 조회
   */
  getApps: async (): Promise<App[]> => {
    const response = await apiClient.get<ApiResponse<{ items: App[] }>>('/app-list');
    return response.data?.data?.items ?? [];
  },
};
