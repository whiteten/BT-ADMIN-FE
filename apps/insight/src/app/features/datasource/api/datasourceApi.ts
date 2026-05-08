import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { DataSourceItem, DataSourceRequest, SchemaLoadRequest, SchemaLoadResponse } from '../types/datasource.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 데이터소스 관리 API
 */
export const datasourceApi = {
  getList: async (params?: Record<string, unknown>): Promise<DataSourceItem[]> => {
    const response = await apiClient.get<ListResponse<DataSourceItem>>('/dashboard-datasource-list', { params });
    return extractList(response);
  },

  getDetail: async (params?: Record<string, unknown>): Promise<DataSourceItem> => {
    const response = await apiClient.get<DetailResponse<DataSourceItem>>('/dashboard-datasource-detail', { params });
    return extractDetail(response);
  },

  create: async (data: DataSourceRequest) => {
    const response = await apiClient.post('/dashboard-datasource-create', data);
    return response;
  },

  update: async ({ params, data }: { params: Record<string, unknown>; data: DataSourceRequest }) => {
    const response = await apiClient.put('/dashboard-datasource-update', data, { params });
    return response;
  },

  delete: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/dashboard-datasource-delete', { params });
    return response;
  },

  loadSchema: async (data: SchemaLoadRequest): Promise<SchemaLoadResponse> => {
    const response = await apiClient.post<DetailResponse<SchemaLoadResponse>>('/dashboard-datasource-schema-load', data);
    return extractDetail(response);
  },

  getTables: async (params?: Record<string, unknown>): Promise<string[]> => {
    const response = await apiClient.get<ListResponse<string>>('/dashboard-datasource-tables', { params });
    return extractList(response);
  },
};
