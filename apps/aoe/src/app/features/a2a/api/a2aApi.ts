import ApiClient, { type ApiResponse } from '@/shared-util';
import type { A2ACreateDatas, A2AItem, A2AUpdateDatas } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const a2aApi = {
  getA2AList: async () => {
    const response = await apiClient.get<ApiResponse<{ items: A2AItem[] }>>('/aoe-a2a-list');
    return response.data?.data?.items ?? [];
  },
  getA2A: async (params: { a2aId: string }) => {
    const response = await apiClient.get<ApiResponse<A2AItem>>('/aoe-a2a-detail', { params });
    return response.data?.data;
  },
  createA2A: async (data: A2ACreateDatas) => {
    await apiClient.post('/aoe-a2a-create', data);
  },
  updateA2A: async ({ params, data }: { params: { a2aId: string }; data: A2AUpdateDatas }) => {
    await apiClient.put('/aoe-a2a-update', data, { params });
  },
  deleteA2A: async (params: { a2aId: string }) => {
    await apiClient.delete('/aoe-a2a-delete', { params });
  },
};
