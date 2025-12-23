import ApiClient, { type DetailResponse, type ListWithItemsResponse, extractDetail, extractListItems } from '@/shared-util';
import type { EntityBasicInfoUpdateDatas, EntityCreateDatas, EntityItem, EntityListItem, EntityValueListItem } from '../types/entity';
import type { IntentBasicInfoUpdateDatas, IntentCreateDatas, IntentItem, IntentListItem, IntentSentenceCreateDatas, IntentSentenceListItem } from '../types/intent';
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
  createIntent: async ({ params, data }: { params: Record<string, unknown>; data: IntentCreateDatas }) => {
    const response = await apiClient.post('/intent-create', data, { params });
    return response?.data;
  },
  updateIntent: async ({ params, data }: { params: Record<string, unknown>; data: IntentBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/intent-update', data, { params });
    return response?.data;
  },
  deleteIntent: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/intent-delete', { params });
    return response?.data;
  },
  getIntentSentences: async (params?: Record<string, unknown>): Promise<IntentSentenceListItem[]> => {
    const response = await apiClient.get<ListWithItemsResponse<IntentSentenceListItem>>('/intent-sentence-list', { params });
    return extractListItems(response?.data);
  },
  createIntentSentence: async ({ params, data }: { params: Record<string, unknown>; data: IntentSentenceCreateDatas }) => {
    const response = await apiClient.post('/intent-sentence-create', data, { params });
    return response?.data;
  },
  deleteIntentSentence: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/intent-sentence-delete', { params });
    return response?.data;
  },
  getEntities: async (params?: Record<string, unknown>): Promise<EntityListItem[]> => {
    const response = await apiClient.get<ListWithItemsResponse<EntityListItem>>('/entity-list', { params });
    return extractListItems(response?.data);
  },
  getEntity: async (params?: Record<string, unknown>): Promise<EntityItem> => {
    const response = await apiClient.get<DetailResponse<EntityItem>>('/entity-detail', { params });
    return extractDetail(response?.data);
  },
  createEntity: async ({ params, data }: { params: Record<string, unknown>; data: EntityCreateDatas }) => {
    const response = await apiClient.post('/entity-create', data, { params });
    return response?.data;
  },
  updateEntity: async ({ params, data }: { params: Record<string, unknown>; data: EntityBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/entity-update', data, { params });
    return response?.data;
  },
  deleteEntity: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/entity-delete', { params });
    return response?.data;
  },
  getEntityValues: async (params?: Record<string, unknown>): Promise<EntityValueListItem[]> => {
    const response = await apiClient.get<ListWithItemsResponse<EntityValueListItem>>('/entity-values-list', { params });
    return extractListItems(response?.data);
  },
};
