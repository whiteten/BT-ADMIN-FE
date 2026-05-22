import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  CalcField,
  CalcFieldCreateDatas,
  FieldDisplay,
  PanelCreateDatas,
  PanelDetail,
  PanelLayoutUpdateItem,
  PublishDatas,
  ReportCreateDatas,
  ReportDetail,
  ReportFullDetail,
  ReportListItem,
  ReportUpdateDatas,
  SearchBinding,
  SearchBindingCreateDatas,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const reportApi = {
  getReports: async (params?: Record<string, unknown>): Promise<ReportListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: ReportListItem[] }>>('/insight-statistics-report-list', { params });
    return response.data?.data?.items ?? [];
  },

  createReport: async (data: ReportCreateDatas): Promise<ReportDetail> => {
    const response = await apiClient.post<ApiResponse<ReportDetail>>('/insight-statistics-report-create', data);
    return response.data?.data;
  },

  getReport: async (reportId: number): Promise<ReportFullDetail> => {
    const response = await apiClient.get<ApiResponse<ReportFullDetail>>('/insight-statistics-report-detail', {
      params: { reportId },
    });
    return response.data?.data;
  },

  updateReport: async (reportId: number, data: ReportUpdateDatas): Promise<ReportDetail> => {
    const response = await apiClient.put<ApiResponse<ReportDetail>>('/insight-statistics-report-update', data, {
      params: { reportId },
    });
    return response.data?.data;
  },

  deleteReport: async (reportId: number): Promise<void> => {
    await apiClient.delete('/insight-statistics-report-delete', { params: { reportId } });
  },

  getFieldDisplays: async (reportId: number): Promise<FieldDisplay[]> => {
    const response = await apiClient.get<ApiResponse<{ items: FieldDisplay[] }>>('/insight-statistics-field-display-list', {
      params: { reportId },
    });
    return response.data?.data?.items ?? [];
  },

  updateFieldDisplays: async (reportId: number, data: FieldDisplay[]): Promise<void> => {
    await apiClient.put('/insight-statistics-field-display-update', data, { params: { reportId } });
  },

  getCalcFields: async (reportId: number): Promise<CalcField[]> => {
    const response = await apiClient.get<ApiResponse<{ items: CalcField[] }>>('/insight-statistics-calc-field-list', {
      params: { reportId },
    });
    return response.data?.data?.items ?? [];
  },

  createCalcField: async (reportId: number, data: CalcFieldCreateDatas): Promise<CalcField> => {
    const response = await apiClient.post<ApiResponse<CalcField>>('/insight-statistics-calc-field-create', data, {
      params: { reportId },
    });
    return response.data?.data;
  },

  updateCalcField: async (reportId: number, calcFieldId: number, data: CalcFieldCreateDatas): Promise<CalcField> => {
    const response = await apiClient.put<ApiResponse<CalcField>>('/insight-statistics-calc-field-update', data, {
      params: { reportId, calcFieldId },
    });
    return response.data?.data;
  },

  deleteCalcField: async (reportId: number, calcFieldId: number): Promise<void> => {
    await apiClient.delete('/insight-statistics-calc-field-delete', { params: { reportId, calcFieldId } });
  },

  getSearchBindings: async (reportId: number): Promise<SearchBinding[]> => {
    const response = await apiClient.get<ApiResponse<{ items: SearchBinding[] }>>('/insight-statistics-search-binding-list', {
      params: { reportId },
    });
    return response.data?.data?.items ?? [];
  },

  createSearchBinding: async (reportId: number, data: SearchBindingCreateDatas): Promise<SearchBinding> => {
    const response = await apiClient.post<ApiResponse<SearchBinding>>('/insight-statistics-search-binding-create', data, { params: { reportId } });
    return response.data?.data;
  },

  deleteSearchBinding: async (reportId: number, bindId: number): Promise<void> => {
    await apiClient.delete('/insight-statistics-search-binding-delete', { params: { reportId, bindId } });
  },

  getPanels: async (reportId: number): Promise<PanelDetail[]> => {
    const response = await apiClient.get<ApiResponse<{ items: PanelDetail[] }>>('/insight-statistics-panel-list', {
      params: { reportId },
    });
    return response.data?.data?.items ?? [];
  },

  createPanel: async (reportId: number, data: PanelCreateDatas): Promise<PanelDetail> => {
    const response = await apiClient.post<ApiResponse<PanelDetail>>('/insight-statistics-panel-create', data, {
      params: { reportId },
    });
    return response.data?.data;
  },

  updatePanel: async (reportId: number, panelId: number, data: PanelCreateDatas): Promise<PanelDetail> => {
    const response = await apiClient.put<ApiResponse<PanelDetail>>('/insight-statistics-panel-update', data, {
      params: { reportId, panelId },
    });
    return response.data?.data;
  },

  deletePanel: async (reportId: number, panelId: number): Promise<void> => {
    await apiClient.delete('/insight-statistics-panel-delete', { params: { reportId, panelId } });
  },

  updatePanelLayouts: async (reportId: number, layouts: PanelLayoutUpdateItem[]): Promise<void> => {
    await apiClient.put('/insight-statistics-panel-layout-update', layouts, { params: { reportId } });
  },

  publishReport: async (reportId: number, data: PublishDatas): Promise<{ menuId: number }> => {
    const response = await apiClient.post<ApiResponse<{ menuId: number }>>('/insight-statistics-publish-on', data, { params: { reportId } });
    return response.data?.data;
  },

  unpublishReport: async (reportId: number): Promise<void> => {
    await apiClient.delete('/insight-statistics-publish-off', { params: { reportId } });
  },

  getUserFilter: async (reportId: number): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<ApiResponse<Record<string, unknown>>>('/insight-statistics-user-filter-get', { params: { reportId } });
    return response.data?.data;
  },

  saveUserFilter: async (reportId: number, data: Record<string, unknown>): Promise<void> => {
    await apiClient.put('/insight-statistics-user-filter-save', data, { params: { reportId } });
  },

  getUserLayout: async (reportId: number): Promise<PanelLayoutUpdateItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: PanelLayoutUpdateItem[] }>>('/insight-statistics-user-layout-get', { params: { reportId } });
    return response.data?.data?.items ?? [];
  },

  saveUserLayout: async (reportId: number, layouts: PanelLayoutUpdateItem[]): Promise<void> => {
    await apiClient.put('/insight-statistics-user-layout-save', layouts, { params: { reportId } });
  },
};
