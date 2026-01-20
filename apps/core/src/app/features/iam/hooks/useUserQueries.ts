/**
 * 사용자 관리 React Query 훅
 */
import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { type User, type UserListParams, userApi } from '../api/userApi';

export const userQueryKeys = createQueryKeys('users', {
  getList: (params?: UserListParams) => [params],
  search: (params?: UserListParams) => ['search', params],
});

/**
 * 사용자 목록 조회 훅
 */
export const useGetUsers = ({ params, queryOptions }: QueryHookWithParamsOptions<User[], UserListParams> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getList(params).queryKey,
    queryFn: () => userApi.getList(params),
    ...queryOptions,
  });
};

/**
 * 사용자 검색 훅
 */
export const useSearchUsers = ({ params, queryOptions }: QueryHookWithParamsOptions<User[], UserListParams> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.search(params).queryKey,
    queryFn: () => userApi.search(params),
    enabled: !!params?.keyword,
    ...queryOptions,
  });
};
