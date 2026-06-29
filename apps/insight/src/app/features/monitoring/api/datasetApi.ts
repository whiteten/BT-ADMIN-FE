import ApiClient, { type ApiResponse } from '@/shared-util';
import type { DatasetBaseType, DatasetCreateDatas, DatasetDetail, DatasetListItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

// 모니터링 데이터셋 API — baseType은 REDIS/QUERY/EXTERNAL 지원 (EXTERNAL은 미구현)
export const datasetApi = {
  getDatasets: async (params?: Record<string, unknown>): Promise<DatasetListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: DatasetListItem[] }>>('/insight-monitoring-dataset-list', { params });
    return response.data?.data?.items ?? [];
  },

  getDataset: async (datasetId: number): Promise<DatasetDetail> => {
    const response = await apiClient.get<ApiResponse<DatasetDetail>>('/insight-monitoring-dataset-detail', { params: { datasetId } });
    return response.data?.data;
  },

  createDataset: async (data: DatasetCreateDatas): Promise<DatasetDetail> => {
    const response = await apiClient.post<ApiResponse<DatasetDetail>>('/insight-monitoring-dataset-create', data);
    return response.data?.data;
  },

  updateDataset: async (datasetId: number, data: Partial<DatasetCreateDatas>): Promise<DatasetDetail> => {
    const response = await apiClient.put<ApiResponse<DatasetDetail>>('/insight-monitoring-dataset-update', data, { params: { datasetId } });
    return response.data?.data;
  },

  deleteDataset: async (datasetId: number): Promise<void> => {
    await apiClient.delete('/insight-monitoring-dataset-delete', { params: { datasetId } });
  },

  validateDataset: async (data: DatasetCreateDatas): Promise<{ ok: boolean; errors: string[]; warnings: string[] }> => {
    const response = await apiClient.post<ApiResponse<{ ok: boolean; errors: string[]; warnings: string[] }>>('/insight-monitoring-dataset-validate', data);
    return response.data?.data;
  },

  /** 위저드 Step 2 전용 — 데이터 소스(REDIS/QUERY)만 검증. 베이스별 detectedColumns 자동 추출. */
  validateDatasetSource: async (data: {
    baseType: DatasetBaseType;
    schemaSnapshot: string;
  }): Promise<{
    ok: boolean;
    errors: string[];
    warnings: string[];
    detectedColumns: { columnName: string; dataType: string; columnFormat: string; source?: string; comment?: string | null }[];
    valueMode?: 'JSON_PER_FIELD' | 'HASH_AS_ROW';
  }> => {
    const response = await apiClient.post<
      ApiResponse<{
        ok: boolean;
        errors: string[];
        warnings: string[];
        detectedColumns: { columnName: string; dataType: string; columnFormat: string; source?: string; comment?: string | null }[];
        valueMode?: 'JSON_PER_FIELD' | 'HASH_AS_ROW';
      }>
    >('/insight-monitoring-dataset-validate-source', data);
    return response.data?.data;
  },
};
