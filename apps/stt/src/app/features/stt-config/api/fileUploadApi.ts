import ApiClient, { type ApiResponse } from '@/shared-util';
import type { FileUploadItem, FileUploadSearchParams } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const fileUploadApi = {
  getFileUploadList: async (params?: FileUploadSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: FileUploadItem[] }>>('/stt-file-upload-list', { params });
    return response.data?.data?.items ?? [];
  },
  deleteFileUpload: async (ucidGkey: string) => {
    return apiClient.delete('/stt-file-upload-delete', { params: { ucidGkey } });
  },
  uploadSttFile: async (file: File, menuId: string) => {
    const formData = new FormData();
    formData.append('uploadFile', file);
    formData.append('menuId', menuId);
    const response = await apiClient.post<{ uploadedFilename: string }>('/stt-file-upload', formData);
    return response.data.uploadedFilename;
  },
  requestStt: async (fileNames: string[]) => {
    return apiClient.post('/stt-file-request', { fileNames });
  },
};
