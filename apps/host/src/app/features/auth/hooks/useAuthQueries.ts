import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { authApi } from '../api/authApi';
import type { ChangePasswordRequest, LoginRequestDatas, LoginResponse, ResetPasswordRequest, ResetPasswordResponse, UserInfoResponse, WsTicketResponse } from '../types/auth';

export const authQueryKeys = createQueryKeys('auth', {
  getCsrfToken: (params?: Record<string, unknown>) => [params],
  getUserInfo: (params?: Record<string, unknown>) => [params],
  accountPolicy: (params?: Record<string, unknown>) => [params],
  getWsTicket: (params?: Record<string, unknown>) => [params],
});

export const useGetCsrfToken = ({ params, queryOptions }: QueryHookWithParamsOptions = {}) => {
  return useQuery({
    queryKey: authQueryKeys.getCsrfToken(params).queryKey,
    queryFn: () => authApi.getCsrfToken(params),
    ...queryOptions,
  });
};

export const useLogin = ({ mutationOptions }: MutationHookOptions<LoginResponse, LoginRequestDatas> = {}) => {
  return useMutation({
    mutationFn: authApi.login,
    ...mutationOptions,
  });
};

export const useLogout = ({ mutationOptions }: MutationHookOptions<unknown, void> = {}) => {
  return useMutation({
    mutationFn: authApi.logout,
    ...mutationOptions,
  });
};

export const useGetUserInfo = ({ params, queryOptions }: QueryHookWithParamsOptions<UserInfoResponse> = {}) => {
  return useQuery({
    queryKey: authQueryKeys.getUserInfo(params).queryKey,
    queryFn: () => authApi.getUserInfo(params),
    ...queryOptions,
  });
};

export const useGetWsTicket = ({ params, queryOptions }: QueryHookWithParamsOptions<WsTicketResponse> = {}) => {
  return useQuery({
    queryKey: authQueryKeys.getWsTicket(params).queryKey,
    queryFn: () => authApi.getWsTicket(params),
    ...queryOptions,
  });
};

/**
 * 비밀번호 변경 훅
 * - forcePasswordChange 또는 passwordExpired 상태에서 사용
 */
export const useChangePassword = ({ mutationOptions }: MutationHookOptions<void, { userId: number; data: ChangePasswordRequest }> = {}) => {
  return useMutation({
    mutationFn: ({ userId, data }) => authApi.changePassword(userId, data),
    ...mutationOptions,
  });
};

export const useResetPassword = ({ mutationOptions }: MutationHookOptions<ResetPasswordResponse, ResetPasswordRequest> = {}) => {
  return useMutation({
    mutationFn: authApi.resetPassword,
    ...mutationOptions,
  });
};

/**
 * 활성 테넌트 전환 훅
 * - 토큰 재발급이므로 성공 시 호출자가 page reload 책임
 */
export const useSwitchTenant = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  return useMutation({
    mutationFn: authApi.switchTenant,
    ...mutationOptions,
  });
};

/**
 * 운영자 모드 진입 훅
 * - 토큰 재발급이므로 성공 시 호출자가 page reload 책임
 */
export const useEnterOperator = ({ mutationOptions }: MutationHookOptions<{ operatorMode: boolean }, void> = {}) => {
  return useMutation({
    mutationFn: authApi.enterOperator,
    ...mutationOptions,
  });
};

/**
 * 운영자 모드 종료 훅
 * - 토큰 재발급이므로 성공 시 호출자가 page reload 책임
 */
export const useExitOperator = ({ mutationOptions }: MutationHookOptions<{ operatorMode: boolean }, void> = {}) => {
  return useMutation({
    mutationFn: authApi.exitOperator,
    ...mutationOptions,
  });
};
