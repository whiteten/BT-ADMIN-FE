import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { DataSourceItem, DataSourceRequest, PrefixCandidate, SchemaLoadRequest, SchemaLoadResponse } from '../types/datasource.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 데이터소스 관리 API (v3.1)
 */
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
    const response = await apiClient.post('/insight-datasource-create', data);
    return response;
  },

  update: async ({ params, data }: { params: Record<string, unknown>; data: DataSourceRequest }) => {
    const response = await apiClient.put('/insight-datasource-update', data, { params });
    return response;
  },

  delete: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/insight-datasource-delete', { params });
    return response;
  },

  loadSchema: async (data: SchemaLoadRequest): Promise<SchemaLoadResponse> => {
    const response = await apiClient.post<DetailResponse<SchemaLoadResponse>>('/insight-datasource-schema-load', data);
    return extractDetail(response);
  },

  /** v3.1: 가용 프리픽스 후보 조회 (구 getTables 대체) */
  getCandidates: async (params?: Record<string, unknown>): Promise<PrefixCandidate[]> => {
    const response = await apiClient.get<ListResponse<PrefixCandidate>>('/insight-datasource-candidates', { params });
    return extractList(response);
  },
};
