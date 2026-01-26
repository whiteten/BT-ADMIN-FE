import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { passwordPolicyApi } from '../api/passwordPolicyApi';
import type { PasswordPolicy } from '../types/passwordPolicy.types';

/**
 * 비밀번호 정책 쿼리 키 정의
 */
export const passwordPolicyQueryKeys = createQueryKeys('passwordPolicy', {
  detail: (params?: Record<string, unknown>) => [params],
});

/**
 * 비밀번호 정책 조회 훅
 */
export const useGetPasswordPolicy = ({ params, queryOptions }: QueryHookWithParamsOptions<PasswordPolicy> = {}) => {
  return useQuery({
    queryKey: passwordPolicyQueryKeys.detail(params).queryKey,
    queryFn: () => passwordPolicyApi.getPolicy(params),
    ...queryOptions,
  });
};

/**
 * 비밀번호 정책 수정 훅
 */
export const useUpdatePasswordPolicy = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: passwordPolicyApi.updatePolicy,
    ...mutationOptions,
  });
};
