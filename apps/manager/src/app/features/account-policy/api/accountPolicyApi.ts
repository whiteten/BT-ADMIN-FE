import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type { AccountPolicy, AccountPolicyUpdateData } from '../types/accountPolicy.types';

/**
 * 계정 보안 정책 API 클라이언트
 * BFF Aggregation Flow를 통해 SERVICE-MANAGER로 라우팅
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const accountPolicyApi = {
  /**
   * 계정 보안 정책 조회 (없으면 기본값 반환)
   */
  getPolicy: async (params?: Record<string, unknown>): Promise<AccountPolicy> => {
    const response = await apiClient.get<DetailResponse<AccountPolicy>>('/account-policy-detail', { params });
    return extractDetail(response);
  },

  /**
   * 계정 보안 정책 수정 (없으면 생성)
   */
  updatePolicy: async (data: AccountPolicyUpdateData): Promise<AccountPolicy> => {
    const response = await apiClient.put<DetailResponse<AccountPolicy>>('/account-policy-update', data);
    return extractDetail(response);
  },
};
