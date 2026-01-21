import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type { PasswordPolicy, PasswordPolicyRequest } from '../types/passwordPolicy.types';

/**
 * 비밀번호 정책 API 클라이언트
 * BFF Aggregation Flow를 통해 SERVICE-MANAGER로 라우팅
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const passwordPolicyApi = {
  /**
   * 비밀번호 정책 조회 (없으면 기본값 반환)
   */
  getPolicy: async (): Promise<PasswordPolicy> => {
    const response = await apiClient.get<DetailResponse<PasswordPolicy>>('/password-policy-detail');
    return extractDetail(response);
  },

  /**
   * 비밀번호 정책 수정 (없으면 생성)
   */
  updatePolicy: async (data: PasswordPolicyRequest): Promise<PasswordPolicy> => {
    const response = await apiClient.put<DetailResponse<PasswordPolicy>>('/password-policy-update', data);
    return extractDetail(response);
  },
};
