import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { BoardRequest, BoardWidgetRequest, DashboardItem, UserLayoutItem, UserLayoutRequest } from '../types/board.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 통계 보드 관리 API (v3.1)
 */
export const boardApi = {
  getList: async (): Promise<DashboardItem[]> => {
    const response = await apiClient.get<ListResponse<DashboardItem>>('/insight-stat-board-list');
    return extractList(response);
  },

  getDetail: async (params?: Record<string, unknown>): Promise<DashboardItem> => {
    const response = await apiClient.get<DetailResponse<DashboardItem>>('/insight-stat-board-detail', { params });
    return extractDetail(response);
  },

  create: async (data: BoardRequest) => {
    const response = await apiClient.post('/insight-stat-board-create', data);
    return response;
  },

  update: async ({ params, data }: { params: Record<string, unknown>; data: BoardRequest }) => {
    const response = await apiClient.put('/insight-stat-board-update', data, { params });
    return response;
  },

  updateLayout: async ({ params, data }: { params: Record<string, unknown>; data: BoardWidgetRequest[] }) => {
    const response = await apiClient.put('/insight-stat-board-layout', data, { params });
    return response;
  },

  delete: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/insight-stat-board-delete', { params });
    return response;
  },
};

/**
 * 사용자 레이아웃 API
 */
export const userLayoutApi = {
  getList: async (params?: Record<string, unknown>): Promise<UserLayoutItem[]> => {
    const response = await apiClient.get<ListResponse<UserLayoutItem>>('/insight-user-layout-list', { params });
    return extractList(response);
  },

  save: async (data: UserLayoutRequest) => {
    const response = await apiClient.put('/insight-user-layout-save', data);
    return response;
  },

  reset: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/insight-user-layout-reset', { params });
    return response;
  },
};
