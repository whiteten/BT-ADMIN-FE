import ApiClient from '@/shared-util';
import type { PasswordChangeRequest, User, UserRequest, UserSearchParams } from '../types/user.types';

/**
 * 페이징 응답 타입 (백엔드 PagedResponse와 일치)
 */
interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

/**
 * API 응답 타입 (백엔드 ApiResponse와 일치)
 */
interface ApiResponse<T> {
  ok: boolean;
  code: string;
  message: string;
  data: T;
  timestamp: string;
  requestId: string;
}

const apiClient = new ApiClient({ serviceURL: '/manager' });

export const userApi = {
  /**
   * 사용자 목록 조회 (페이징)
   */
  getUsers: async (params?: { page?: number; size?: number }): Promise<PagedResponse<User>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<User>>>('/users', { params });
    return response.data.data;
  },

  /**
   * 사용자 검색
   */
  searchUsers: async (params?: UserSearchParams): Promise<PagedResponse<User>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<User>>>('/users/search', { params });
    return response.data.data;
  },

  /**
   * 사용자 단건 조회
   */
  getUser: async (userId: number): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${userId}`);
    return response.data.data;
  },

  /**
   * 사번으로 사용자 조회
   */
  getUserBySabun: async (userSabun: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/by-sabun/${userSabun}`);
    return response.data.data;
  },

  /**
   * 사용자 생성
   */
  createUser: async (data: UserRequest): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>('/users', data);
    return response.data.data;
  },

  /**
   * 사용자 수정
   */
  updateUser: async ({ userId, data }: { userId: number; data: UserRequest }): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${userId}`, data);
    return response.data.data;
  },

  /**
   * 사용자 삭제
   */
  deleteUser: async (userId: number): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/users/${userId}`);
  },

  /**
   * 비밀번호 변경
   */
  changePassword: async ({ userId, data }: { userId: number; data: PasswordChangeRequest }): Promise<void> => {
    await apiClient.put<ApiResponse<void>>(`/users/${userId}/password`, data);
  },

  /**
   * 로그인 잠금 해제
   */
  unlockUser: async (userId: number): Promise<void> => {
    await apiClient.post<ApiResponse<void>>(`/users/${userId}/unlock`);
  },

  /**
   * 로그인 잠금
   */
  lockUser: async (userId: number): Promise<void> => {
    await apiClient.post<ApiResponse<void>>(`/users/${userId}/lock`);
  },
};
