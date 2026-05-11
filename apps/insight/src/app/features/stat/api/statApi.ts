import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { ConditionRequest, OptionItem, SearchConditionItem } from '../types/condition';
import type { DataSourceItem, DataSourceRequest, PrefixCandidate, SchemaLoadRequest, SchemaLoadResponse } from '../types/datasource';
import type { FormulaValidateRequest, FormulaValidateResponse, WidgetItem, WidgetRequest } from '../types/widget';

const apiClient = new ApiClient({ serviceURL: '/bff' });

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
    return apiClient.post('/insight-stat-widget-create', data);
  },

  update: async ({ params, data }: { params: Record<string, unknown>; data: WidgetRequest }) => {
    return apiClient.put('/insight-stat-widget-update', data, { params });
  },

  delete: async (params: Record<string, unknown>) => {
    return apiClient.delete('/insight-stat-widget-delete', { params });
  },

  validateFormula: async (data: FormulaValidateRequest): Promise<FormulaValidateResponse> => {
    const response = await apiClient.post<DetailResponse<FormulaValidateResponse>>('/insight-stat-widget-formula-validate', data);
    return extractDetail(response);
  },
};

export const datasourceApi = {
  getList: async (params?: Record<string, unknown>): Promise<DataSourceItem[]> => {
    const response = await apiClient.get<ListResponse<DataSourceItem>>('/insight-datasource-list', { params });
    return extractList(response);
  },

  getDetail: async (params?: Record<string, unknown>): Promise<DataSourceItem> => {
    const response = await apiClient.get<DetailResponse<DataSourceItem>>('/insight-datasource-detail', { params });
    return extractDetail(response);
  },

  create: async (data: DataSourceRequest) => {
    return apiClient.post('/insight-datasource-create', data);
  },

  update: async ({ params, data }: { params: Record<string, unknown>; data: DataSourceRequest }) => {
    return apiClient.put('/insight-datasource-update', data, { params });
  },

  delete: async (params: Record<string, unknown>) => {
    return apiClient.delete('/insight-datasource-delete', { params });
  },

  loadSchema: async (data: SchemaLoadRequest): Promise<SchemaLoadResponse> => {
    const response = await apiClient.post<DetailResponse<SchemaLoadResponse>>('/insight-datasource-schema-load', data);
    return extractDetail(response);
  },

  getCandidates: async (params?: Record<string, unknown>): Promise<PrefixCandidate[]> => {
    const response = await apiClient.get<ListResponse<PrefixCandidate>>('/insight-datasource-candidates', { params });
    return extractList(response);
  },
};

export const conditionApi = {
  getList: async (params?: Record<string, unknown>): Promise<SearchConditionItem[]> => {
    const response = await apiClient.get<ListResponse<SearchConditionItem>>('/insight-condition-list', { params });
    return extractList(response);
  },

  getDetail: async (params?: Record<string, unknown>): Promise<SearchConditionItem> => {
    const response = await apiClient.get<DetailResponse<SearchConditionItem>>('/insight-condition-detail', { params });
    return extractDetail(response);
  },

  create: async (data: ConditionRequest) => {
    return apiClient.post('/insight-condition-create', data);
  },

  update: async ({ params, data }: { params: Record<string, unknown>; data: ConditionRequest }) => {
    return apiClient.put('/insight-condition-update', data, { params });
  },

  delete: async (params: Record<string, unknown>) => {
    return apiClient.delete('/insight-condition-delete', { params });
  },

  getOptions: async (conditionId: number, parentValue?: string | number): Promise<OptionItem[]> => {
    const params: Record<string, unknown> = { conditionId };
    if (parentValue !== undefined && parentValue !== null) params.parentValue = parentValue;
    const response = await apiClient.get<ListResponse<OptionItem>>('/insight-condition-options', { params });
    return extractList(response);
  },
};
