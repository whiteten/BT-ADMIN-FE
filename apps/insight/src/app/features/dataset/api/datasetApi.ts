import ApiClient, { type ApiResponse } from '@/shared-util';
import type { DataSourceListItem, FieldMetaItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const datasetApi = {
  getDataSources: async (params?: Record<string, unknown>): Promise<DataSourceListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: DataSourceListItem[] }>>('/insight-statistics-datasource-list', { params });
    return response.data?.data?.items ?? [];
  },

  getDataSourceFields: async (datasourceKey: string): Promise<FieldMetaItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: FieldMetaItem[] }>>('/insight-statistics-datasource-fields', {
      params: { datasourceKey },
    });
    return response.data?.data?.items ?? [];
  },

  getStatConfig: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<ApiResponse<Record<string, unknown>>>('/insight-statistics-stat-config-get');
    return response.data?.data;
  },
};
