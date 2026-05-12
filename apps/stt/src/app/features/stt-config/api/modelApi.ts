import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type {
  RecogResultListData,
  RecogResultRequestData,
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
    const response = await apiClient.get<ListResponse<SttModelItem>>('/stt-model-list', { params });
    return extractList(response);
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
    const response = await apiClient.get<DetailResponse<RecogResultListData>>('/stt-recog-result-list', { params });
    return extractDetail(response);
  },
  requestRecogResult: async (data: RecogResultRequestData) => {
    return apiClient.post('/stt-request-recog-result', data);
  },
  getSttModelDeployList: async (params?: SttModelDeploySearchParams) => {
    const response = await apiClient.get<ListResponse<SttModelDeployItem>>('/stt-model-deploy-list', { params });
    return extractList(response);
  },
  deployModel: async (data: SttModelDeployCreateData) => {
    return apiClient.post('/stt-model-deploy-create', data);
  },
};
