import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  DataSourceListItem,
  DatasetCreateRequest,
  DatasetDetail,
  DatasetListItem,
  DatasetUpdateRequest,
  FieldMetaItem,
  PrefixCandidate,
  ValidateFieldsRequest,
  ValidateFieldsResult,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const datasetApi = {
  // ─── datasource (레거시 read) ─────────────────────────────────────────────

  getDataSources: async (params?: Record<string, unknown>): Promise<DataSourceListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: DataSourceListItem[] }>>('/insight-statistics-datasource-list', { params });
    return response.data?.data?.items ?? [];
  },

  getDataSourceFields: async (datasetId: number): Promise<FieldMetaItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: FieldMetaItem[] }>>('/insight-statistics-datasource-fields', {
      params: { datasetId },
    });
    return response.data?.data?.items ?? [];
  },

  getStatConfig: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<ApiResponse<Record<string, unknown>>>('/insight-statistics-stat-config-get');
    return response.data?.data;
  },

  // ─── Dataset v5.0 CRUD ────────────────────────────────────────────────────

  getDatasets: async (params?: Record<string, unknown>): Promise<DatasetListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: DatasetListItem[] }>>('/insight-statistics-datasource-list', { params });
    return (response.data?.data?.items ?? []) as DatasetListItem[];
  },

  getDataset: async (datasetId: number): Promise<DatasetDetail> => {
    const response = await apiClient.get<ApiResponse<DatasetDetail>>('/insight-statistics-datasource-detail', {
      params: { datasetId },
    });
    return response.data?.data;
  },

  createDataset: async (data: DatasetCreateRequest): Promise<DatasetDetail> => {
    const response = await apiClient.post<ApiResponse<DatasetDetail>>('/insight-statistics-datasource-create', data);
    return response.data?.data;
  },

  updateDataset: async (datasetId: number, data: DatasetUpdateRequest): Promise<DatasetDetail> => {
    const response = await apiClient.put<ApiResponse<DatasetDetail>>('/insight-statistics-datasource-update', data, {
      params: { datasetId },
    });
    return response.data?.data;
  },

  deleteDataset: async (datasetId: number): Promise<void> => {
    await apiClient.delete('/insight-statistics-datasource-delete', { params: { datasetId } });
  },

  getSchemaPreview: async (dbViewPrefix: string): Promise<FieldMetaItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: FieldMetaItem[] }>>('/insight-statistics-datasource-schema-preview', {
      params: { dbViewPrefix },
    });
    return response.data?.data?.value ?? [];
  },

  getCandidates: async (): Promise<PrefixCandidate[]> => {
    const response = await apiClient.get<ApiResponse<{ value: PrefixCandidate[] }>>('/insight-statistics-datasource-candidates');
    return response.data?.data?.value ?? [];
  },

  validateFields: async (data: ValidateFieldsRequest): Promise<ValidateFieldsResult> => {
    const response = await apiClient.post<ApiResponse<ValidateFieldsResult>>('/insight-statistics-datasource-validate-fields', data);
    return response.data?.data;
  },
};
