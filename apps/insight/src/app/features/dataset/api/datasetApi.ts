import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { DataSourceListItem, FieldMetaItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const datasetApi = {
  getDataSources: async (params?: Record<string, unknown>): Promise<DataSourceListItem[]> => {
    const response = await apiClient.get<ListResponse<DataSourceListItem>>('/insight-statistics-datasource-list', { params });
    return extractList(response);
  },

  getDataSourceFields: async (datasourceKey: string): Promise<FieldMetaItem[]> => {
    const response = await apiClient.get<ListResponse<FieldMetaItem>>('/insight-statistics-datasource-fields', {
      params: { datasourceKey },
    });
    return extractList(response);
  },

  getStatConfig: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<DetailResponse<Record<string, unknown>>>('/insight-statistics-stat-config-get');
    return extractDetail(response);
  },
};
