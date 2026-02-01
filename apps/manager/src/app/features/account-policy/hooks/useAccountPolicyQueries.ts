import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { accountPolicyApi } from '../api/accountPolicyApi';
import type { AccountPolicy } from '../types/accountPolicy.types';

/**
 * 계정 보안 정책 쿼리 키 정의
 */
export const accountPolicyQueryKeys = createQueryKeys('accountPolicy', {
  detail: (params?: Record<string, unknown>) => [params],
});

/**
 * 계정 보안 정책 조회 훅
 */
export const useGetAccountPolicy = ({ params, queryOptions }: QueryHookWithParamsOptions<AccountPolicy> = {}) => {
  return useQuery({
    queryKey: accountPolicyQueryKeys.detail(params).queryKey,
    queryFn: () => accountPolicyApi.getPolicy(params),
    ...queryOptions,
  });
};

/**
 * 계정 보안 정책 수정 훅
 */
export const useUpdateAccountPolicy = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: accountPolicyApi.updatePolicy,
    ...mutationOptions,
  });
};
