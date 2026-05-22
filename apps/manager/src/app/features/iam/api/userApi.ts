/**
 * 사용자 관리 API (IAM용)
 * TODO: User, UserListParams 타입을 types/iam.types.ts로 이동 필요
 */
import ApiClient, { type ApiResponse } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface User {
  userId: number;
  tenantId: number;
  tenantName?: string;
  userSabun: string;
  userName: string;
  position?: string;
  nodeId?: number;
  nodeName?: string;
  grantId?: number;
  grantName?: string;
  userTelNo?: string;
  userStatus?: string;
  userStatusName?: string;
  loginLock?: string;
  multiLogin?: string;
  oscomName?: string;
  centerId?: number;
  centerName?: string;
  companyId?: number;
  companyName?: string;
  accessScope?: string;
  ipStart?: string;
  ipFinsh?: string;
  loginErrorCount?: number;
  passwordTime?: string;
  noticeAutority?: number;
  approvalAuthority?: number;
  isUse?: boolean;
  createdAt?: string;
  createdBy?: number;
  createdByName?: string;
  updatedAt?: string;
  updatedBy?: number;
  updatedByName?: string;
}

export interface UserListParams {
  keyword?: string;
  userStatus?: string;
}

export const userApi = {
  /**
   * 사용자 목록 조회
   */
  getList: async (params?: Record<string, unknown>): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<{ items: User[] }>>('/user-list', { params });
    return response.data?.data?.items ?? [];
  },

  /**
   * 사용자 검색
   */
  search: async (params?: Record<string, unknown>): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<{ items: User[] }>>('/user-search', { params });
    return response.data?.data?.items ?? [];
  },
};
