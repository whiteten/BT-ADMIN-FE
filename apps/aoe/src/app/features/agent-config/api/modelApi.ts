import ApiClient, { type ApiResponse } from '@/shared-util';
import type { ModelCreateRequest, ModelDetailItem, ModelItem, ModelListItem, ModelUpdateRequest, ModelValidateRequest, ModelValidateResponseData } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const modelApi = {
  getModels: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<{ items: ModelListItem[] }>>('/aoe-model-list', { params });
    return response.data?.data?.items ?? [];
  },
  validateModel: async (body: ModelValidateRequest) => {
    const response = await apiClient.post<ApiResponse<ModelValidateResponseData>>('/aoe-model-validate', body);
    const result = response.data?.data;
    if (result?.statusCode === 'FAIL') {
      throw new Error(result.message);
    }
    return result?.data ?? [];
  },
  createModel: async (body: ModelCreateRequest) => {
    const response = await apiClient.post<ApiResponse<unknown>>('/aoe-model-create', body);
    return response.data?.data;
  },
  getModel: async (params: { modelId: string }) => {
    const response = await apiClient.get<ApiResponse<ModelItem>>('/aoe-model-detail', { params });
    return response.data?.data;
  },
  deleteModel: async ({ modelId }: { modelId: string }) => {
    const response = await apiClient.delete<ApiResponse<unknown>>('/aoe-model-delete', { params: { modelId } });
    return response.data?.data;
  },
  updateModel: async ({ modelId, ...body }: { modelId: string } & ModelUpdateRequest) => {
    const response = await apiClient.put<ApiResponse<unknown>>('/aoe-model-update', body, { params: { modelId } });
    return response.data?.data;
  },
  getModelDetails: async (params: { modelId: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: ModelDetailItem[] }>>('/aoe-model-detail-list', { params });
    return response.data?.data?.items ?? [];
  },
  updateModelDetail: async ({ detailId, ...body }: { detailId: string; data: { useYn: 0 | 1; costPerInputToken?: number; costPerOutputToken?: number } }) => {
    const response = await apiClient.put<ApiResponse<unknown>>('/aoe-model-detail-update', body.data, { params: { detailId } });
    return response.data?.data;
  },
};
