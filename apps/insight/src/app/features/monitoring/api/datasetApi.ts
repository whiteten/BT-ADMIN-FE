import ApiClient, { type ApiResponse } from '@/shared-util';
import type { DatasetCreateDatas, DatasetDetail, DatasetListItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

// 모니터링 데이터셋 API — baseType은 XML/SQL 둘 다 지원 (M5)
export const datasetApi = {
  getDatasets: async (params?: Record<string, unknown>): Promise<DatasetListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: DatasetListItem[] }>>('/dataset-list', { params });
    return response.data?.data?.items ?? [];
  },

  getDataset: async (datasetId: number): Promise<DatasetDetail> => {
    const response = await apiClient.get<ApiResponse<DatasetDetail>>('/dataset-detail', { params: { datasetId } });
    return response.data?.data;
  },

  createDataset: async (data: DatasetCreateDatas): Promise<DatasetDetail> => {
    const response = await apiClient.post<ApiResponse<DatasetDetail>>('/dataset-create', data);
    return response.data?.data;
  },

  updateDataset: async (datasetId: number, data: Partial<DatasetCreateDatas>): Promise<DatasetDetail> => {
    const response = await apiClient.put<ApiResponse<DatasetDetail>>('/dataset-update', data, { params: { datasetId } });
    return response.data?.data;
  },

  deleteDataset: async (datasetId: number): Promise<void> => {
    await apiClient.delete('/dataset-delete', { params: { datasetId } });
  },

  validateDataset: async (data: DatasetCreateDatas): Promise<{ ok: boolean; errors: string[]; warnings: string[] }> => {
    const response = await apiClient.post<ApiResponse<{ ok: boolean; errors: string[]; warnings: string[] }>>('/dataset-validate', data);
    return response.data?.data;
  },

  /** 위저드 Step 2 전용 — 데이터 소스(XML/SQL)만 검증. SQL 베이스는 LIMIT 1 dry-run + 컬럼 자동 추출. */
  validateDatasetSource: async (data: {
    baseType: 'XML' | 'SQL';
    schemaSnapshot: string;
  }): Promise<{
    ok: boolean;
    errors: string[];
    warnings: string[];
    detectedColumns: { columnName: string; dataType: string; columnFormat: string }[];
  }> => {
    const response = await apiClient.post<
      ApiResponse<{
        ok: boolean;
        errors: string[];
        warnings: string[];
        detectedColumns: { columnName: string; dataType: string; columnFormat: string }[];
      }>
    >('/dataset-validate-source', data);
    return response.data?.data;
  },
};
