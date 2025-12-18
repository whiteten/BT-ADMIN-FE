import ApiClient, { type DetailResponse, type ListWithItemsResponse, extractDetail, extractListItems } from '@/shared-util';
import type { IntentItem, IntentListItem } from '../types/intent';
import type { ModelBasicInfoUpdateDatas, ModelCreateDatas, ModelItem, ModelListItem } from '../types/model';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const modelApi = {
  getModels: async (params?: Record<string, unknown>): Promise<ModelListItem[]> => {
    const response = await apiClient.get<ListWithItemsResponse<ModelListItem>>('/model-list', { params });
    return extractListItems(response?.data);
  },
  getModel: async (params?: Record<string, unknown>): Promise<ModelItem> => {
    const response = await apiClient.get<DetailResponse<ModelItem>>('/model-detail', { params });
    return extractDetail(response?.data);
  },
  createModel: async (data: ModelCreateDatas) => {
    const response = await apiClient.post('/model-create', data);
    return response?.data;
  },
  updateModel: async ({ params, data }: { params: Record<string, unknown>; data: ModelBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/model-update', data, { params });
    return response?.data;
  },
  deleteModel: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/model-delete', { params });
    return response?.data;
  },
  getIntents: async (params?: Record<string, unknown>): Promise<IntentListItem[]> => {
    const response = await apiClient.get<ListWithItemsResponse<IntentListItem>>('/intent-list', { params });
    return extractListItems(response?.data);
  },
  getIntent: async (params?: Record<string, unknown>): Promise<IntentItem> => {
    const response = await apiClient.get<DetailResponse<IntentItem>>('/intent-detail', { params });
    return extractDetail(response?.data);
  },
};
