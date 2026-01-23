import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type { LoginRequestDatas, LoginResponse, UserInfoResponse } from '../types/auth';

const authClient = new ApiClient({ serviceURL: '/auth' });

export const authApi = {
  getCsrfToken: async (params?: Record<string, unknown>) => {
    const response = await authClient.get('/csrf', { params });
    return response.data;
  },
  login: async (data: LoginRequestDatas): Promise<LoginResponse> => {
    const response = await authClient.post<LoginResponse>('/login', data);
    return response.data;
  },
  logout: async () => {
    const response = await authClient.post('/logout');
    return response.data;
  },
  getUserInfo: async (params?: Record<string, unknown>): Promise<UserInfoResponse> => {
    const response = await authClient.get<DetailResponse<UserInfoResponse>>('/me', { params });
    return extractDetail(response);
  },
};
