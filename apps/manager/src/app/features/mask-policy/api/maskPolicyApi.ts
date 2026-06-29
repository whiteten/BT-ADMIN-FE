import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  MaskCategoryConfig,
  MaskCategoryConfigCreateRequest,
  MaskCategoryConfigUpdateRequest,
  MaskPolicy,
  MaskPolicyCreateRequest,
  MaskPolicyUpdateRequest,
  MaskTestRequest,
  MaskTestResponse,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const maskPolicyApi = {
  // 카테고리 설정
  listCategories: async (tenantId?: number | null): Promise<MaskCategoryConfig[]> => {
    const params: Record<string, unknown> = tenantId != null ? { tenantId } : {};
    const response = await apiClient.get<ApiResponse<{ value: MaskCategoryConfig[] }>>('/manager-mask-categories-list', { params });
    return response.data?.data?.value ?? [];
  },

  getCategory: async (configId: number): Promise<MaskCategoryConfig> => {
    const response = await apiClient.get<ApiResponse<MaskCategoryConfig>>('/manager-mask-categories-detail', { params: { configId } });
    return response.data?.data;
  },

  createCategory: async (data: MaskCategoryConfigCreateRequest): Promise<MaskCategoryConfig> => {
    const response = await apiClient.post<ApiResponse<MaskCategoryConfig>>('/manager-mask-categories-create', data);
    return response.data?.data;
  },

  updateCategory: async (configId: number, data: MaskCategoryConfigUpdateRequest): Promise<MaskCategoryConfig> => {
    const response = await apiClient.put<ApiResponse<MaskCategoryConfig>>('/manager-mask-categories-update', data, { params: { configId } });
    return response.data?.data;
  },

  deleteCategory: async (configId: number): Promise<void> => {
    await apiClient.delete('/manager-mask-categories-delete', { params: { configId } });
  },

  // 패턴 정책
  listPolicies: async (category: string, tenantId?: number | null): Promise<MaskPolicy[]> => {
    const params: Record<string, unknown> = { category };
    if (tenantId != null) params.tenantId = tenantId;
    const response = await apiClient.get<ApiResponse<{ value: MaskPolicy[] }>>('/manager-mask-policies-list', { params });
    return response.data?.data?.value ?? [];
  },

  getPolicy: async (policyId: number): Promise<MaskPolicy> => {
    const response = await apiClient.get<ApiResponse<MaskPolicy>>('/manager-mask-policies-detail', { params: { policyId } });
    return response.data?.data;
  },

  createPolicy: async (data: MaskPolicyCreateRequest): Promise<MaskPolicy> => {
    const response = await apiClient.post<ApiResponse<MaskPolicy>>('/manager-mask-policies-create', data);
    return response.data?.data;
  },

  updatePolicy: async (policyId: number, data: MaskPolicyUpdateRequest): Promise<MaskPolicy> => {
    const response = await apiClient.put<ApiResponse<MaskPolicy>>('/manager-mask-policies-update', data, { params: { policyId } });
    return response.data?.data;
  },

  deletePolicy: async (policyId: number): Promise<void> => {
    await apiClient.delete('/manager-mask-policies-delete', { params: { policyId } });
  },

  /**
   * v1.3: 정책을 특정 테넌트로 복사 (테넌트별 override 생성).
   * 글로벌 정책 → 테넌트 또는 한 테넌트 → 다른 테넌트.
   */
  copyPolicyToTenant: async (policyId: number, targetTenantId: number): Promise<MaskPolicy> => {
    const response = await apiClient.post<ApiResponse<MaskPolicy>>('/manager-mask-policy-copy-to-tenant', undefined, { params: { policyId, targetTenantId } });
    return response.data?.data;
  },

  // 테스트 도구
  test: async (data: MaskTestRequest): Promise<MaskTestResponse> => {
    const response = await apiClient.post<ApiResponse<MaskTestResponse>>('/manager-mask-test', data);
    return response.data?.data;
  },
};
