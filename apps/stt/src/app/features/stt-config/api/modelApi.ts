import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  RecogEvaluateRequestData,
  RecogResultListData,
  RecogResultSearchParams,
  SttModelCreateData,
  SttModelDeployCreateData,
  SttModelDeployItem,
  SttModelDeploySearchParams,
  SttModelItem,
  SttModelSearchParams,
  SttModelUpdateData,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const modelApi = {
  getSttModelList: async (params?: SttModelSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: SttModelItem[] }>>('/stt-model-list', { params });
    return response.data?.data?.items ?? [];
  },
  createSttModel: async (data: SttModelCreateData) => {
    return apiClient.post('/stt-model-create', data);
  },
  updateSttModel: async (data: SttModelUpdateData) => {
    return apiClient.put(
      '/stt-model-update',
      { engineCode: data.engineCode, modelVerName: data.modelVerName, modelDesc: data.modelDesc },
      { params: { modelVerId: data.modelVerId } },
    );
  },
  deleteSttModel: async (modelVerId: string) => {
    return apiClient.delete('/stt-model-delete', { params: { modelVerId } });
  },
  getRecogResultList: async (params: RecogResultSearchParams) => {
    const response = await apiClient.get<ApiResponse<RecogResultListData>>('/stt-recog-result-list', { params });
    return response.data?.data;
  },
  executeRecogEvaluate: async (data: RecogEvaluateRequestData) => {
    return apiClient.post('/stt-recog-evaluate', data);
  },
  getSttModelDeployList: async (params?: SttModelDeploySearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: SttModelDeployItem[] }>>('/stt-model-deploy-list', { params });
    return response.data?.data?.items ?? [];
  },
  deployModel: async (data: SttModelDeployCreateData) => {
    return apiClient.post('/stt-model-deploy-create', data);
  },
};
