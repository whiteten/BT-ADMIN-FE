import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { authApi } from '../api/authApi';
import type { LoginRequestDatas, LoginResponse, UserInfoResponse } from '../types/auth';

export const authQueryKeys = createQueryKeys('auth', {
  getCsrfToken: (params?: Record<string, unknown>) => [params],
  getUserInfo: (params?: Record<string, unknown>) => [params],
  passwordPolicy: (params?: Record<string, unknown>) => [params],
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
