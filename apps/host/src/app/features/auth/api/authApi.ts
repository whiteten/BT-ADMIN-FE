import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  ChangePasswordRequest,
  LoginRequestDatas,
  LoginResponse,
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
    const response = await authClient.post<ApiResponse<LoginResponse>>('/login', data);
    return response.data.data;
  },
  logout: async () => {
    const response = await authClient.post('/logout');
    return response.data;
  },
  getUserInfo: async (params?: Record<string, unknown>): Promise<UserInfoResponse> => {
    const response = await authClient.get<ApiResponse<UserInfoResponse>>('/me', { params });
    return response.data?.data;
  },
  getWsTicket: async (params?: Record<string, unknown>): Promise<WsTicketResponse> => {
    const response = await authClient.get<ApiResponse<WsTicketResponse>>('/ws-ticket', { params });
    return response.data?.data;
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
    const response = await authClient.get<ApiResponse<PasswordPolicy>>('/account-policy', {
      params: { tenantId },
    });
    return response.data?.data;
  },
  /**
   * 비밀번호 강제 변경 (Reset Token 기반)
   * - 세션 없이 비밀번호 변경 가능
   * - 최초 로그인, 비밀번호 만료 시 사용
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const response = await authClient.post<ApiResponse<ResetPasswordResponse>>('/reset-password', data);
    return response.data?.data;
  },
  /**
   * 활성 테넌트 전환.
   * - 세션은 유지하면서 토큰만 새 테넌트로 재발급 (서버 측에서 UserTenantMap 검증)
   * - 성공 시 호출자가 page reload하여 새 컨텍스트로 진입
   * - 실패: 403(권한 없음) / 401(세션 만료) / 500(기타)
   */
  switchTenant: async (tenantId: number): Promise<void> => {
    await authClient.post('/switch-tenant', { tenantId });
  },
};
