import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type {
  ChangePasswordRequest,
  LoginAuditLogSearchParams,
  LoginRequestDatas,
  LoginResponse,
  PagedLoginAuditLogResponse,
  PasswordPolicy,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UserInfoResponse,
} from '../types/auth';

const authClient = new ApiClient({ serviceURL: '/auth' });
const bffClient = new ApiClient({ serviceURL: '/bff' });

export const authApi = {
  getCsrfToken: async (params?: Record<string, unknown>) => {
    const response = await authClient.get('/csrf', { params });
    return response.data;
  },
  login: async (data: LoginRequestDatas): Promise<LoginResponse> => {
    const response = await authClient.post<{ data: LoginResponse }>('/login', data);
    return response.data.data;
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
   * 비밀번호 변경
   * - 로그인 후 forcePasswordChange 또는 passwordExpired 상태에서 호출
   * @flow password-update
   */
  changePassword: async (userId: number, data: ChangePasswordRequest): Promise<void> => {
    await bffClient.put('/password-update', data, { params: { userId } });
  },
  /**
   * 비밀번호 정책 조회
   * - 로그인 성공 후 테넌트의 비밀번호 정책을 조회
   * @flow password-policy-detail
   * @param tenantId 테넌트 ID (로그인 응답에서 받은 값)
   */
  getPasswordPolicy: async (tenantId: number): Promise<PasswordPolicy> => {
    const response = await bffClient.get<DetailResponse<PasswordPolicy>>('/password-policy-detail', {
      params: { tenantId },
    });
    return extractDetail(response);
  },
  /**
   * 로그인 이력 조회
   * @flow login-log-list
   */
  getLoginHistory: async (params: LoginAuditLogSearchParams): Promise<PagedLoginAuditLogResponse> => {
    const response = await bffClient.get<ListResponse<PagedLoginAuditLogResponse>>('/login-log-list', { params });
    return extractList(response) as unknown as PagedLoginAuditLogResponse;
  },
  /**
   * 비밀번호 강제 변경 (Reset Token 기반)
   * - 세션 없이 비밀번호 변경 가능
   * - 최초 로그인, 비밀번호 만료 시 사용
   * @flow password-reset → AUTH /api/auth/reset-password
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const response = await bffClient.post<{ data: ResetPasswordResponse }>('/password-reset', data);
    return response.data.data;
  },
};
