import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { LoginRequestDatas, LoginResponse, RoleResponse, UserInfoResponse } from '../types/auth';

const authClient = new ApiClient({ serviceURL: '/auth' });
const bffClient = new ApiClient({ serviceURL: '/bff' });

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
  /**
   * 역할 목록 조회 (역할코드 → 역할명 매핑용)
   */
  getRoles: async (): Promise<RoleResponse[]> => {
    const response = await bffClient.get<ListResponse<RoleResponse>>('/role-list');
    return extractList(response);
  },
};
