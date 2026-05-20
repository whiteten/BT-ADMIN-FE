import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { ModelCreateRequest, ModelDetailItem, ModelItem, ModelListItem, ModelUpdateRequest, ModelValidateRequest, ModelValidateResponseData } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const modelApi = {
  getModels: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ListResponse<ModelListItem>>('/aoe-model-list', { params });
    return extractList(response);
  },
  validateModel: async (body: ModelValidateRequest) => {
    const response = await apiClient.post<DetailResponse<ModelValidateResponseData>>('/aoe-model-validate', body);
    const result = extractDetail(response);
    if (result?.statusCode === 'FAIL') {
      throw new Error(result.message);
    }
    return result?.data ?? [];
  },
  createModel: async (body: ModelCreateRequest) => {
    const response = await apiClient.post<DetailResponse<unknown>>('/aoe-model-create', body);
    return extractDetail(response);
  },
  getModel: async (params: { modelId: string }) => {
    const response = await apiClient.get<DetailResponse<ModelItem>>('/aoe-model-detail', { params });
    return extractDetail(response);
  },
  deleteModel: async ({ modelId }: { modelId: string }) => {
    const response = await apiClient.delete<DetailResponse<unknown>>('/aoe-model-delete', { params: { modelId } });
    return extractDetail(response);
  },
  updateModel: async ({ modelId, ...body }: { modelId: string } & ModelUpdateRequest) => {
    const response = await apiClient.put<DetailResponse<unknown>>('/aoe-model-update', body, { params: { modelId } });
    return extractDetail(response);
  },
  getModelDetails: async (params: { modelId: string }) => {
    const response = await apiClient.get<ListResponse<ModelDetailItem>>('/aoe-model-detail-list', { params });
    return extractList(response);
  },
  updateModelDetail: async ({ detailId, ...body }: { detailId: string; data: { useYn: 0 | 1; costPerInputToken?: number; costPerOutputToken?: number } }) => {
    const response = await apiClient.put<DetailResponse<unknown>>('/aoe-model-detail-update', body.data, { params: { detailId } });
    return extractDetail(response);
  },
};
