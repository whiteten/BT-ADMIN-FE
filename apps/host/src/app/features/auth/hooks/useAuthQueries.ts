import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { authApi } from '../api/authApi';
import type { LoginRequestDatas, LoginResponse, PasswordPolicy } from '../types/auth';

export const authQueryKeys = createQueryKeys('auth', {
  getCsrfToken: (params?: Record<string, unknown>) => [params],
  getUserInfo: (params?: Record<string, unknown>) => [params],
  passwordPolicy: null,
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

export const useGetUserInfo = ({ params, queryOptions }: QueryHookWithParamsOptions = {}) => {
  return useQuery({
    queryKey: authQueryKeys.getUserInfo(params).queryKey,
    queryFn: () => authApi.getUserInfo(params),
    ...queryOptions,
  });
};

/**
 * 자신의 비밀번호 변경
 */
export const useChangeMyPassword = ({ mutationOptions }: MutationHookOptions<unknown, { currentPassword: string; newPassword: string }> = {}) => {
  return useMutation({
    mutationFn: authApi.changeMyPassword,
    ...mutationOptions,
  });
};

/**
 * 비밀번호 정책 조회
 */
export const useGetPasswordPolicy = ({ queryOptions }: QueryHookOptions<PasswordPolicy> = {}) => {
  return useQuery({
    queryKey: authQueryKeys.passwordPolicy.queryKey,
    queryFn: authApi.getPasswordPolicy,
    ...queryOptions,
  });
};
