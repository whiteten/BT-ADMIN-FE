import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  CustomWidgetCatalogItem,
  CustomWidgetCatalogUpdateDatas,
  DashboardCreateDatas,
  DashboardDetail,
  DashboardListItem,
  DashboardUpdateDatas,
  Widget,
  WidgetCreateDatas,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dashboardApi = {
  // ─── 대시보드 ──────────────────────────────────────────────────────

  getDashboards: async (params?: Record<string, unknown>): Promise<DashboardListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: DashboardListItem[] }>>('/monitoring-dashboard-list', { params });
    return response.data?.data?.items ?? [];
  },

  getDashboard: async (dashboardId: number): Promise<DashboardDetail> => {
    const response = await apiClient.get<ApiResponse<DashboardDetail>>('/monitoring-dashboard-detail', { params: { dashboardId } });
    return response.data?.data;
  },

  createDashboard: async (data: DashboardCreateDatas): Promise<DashboardDetail> => {
    const response = await apiClient.post<ApiResponse<DashboardDetail>>('/monitoring-dashboard-create', data);
    return response.data?.data;
  },

  updateDashboard: async (dashboardId: number, data: DashboardUpdateDatas): Promise<DashboardDetail> => {
    const response = await apiClient.put<ApiResponse<DashboardDetail>>('/monitoring-dashboard-update', data, { params: { dashboardId } });
    return response.data?.data;
  },

  deleteDashboard: async (dashboardId: number): Promise<void> => {
    await apiClient.delete('/monitoring-dashboard-delete', { params: { dashboardId } });
  },

  applyTenants: async (dashboardId: number, tenantIds: number[]): Promise<void> => {
    await apiClient.post('/monitoring-dashboard-apply-tenants', { tenantIds }, { params: { dashboardId } });
  },

  // ─── 위젯 ─────────────────────────────────────────────────────────

  getWidgets: async (dashboardId: number): Promise<Widget[]> => {
    const response = await apiClient.get<ApiResponse<{ items: Widget[] }>>('/monitoring-widget-list', { params: { dashboardId } });
    return response.data?.data?.items ?? [];
  },

  createWidget: async (dashboardId: number, data: WidgetCreateDatas): Promise<Widget> => {
    const response = await apiClient.post<ApiResponse<Widget>>('/monitoring-widget-create', data, { params: { dashboardId } });
    return response.data?.data;
  },

  getWidget: async (widgetId: number): Promise<Widget> => {
    const response = await apiClient.get<ApiResponse<Widget>>('/monitoring-widget-detail', { params: { widgetId } });
    return response.data?.data;
  },

  updateWidget: async (widgetId: number, data: Partial<WidgetCreateDatas>): Promise<Widget> => {
    const response = await apiClient.put<ApiResponse<Widget>>('/monitoring-widget-update', data, { params: { widgetId } });
    return response.data?.data;
  },

  deleteWidget: async (widgetId: number): Promise<void> => {
    await apiClient.delete('/monitoring-widget-delete', { params: { widgetId } });
  },

  updateLayout: async (dashboardId: number, items: Array<{ widgetId: number; row: number; col: number; w: number; h: number }>): Promise<void> => {
    await apiClient.put('/monitoring-dashboard-layout-update', { items }, { params: { dashboardId } });
  },

  // ─── 커스텀 위젯 카탈로그 ───────────────────────────────────────────

  getCustomWidgetCatalog: async (params?: Record<string, unknown>): Promise<CustomWidgetCatalogItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: CustomWidgetCatalogItem[] }>>('/monitoring-custom-widget-list', { params });
    return response.data?.data?.items ?? [];
  },

  updateCustomWidgetCatalog: async (widgetTypeId: string, data: CustomWidgetCatalogUpdateDatas): Promise<CustomWidgetCatalogItem> => {
    const response = await apiClient.put<ApiResponse<CustomWidgetCatalogItem>>('/monitoring-custom-widget-update', data, { params: { widgetTypeId } });
    return response.data?.data;
  },
};
