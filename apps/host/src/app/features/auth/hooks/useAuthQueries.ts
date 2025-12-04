import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { authService } from '../services/authService';
import type { LoginRequest } from '../types/auth';

const authQueryKeys = createQueryKeys('auth', {
  getCsrfToken: (params?: Record<string, unknown>) => [params],
});

export const useGetCsrfToken = ({ params, queryOptions }: QueryHookWithParamsOptions = {}) => {
  return useQuery({
    queryKey: authQueryKeys.getCsrfToken(params).queryKey,
    queryFn: () => authService.getCsrfToken(params),
    ...queryOptions,
  });
};

export const useLogin = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: (params: LoginRequest) => authService.login(params),
    ...mutationOptions,
  });
};
