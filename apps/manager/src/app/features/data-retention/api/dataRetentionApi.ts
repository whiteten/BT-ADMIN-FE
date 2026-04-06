import ApiClient from '@/shared-util';
import type { RetentionLogListResponse, RetentionPoliciesUpdateRequest, RetentionPolicyListResponse, RetentionTargetsResponse } from '../types/dataRetention.types';

interface ApiResponse<T> {
  ok: boolean;
  code: string;
  message?: string;
  data: T;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dataRetentionApi = {
  /**
   * 보관주기 정책 목록 조회
   * BFF Flow: data-retention-policies
   */
  getPolicies: async (): Promise<RetentionPolicyListResponse> => {
    const response = await apiClient.get<ApiResponse<RetentionPolicyListResponse>>('/data-retention-policies');
    return response.data.data;
  },

  /**
   * 대상 테이블 조회
   * BFF Flow: data-retention-targets
   */
  getPolicyTargets: async (policyId: number): Promise<RetentionTargetsResponse> => {
    const response = await apiClient.get<ApiResponse<RetentionTargetsResponse>>('/data-retention-targets', { params: { policyId } });
    return response.data.data;
  },

  /**
   * 보관주기·실행시각 일괄 수정
   * BFF Flow: data-retention-update
   */
  updatePolicies: async (data: RetentionPoliciesUpdateRequest): Promise<void> => {
    await apiClient.put<ApiResponse<null>>('/data-retention-update', data);
  },

  /**
   * 즉시 삭제 실행
   * BFF Flow: data-retention-execute
   */
  executeNow: async (_?: void): Promise<void> => {
    await apiClient.post<ApiResponse<null>>('/data-retention-execute');
  },

  /**
   * 삭제 실행 이력 조회
   * BFF Flow: data-retention-logs
   */
  getLogs: async (params: { page: number; size: number }): Promise<RetentionLogListResponse> => {
    const response = await apiClient.get<ApiResponse<RetentionLogListResponse>>('/data-retention-logs', { params });
    return response.data.data;
  },
};
