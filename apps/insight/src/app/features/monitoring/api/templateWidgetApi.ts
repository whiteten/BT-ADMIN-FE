import ApiClient, { type ApiResponse } from '@/shared-util';
import type { TemplateWidgetDefinitionCreateDatas, TemplateWidgetDefinitionDetail, TemplateWidgetDefinitionListItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 재사용 템플릿 위젯 정의 API — 모두 BFF aggregation flow 경유.
 */
export const templateWidgetApi = {
  getList: async (params?: Record<string, unknown>): Promise<TemplateWidgetDefinitionListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TemplateWidgetDefinitionListItem[] }>>('/insight-monitoring-template-widget-list', { params });
    return response.data?.data?.items ?? [];
  },

  getDetail: async (templateWidgetId: number): Promise<TemplateWidgetDefinitionDetail> => {
    const response = await apiClient.get<ApiResponse<TemplateWidgetDefinitionDetail>>('/insight-monitoring-template-widget-detail', { params: { templateWidgetId } });
    return response.data?.data;
  },

  create: async (data: TemplateWidgetDefinitionCreateDatas): Promise<TemplateWidgetDefinitionDetail> => {
    const response = await apiClient.post<ApiResponse<TemplateWidgetDefinitionDetail>>('/insight-monitoring-template-widget-create', data);
    return response.data?.data;
  },

  update: async (templateWidgetId: number, data: TemplateWidgetDefinitionCreateDatas): Promise<TemplateWidgetDefinitionDetail> => {
    const response = await apiClient.put<ApiResponse<TemplateWidgetDefinitionDetail>>('/insight-monitoring-template-widget-update', data, { params: { templateWidgetId } });
    return response.data?.data;
  },

  remove: async (templateWidgetId: number): Promise<void> => {
    await apiClient.delete('/insight-monitoring-template-widget-delete', { params: { templateWidgetId } });
  },
};
