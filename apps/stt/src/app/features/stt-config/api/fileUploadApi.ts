import ApiClient, { type ApiResponse } from '@/shared-util';
import type { FileUploadItem, FileUploadSearchParams } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const fileUploadApi = {
  getFileUploadList: async (params?: FileUploadSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: FileUploadItem[] }>>('/stt-file-upload-list', { params });
    return response.data?.data?.items ?? [];
  },
  deleteFileUpload: async ({ tenantId, ucidGkey }: { tenantId: number; ucidGkey: string }) => {
    return apiClient.delete('/stt-file-upload-delete', { params: { tenantId, ucidGkey } });
  },
  uploadSttFile: async (file: File, menuId: string) => {
    const formData = new FormData();
    formData.append('uploadFile', file);
    formData.append('menuId', menuId);
    const response = await apiClient.post<ApiResponse<{ uploadedFilename: string; uploadPath: string }>>('/stt-file-upload', formData);
    return response.data.data;
  },
  requestStt: async (files: { fileName: string; filePath: string }[]) => {
    return apiClient.post('/stt-file-request', { files });
  },
  exportFileUploadExcel: async (data: { ucidGkeys: string[] }) => {
    return await apiClient.post<Blob>('/stt-file-upload-excel', data, { responseType: 'blob' });
  },
};
