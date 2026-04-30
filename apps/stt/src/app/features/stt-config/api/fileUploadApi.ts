import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { FileUploadItem, FileUploadSearchParams } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const fileUploadApi = {
  getFileUploadList: async (params?: FileUploadSearchParams) => {
    const response = await apiClient.get<ListResponse<FileUploadItem>>('/stt-file-upload-list', { params });
    return extractList(response);
  },
  deleteFileUpload: async (ucidGkey: string) => {
    return apiClient.delete('/stt-file-upload-delete', { params: { ucidGkey } });
  },
  requestStt: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return apiClient.post('/stt-file-request', formData);
  },
};
