import ApiClient from '@/shared-util';
import type { LoginRequest } from '../types/auth';

const apiClient = new ApiClient({ serviceURL: '/auth' });

export const authService = {
  getCsrfToken: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get('/csrf', { params });
    return response.data;
  },
  login: async (params: LoginRequest) => {
    const response = await apiClient.post('/login', params);
    return response.data;
  },
};
