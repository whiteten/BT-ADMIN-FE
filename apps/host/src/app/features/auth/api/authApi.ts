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
  WsTicketResponse,
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
  getWsTicket: async (params?: Record<string, unknown>): Promise<WsTicketResponse> => {
    const response = await authClient.get<DetailResponse<WsTicketResponse>>('/ws-ticket', { params });
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
   * 계정 정책 조회 (인증 없이 접근 가능)
   * - 최초 로그인, 비밀번호 만료 시 비밀번호 변경 전 정책 조회
   * - 세션 없이 tenantId 파라미터로 조회
   * @param tenantId 테넌트 ID (로그인 응답에서 받은 값)
   */
  getAccountPolicy: async (tenantId: number): Promise<PasswordPolicy> => {
    const response = await authClient.get<DetailResponse<PasswordPolicy>>('/account-policy', {
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
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const response = await authClient.post<DetailResponse<ResetPasswordResponse>>('/reset-password', data);
    return extractDetail(response);
  },
};
