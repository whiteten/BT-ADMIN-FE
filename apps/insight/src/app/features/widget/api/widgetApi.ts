import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { FormulaValidateRequest, FormulaValidateResponse, WidgetItem, WidgetRequest } from '../types/widget.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 통계 위젯 관리 API (v3.1)
 *
 * 모니터링 위젯은 Wave B에서 별도 API 추가 예정.
 */
export const widgetApi = {
  getList: async (params?: Record<string, unknown>): Promise<WidgetItem[]> => {
    const response = await apiClient.get<ListResponse<WidgetItem>>('/insight-stat-widget-list', { params });
    return extractList(response);
  },

  getDetail: async (params?: Record<string, unknown>): Promise<WidgetItem> => {
    const response = await apiClient.get<DetailResponse<WidgetItem>>('/insight-stat-widget-detail', { params });
    return extractDetail(response);
  },

  create: async (data: WidgetRequest) => {
    const response = await apiClient.post('/insight-stat-widget-create', data);
    return response;
  },

  update: async ({ params, data }: { params: Record<string, unknown>; data: WidgetRequest }) => {
    const response = await apiClient.put('/insight-stat-widget-update', data, { params });
    return response;
  },

  delete: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/insight-stat-widget-delete', { params });
    return response;
  },

  validateFormula: async (data: FormulaValidateRequest): Promise<FormulaValidateResponse> => {
    const response = await apiClient.post<DetailResponse<FormulaValidateResponse>>('/insight-stat-widget-formula-validate', data);
    return extractDetail(response);
  },
};
