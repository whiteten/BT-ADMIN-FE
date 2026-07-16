/**
 * IVR DNIS API 클라이언트 — AS-IS IPR20S6030.
 *
 * BFF Flow:
 *   - ivr-dnis-list          GET
 *   - ivr-dnis-detail        GET
 *   - ivr-dnis-dup-check     GET
 *   - ivr-dnis-create        POST
 *   - ivr-dnis-update        PUT
 *   - ivr-dnis-delete        DELETE
 *   - ivr-dnis-excel-import  POST
 *   - ivr-dnis-batch-copy    POST
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { DnisBatchCopyRequest, DnisBatchCopyResult, DnisCreateRequest, DnisExcelImportResult, DnisItem, DnisUpdateRequest } from '../types/dnis.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dnisApi = {
  getDnisList: async (params: { nodeId: number; dnisNo?: string }): Promise<DnisItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DnisItem[] }>>('/ivr-dnis-list', { params });
    return response.data?.data?.value ?? [];
  },

  getDnis: async (params: { dnisNo: string; nodeId: number }): Promise<DnisItem> => {
    const response = await apiClient.get<ApiResponse<DnisItem>>('/ivr-dnis-detail', { params });
    return response.data?.data;
  },

  checkDuplicate: async (params: { nodeId: number; dnisNo: string }): Promise<boolean> => {
    const response = await apiClient.get<ApiResponse<{ duplicated: boolean }>>('/ivr-dnis-dup-check', { params });
    return response.data?.data?.duplicated ?? false;
  },

  createDnis: async (data: DnisCreateRequest): Promise<DnisItem> => {
    const response = await apiClient.post<ApiResponse<DnisItem>>('/ivr-dnis-create', data);
    return response.data?.data;
  },

  updateDnis: async ({ params, data }: { params: { dnisNo: string; nodeId: number }; data: DnisUpdateRequest }): Promise<DnisItem> => {
    const response = await apiClient.put<ApiResponse<DnisItem>>('/ivr-dnis-update', data, { params });
    return response.data?.data;
  },

  deleteDnis: async (params: { dnisNo: string; serviceId: number; nodeId: number }): Promise<void> => {
    await apiClient.delete<ApiResponse<unknown>>('/ivr-dnis-delete', { params });
  },

  excelImport: async (rows: DnisCreateRequest[]): Promise<DnisExcelImportResult> => {
    const response = await apiClient.post<ApiResponse<DnisExcelImportResult>>('/ivr-dnis-excel-import', rows);
    return response.data?.data;
  },

  batchCopy: async (data: DnisBatchCopyRequest): Promise<DnisBatchCopyResult> => {
    const response = await apiClient.post<ApiResponse<DnisBatchCopyResult>>('/ivr-dnis-batch-copy', data);
    return response.data?.data;
  },
};
