import ApiClient, { type ApiResponse } from '@/shared-util';
import type { ExcelImportResult, SttDnCreateData, SttDnDeleteParams, SttDnItem, SttDnSearchParams, SttDnUpdateData } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dnApi = {
  getSttDnList: async (params?: SttDnSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: SttDnItem[] }>>('/stt-dn-list', { params });
    return response.data?.data?.items ?? [];
  },
  createSttDn: async (data: SttDnCreateData) => {
    return apiClient.post('/stt-dn-create', data);
  },
  updateSttDn: async (data: SttDnUpdateData) => {
    return apiClient.put('/stt-dn-update', data);
  },
  deleteSttDn: async (params: SttDnDeleteParams) => {
    return apiClient.delete('/stt-dn-delete', { params });
  },
  importSttDn: async ({ hostName, data }: { hostName: string; data: File }): Promise<ExcelImportResult> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<ApiResponse<ExcelImportResult>>('/stt-dn-excel-import', formData, { params: { hostName } });
    return response.data?.data;
  },
  exportSttDn: async () => {
    return await apiClient.get<Blob>('/stt-dn-excel-export', {
      responseType: 'blob',
    });
  },
};
