/**
 * 사용자 관리 React Query 훅 (IAM용)
 */
import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { type User, userApi } from '../api/userApi';

export const userQueryKeys = createQueryKeys('iamUsers', {
  getList: (params?: Record<string, unknown>) => [params],
  search: (params?: Record<string, unknown>) => ['search', params],
});

/**
 * 사용자 목록 조회 훅
 */
export const useGetUsers = ({ params, queryOptions }: QueryHookWithParamsOptions<User[]> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getList(params).queryKey,
    queryFn: () => userApi.getList(params),
    ...queryOptions,
  });
};

/**
 * 사용자 검색 훅
 */
export const useSearchUsers = ({ params, queryOptions }: QueryHookWithParamsOptions<User[]> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.search(params).queryKey,
    queryFn: () => userApi.search(params),
    ...queryOptions,
  });
};
