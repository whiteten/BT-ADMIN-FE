import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { DashboardItem, DashboardRequest, DashboardWidgetRequest, UserLayoutItem, UserLayoutRequest } from '../types/board.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 대시보드 관리 API
 */
export const boardApi = {
  getList: async (): Promise<DashboardItem[]> => {
    const response = await apiClient.get<ListResponse<DashboardItem>>('/dashboard-board-list');
    return extractList(response);
  },

  getDetail: async (params?: Record<string, unknown>): Promise<DashboardItem> => {
    const response = await apiClient.get<DetailResponse<DashboardItem>>('/dashboard-board-detail', { params });
    return extractDetail(response);
  },

  create: async (data: DashboardRequest) => {
    const response = await apiClient.post('/dashboard-board-create', data);
    return response;
  },

  update: async ({ params, data }: { params: Record<string, unknown>; data: DashboardRequest }) => {
    const response = await apiClient.put('/dashboard-board-update', data, { params });
    return response;
  },

  updateLayout: async ({ params, data }: { params: Record<string, unknown>; data: DashboardWidgetRequest[] }) => {
    const response = await apiClient.put('/dashboard-board-layout', data, { params });
    return response;
  },

  delete: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/dashboard-board-delete', { params });
    return response;
  },
};

/**
 * 사용자 레이아웃 API
 */
export const userLayoutApi = {
  getList: async (params?: Record<string, unknown>): Promise<UserLayoutItem[]> => {
    const response = await apiClient.get<ListResponse<UserLayoutItem>>('/dashboard-user-layout-list', { params });
    return extractList(response);
  },

  save: async (data: UserLayoutRequest) => {
    const response = await apiClient.put('/dashboard-user-layout-save', data);
    return response;
  },

  reset: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/dashboard-user-layout-reset', { params });
    return response;
  },
};
