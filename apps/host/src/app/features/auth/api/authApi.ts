import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type { LoginRequestDatas, LoginResponse, PasswordPolicy } from '../types/auth';

const apiClient = new ApiClient({ serviceURL: '/auth' });
const bffClient = new ApiClient({ serviceURL: '/bff' });

export const authApi = {
  getCsrfToken: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get('/csrf', { params });
    return response.data;
  },
  login: async (data: LoginRequestDatas): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/login', data);
    return response.data;
  },
  logout: async () => {
    const response = await apiClient.post('/logout');
    return response.data;
  },
  getUserInfo: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get('/me', { params });
    return response.data;
  },
  /**
   * 자신의 비밀번호 변경
   */
  changeMyPassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await apiClient.put('/change-password', data);
    return response.data;
  },

  /**
   * 비밀번호 정책 조회
   */
  getPasswordPolicy: async (): Promise<PasswordPolicy> => {
    const response = await bffClient.get<DetailResponse<PasswordPolicy>>('/password-policy-detail');
    return extractDetail(response);
  },
};
