/**
 * 사용자 권한 매핑 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { userAuthApi } from '../api/userAuthApi';
import type { UserAuthMap } from '../types/iam.types';

export const userAuthQueryKeys = createQueryKeys('userAuthMaps', {
  getList: (params?: Record<string, unknown>) => [params],
});

/**
 * 사용자 권한 매핑 목록 조회 훅
 */
export const useGetUserAuthMaps = ({ params, queryOptions }: QueryHookWithParamsOptions<UserAuthMap[]> = {}) => {
  return useQuery({
    queryKey: userAuthQueryKeys.getList(params).queryKey,
    queryFn: () => userAuthApi.getList(params),
    ...queryOptions,
  });
};

/**
 * 사용자 권한 매핑 생성 훅
 */
export const useCreateUserAuthMap = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userAuthApi.create,
    ...mutationOptions,
  });
};

/**
 * 사용자 권한 매핑 삭제 훅
 */
export const useDeleteUserAuthMap = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userAuthApi.delete,
    ...mutationOptions,
  });
};
