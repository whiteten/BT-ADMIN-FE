import ApiClient, { type ApiResponse } from '@/shared-util';
import type { LookupCatalogCreateDatas, LookupCatalogItem, SchemaPreview } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 모니터링 코드 룩업 카탈로그 API — 시스템 마스터 자원.
 * 데이터셋 룩업 연결과는 별개로, ADMIN이 등록/관리하는 글로벌 카탈로그.
 */
export const lookupCatalogApi = {
  getLookupCatalogs: async (params?: Record<string, unknown>): Promise<LookupCatalogItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: LookupCatalogItem[] }>>('/insight-monitoring-lookup-catalog-list', { params });
    return response.data?.data?.items ?? [];
  },

  getLookupCatalog: async (lookupCatalogId: number): Promise<LookupCatalogItem> => {
    const response = await apiClient.get<ApiResponse<LookupCatalogItem>>('/insight-monitoring-lookup-catalog-detail', { params: { lookupCatalogId } });
    return response.data?.data;
  },

  createLookupCatalog: async (data: LookupCatalogCreateDatas): Promise<LookupCatalogItem> => {
    const response = await apiClient.post<ApiResponse<LookupCatalogItem>>('/insight-monitoring-lookup-catalog-create', data);
    return response.data?.data;
  },

  updateLookupCatalog: async (lookupCatalogId: number, data: Partial<LookupCatalogCreateDatas>): Promise<LookupCatalogItem> => {
    const response = await apiClient.put<ApiResponse<LookupCatalogItem>>('/insight-monitoring-lookup-catalog-update', data, { params: { lookupCatalogId } });
    return response.data?.data;
  },

  deleteLookupCatalog: async (lookupCatalogId: number): Promise<void> => {
    await apiClient.delete('/insight-monitoring-lookup-catalog-delete', { params: { lookupCatalogId } });
  },

  /** 등록/편집 Drawer Step 1 — 테이블명으로 DB 스키마 미리보기. SELECT 권한·컬럼·샘플 카운트 반환 */
  getSchemaPreview: async (tableName: string): Promise<SchemaPreview> => {
    const response = await apiClient.get<ApiResponse<SchemaPreview>>('/insight-monitoring-lookup-catalog-schema-preview', { params: { tableName } });
    return response.data?.data;
  },
};
