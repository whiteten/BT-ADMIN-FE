import ApiClient from '@/shared-util';
import type { LoginRequestDatas } from '../types/auth';

const apiClient = new ApiClient({ serviceURL: '/auth' });

export const authApi = {
  getCsrfToken: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get('/csrf', { params });
    return response.data;
  },
  login: async (data: LoginRequestDatas) => {
    const response = await apiClient.post('/login', data);
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
};
