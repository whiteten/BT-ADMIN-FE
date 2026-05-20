import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type {
  MaskCategoryConfig,
  MaskCategoryConfigCreateRequest,
  MaskCategoryConfigUpdateRequest,
  MaskPolicy,
  MaskPolicyCreateRequest,
  MaskPolicyUpdateRequest,
  MaskTestRequest,
  MaskTestResponse,
} from '../types/maskPolicy.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const maskPolicyApi = {
  // 카테고리 설정
  listCategories: async (tenantId?: number | null): Promise<MaskCategoryConfig[]> => {
    const params: Record<string, unknown> = tenantId != null ? { tenantId } : {};
    const response = await apiClient.get<DetailResponse<{ value: MaskCategoryConfig[] }>>('/manager-mask-categories-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  getCategory: async (configId: number): Promise<MaskCategoryConfig> => {
    const response = await apiClient.get<DetailResponse<MaskCategoryConfig>>('/manager-mask-categories-detail', { params: { configId } });
    return extractDetail(response);
  },

  createCategory: async (data: MaskCategoryConfigCreateRequest): Promise<MaskCategoryConfig> => {
    const response = await apiClient.post<DetailResponse<MaskCategoryConfig>>('/manager-mask-categories-create', data);
    return extractDetail(response);
  },

  updateCategory: async (configId: number, data: MaskCategoryConfigUpdateRequest): Promise<MaskCategoryConfig> => {
    const response = await apiClient.put<DetailResponse<MaskCategoryConfig>>('/manager-mask-categories-update', data, { params: { configId } });
    return extractDetail(response);
  },

  deleteCategory: async (configId: number): Promise<void> => {
    await apiClient.delete('/manager-mask-categories-delete', { params: { configId } });
  },

  // 패턴 정책
  listPolicies: async (category: string, tenantId?: number | null): Promise<MaskPolicy[]> => {
    const params: Record<string, unknown> = { category };
    if (tenantId != null) params.tenantId = tenantId;
    const response = await apiClient.get<DetailResponse<{ value: MaskPolicy[] }>>('/manager-mask-policies-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  getPolicy: async (policyId: number): Promise<MaskPolicy> => {
    const response = await apiClient.get<DetailResponse<MaskPolicy>>('/manager-mask-policies-detail', { params: { policyId } });
    return extractDetail(response);
  },

  createPolicy: async (data: MaskPolicyCreateRequest): Promise<MaskPolicy> => {
    const response = await apiClient.post<DetailResponse<MaskPolicy>>('/manager-mask-policies-create', data);
    return extractDetail(response);
  },

  updatePolicy: async (policyId: number, data: MaskPolicyUpdateRequest): Promise<MaskPolicy> => {
    const response = await apiClient.put<DetailResponse<MaskPolicy>>('/manager-mask-policies-update', data, { params: { policyId } });
    return extractDetail(response);
  },

  deletePolicy: async (policyId: number): Promise<void> => {
    await apiClient.delete('/manager-mask-policies-delete', { params: { policyId } });
  },

  // 테스트 도구
  test: async (data: MaskTestRequest): Promise<MaskTestResponse> => {
    const response = await apiClient.post<DetailResponse<MaskTestResponse>>('/manager-mask-test', data);
    return extractDetail(response);
  },
};
