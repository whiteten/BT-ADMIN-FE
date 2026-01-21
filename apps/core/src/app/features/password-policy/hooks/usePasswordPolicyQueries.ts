import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { passwordPolicyApi } from '../api/passwordPolicyApi';
import type { PasswordPolicy, PasswordPolicyRequest } from '../types/passwordPolicy.types';

/**
 * 비밀번호 정책 쿼리 키 정의
 */
export const passwordPolicyQueryKeys = createQueryKeys('passwordPolicy', {
  detail: null,
});

/**
 * 비밀번호 정책 조회 훅
 */
export const useGetPasswordPolicy = ({ queryOptions }: QueryHookOptions<PasswordPolicy> = {}) => {
  return useQuery({
    queryKey: passwordPolicyQueryKeys.detail.queryKey,
    queryFn: passwordPolicyApi.getPolicy,
    ...queryOptions,
  });
};

/**
 * 비밀번호 정책 수정 훅
 */
export const useUpdatePasswordPolicy = ({ mutationOptions }: MutationHookOptions<PasswordPolicy, PasswordPolicyRequest> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: passwordPolicyApi.updatePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordPolicyQueryKeys._def });
    },
    ...mutationOptions,
  });
};
