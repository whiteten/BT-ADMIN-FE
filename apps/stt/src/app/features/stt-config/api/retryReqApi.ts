import ApiClient, { type ApiResponse } from '@/shared-util';
import type { RetryReqListItem, RetryReqSearchParams, RetryReqTreeItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const retryReqApi = {
  getRetryReqTree: async () => {
    const response = await apiClient.get<ApiResponse<{ items: RetryReqTreeItem[] }>>('/stt-retry-req-tree');
    return response.data?.data?.items ?? [];
  },
  getRetryReqList: async (params: RetryReqSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: RetryReqListItem[] }>>('/stt-retry-req-list', { params });
    return response.data?.data?.items ?? [];
  },
};
