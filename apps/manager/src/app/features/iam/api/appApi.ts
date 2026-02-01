/**
 * 앱 관리 API
 */
import ApiClient, { type ListResponse, extractList } from '@/shared-util';

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
    const response = await apiClient.get<ListResponse<App>>('/app-list');
    return extractList(response);
  },
};
