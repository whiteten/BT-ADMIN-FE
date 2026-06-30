import ApiClient, { type ApiResponse } from '@/shared-util';
import type { LookupCatalogCreateDatas, LookupCatalogItem, SchemaPreview } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const lookupApi = {
  // ─── 룩업 카탈로그 ────────────────────────────────────────────────
  // ※ 데이터셋의 룩업 정의(N개)는 데이터셋 저장에 포함됨 (datasetApi.create/update).
  getCatalog: async (params?: Record<string, unknown>): Promise<LookupCatalogItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: LookupCatalogItem[] }>>('/insight-monitoring-lookup-catalog-list', { params });
    return response.data?.data?.items ?? [];
  },

  getCatalogItem: async (lookupCatalogId: number): Promise<LookupCatalogItem> => {
    const response = await apiClient.get<ApiResponse<LookupCatalogItem>>('/insight-monitoring-lookup-catalog-detail', { params: { lookupCatalogId } });
    return response.data?.data;
  },

  createCatalogItem: async (data: LookupCatalogCreateDatas): Promise<LookupCatalogItem> => {
    const response = await apiClient.post<ApiResponse<LookupCatalogItem>>('/insight-monitoring-lookup-catalog-create', data);
    return response.data?.data;
  },

  schemaPreview: async (tableName: string): Promise<SchemaPreview> => {
    const response = await apiClient.get<ApiResponse<SchemaPreview>>('/insight-monitoring-lookup-catalog-schema-preview', { params: { table: tableName } });
    return response.data?.data;
  },
};
