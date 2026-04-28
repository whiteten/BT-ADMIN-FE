import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { ExcelImportResult } from '../../bot-config/types/intent';
import type { GlobalEnvCreateDatas, GlobalEnvDetailItem, GlobalEnvHistoryItem, GlobalEnvListItem, GlobalEnvUpdateDatas } from '../types/globalEnv.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const globalEnvApi = {
  getGlobalEnvList: async (params?: Record<string, unknown>): Promise<GlobalEnvListItem[]> => {
    const response = await apiClient.get<ListResponse<GlobalEnvListItem>>('/global-env-list', { params });
    return extractList(response);
  },
  getGlobalEnvDetail: async (params?: Record<string, unknown>): Promise<GlobalEnvDetailItem> => {
    const response = await apiClient.get<DetailResponse<GlobalEnvDetailItem>>('/global-env-detail', { params });
    return extractDetail(response);
  },
  createGlobalEnv: async (data: GlobalEnvCreateDatas) => {
    const response = await apiClient.post('/global-env-create', data);
    return response;
  },
  updateGlobalEnv: async ({ params, data }: { params: Record<string, unknown>; data: GlobalEnvUpdateDatas }) => {
    const response = await apiClient.put('/global-env-update', data, { params });
    return response;
  },
  deleteGlobalEnv: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/global-env-delete', { params });
    return response;
  },
  getGlobalEnvHistoryList: async (params?: Record<string, unknown>): Promise<GlobalEnvHistoryItem[]> => {
    const response = await apiClient.get<ListResponse<GlobalEnvHistoryItem>>('/global-env-history-list', { params });
    return extractList(response);
  },
  reapplyGlobalEnv: async ({ params, data }: { params: Record<string, unknown>; data: Record<string, unknown> }) => {
    const response = await apiClient.post('/global-env-apply', data, { params });
    return response;
  },
  exportGlobalEnv: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/global-env-excel-export', { params, responseType: 'blob' });
    return response;
  },
  importGlobalEnv: async ({ data }: { data: File }): Promise<ExcelImportResult> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<DetailResponse<ExcelImportResult>>('/global-env-excel-import', formData);
    return extractDetail(response);
  },
};
