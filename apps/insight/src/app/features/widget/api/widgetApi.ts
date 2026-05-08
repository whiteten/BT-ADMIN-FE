import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { FormulaValidateRequest, FormulaValidateResponse, WidgetItem, WidgetRequest } from '../types/widget.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 위젯 관리 API
 */
export const widgetApi = {
  getList: async (params?: Record<string, unknown>): Promise<WidgetItem[]> => {
    const response = await apiClient.get<ListResponse<WidgetItem>>('/dashboard-widget-list', { params });
    return extractList(response);
  },

  getDetail: async (params?: Record<string, unknown>): Promise<WidgetItem> => {
    const response = await apiClient.get<DetailResponse<WidgetItem>>('/dashboard-widget-detail', { params });
    return extractDetail(response);
  },

  create: async (data: WidgetRequest) => {
    const response = await apiClient.post('/dashboard-widget-create', data);
    return response;
  },

  update: async ({ params, data }: { params: Record<string, unknown>; data: WidgetRequest }) => {
    const response = await apiClient.put('/dashboard-widget-update', data, { params });
    return response;
  },

  delete: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/dashboard-widget-delete', { params });
    return response;
  },

  validateFormula: async (data: FormulaValidateRequest): Promise<FormulaValidateResponse> => {
    const response = await apiClient.post<DetailResponse<FormulaValidateResponse>>('/dashboard-widget-formula-validate', data);
    return extractDetail(response);
  },
};
