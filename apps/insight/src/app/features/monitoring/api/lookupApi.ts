import ApiClient, { type ApiResponse } from '@/shared-util';
import type { DatasetLookup, LookupCatalogCreateDatas, LookupCatalogItem, SchemaPreview } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const lookupApi = {
  // ─── 룩업 카탈로그 ────────────────────────────────────────────────
  getCatalog: async (params?: Record<string, unknown>): Promise<LookupCatalogItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: LookupCatalogItem[] }>>('/lookup-catalog-list', { params });
    return response.data?.data?.items ?? [];
  },

  getCatalogItem: async (lookupCatalogId: number): Promise<LookupCatalogItem> => {
    const response = await apiClient.get<ApiResponse<LookupCatalogItem>>('/lookup-catalog-detail', { params: { lookupCatalogId } });
    return response.data?.data;
  },

  createCatalogItem: async (data: LookupCatalogCreateDatas): Promise<LookupCatalogItem> => {
    const response = await apiClient.post<ApiResponse<LookupCatalogItem>>('/lookup-catalog-create', data);
    return response.data?.data;
  },

  schemaPreview: async (tableName: string): Promise<SchemaPreview> => {
    const response = await apiClient.get<ApiResponse<SchemaPreview>>('/lookup-catalog-schema-preview', { params: { table: tableName } });
    return response.data?.data;
  },

  // ─── 데이터셋의 룩업 정의 ───────────────────────────────────────────
  getDatasetLookups: async (datasetId: number): Promise<DatasetLookup[]> => {
    const response = await apiClient.get<ApiResponse<{ items: DatasetLookup[] }>>('/dataset-lookup-list', { params: { datasetId } });
    return response.data?.data?.items ?? [];
  },

  createDatasetLookup: async (datasetId: number, data: Omit<DatasetLookup, 'lookupId'>): Promise<DatasetLookup> => {
    const response = await apiClient.post<ApiResponse<DatasetLookup>>('/dataset-lookup-create', data, { params: { datasetId } });
    return response.data?.data;
  },

  updateDatasetLookup: async (datasetId: number, lookupId: number, data: Partial<DatasetLookup>): Promise<DatasetLookup> => {
    const response = await apiClient.put<ApiResponse<DatasetLookup>>('/dataset-lookup-update', data, { params: { datasetId, lookupId } });
    return response.data?.data;
  },

  deleteDatasetLookup: async (datasetId: number, lookupId: number): Promise<void> => {
    await apiClient.delete('/dataset-lookup-delete', { params: { datasetId, lookupId } });
  },
};
