import { useQuery } from '@tanstack/react-query';
import { type Role, sharedApi } from '@/shared-api';
import type { QueryHookWithParamsOptions } from '@/libs/shared-util/src/lib/types/query.types';

/**
 * 역할 목록 조회 훅
 */
export const useGetRoles = ({ params, queryOptions }: QueryHookWithParamsOptions<Role[]> = {}) => {
  return useQuery({
    queryKey: sharedApi.role.queryKeys.getRoles(params).queryKey,
    queryFn: () => sharedApi.role.getRoles(params),
    ...queryOptions,
  });
};

/**
 * 역할 단건 조회 훅
 */
export const useGetRole = ({ params, queryOptions }: QueryHookWithParamsOptions<Role> = {}) => {
  return useQuery({
    queryKey: sharedApi.role.queryKeys.getRole(params).queryKey,
    queryFn: () => sharedApi.role.getRole(params),
    ...queryOptions,
  });
};
