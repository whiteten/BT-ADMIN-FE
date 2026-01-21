import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { loginHistoryApi } from '../api/loginHistoryApi';
import type { LoginHistory, LoginHistorySearchParams } from '../types/loginHistory.types';

/**
 * 페이징 응답 타입
 */
interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

/**
 * 로그인 이력 쿼리 키 정의
 */
export const loginHistoryQueryKeys = createQueryKeys('loginHistory', {
  byUserId: (userId?: number, params?: { page?: number; size?: number }) => [userId, params],
  search: (params?: LoginHistorySearchParams) => [params],
  recentSuccess: (userId?: number, limit?: number) => [userId, limit],
  recentFailed: (userId?: number, limit?: number) => [userId, limit],
});

/**
 * 사용자별 로그인 이력 조회 훅
 */
export const useGetLoginHistoryByUserId = ({
  userId,
  params,
  queryOptions,
}: {
  userId?: number;
  params?: { page?: number; size?: number };
  queryOptions?: QueryHookWithParamsOptions<PagedResponse<LoginHistory>>['queryOptions'];
} = {}) => {
  return useQuery({
    queryKey: loginHistoryQueryKeys.byUserId(userId, params).queryKey,
    queryFn: () => loginHistoryApi.getByUserId(userId!, params),
    enabled: !!userId,
    ...queryOptions,
  });
};

/**
 * 로그인 이력 검색 훅
 */
export const useSearchLoginHistory = ({ params, queryOptions }: QueryHookWithParamsOptions<PagedResponse<LoginHistory>> = {}) => {
  return useQuery({
    queryKey: loginHistoryQueryKeys.search(params as LoginHistorySearchParams).queryKey,
    queryFn: () => loginHistoryApi.search(params as LoginHistorySearchParams),
    ...queryOptions,
  });
};

/**
 * 최근 로그인 성공 이력 조회 훅
 */
export const useGetRecentSuccessLogins = ({
  userId,
  limit = 5,
  queryOptions,
}: {
  userId?: number;
  limit?: number;
  queryOptions?: QueryHookWithParamsOptions<LoginHistory[]>['queryOptions'];
} = {}) => {
  return useQuery({
    queryKey: loginHistoryQueryKeys.recentSuccess(userId, limit).queryKey,
    queryFn: () => loginHistoryApi.getRecentSuccess(userId!, limit),
    enabled: !!userId,
    ...queryOptions,
  });
};

/**
 * 최근 로그인 실패 이력 조회 훅
 */
export const useGetRecentFailedLogins = ({
  userId,
  limit = 5,
  queryOptions,
}: {
  userId?: number;
  limit?: number;
  queryOptions?: QueryHookWithParamsOptions<LoginHistory[]>['queryOptions'];
} = {}) => {
  return useQuery({
    queryKey: loginHistoryQueryKeys.recentFailed(userId, limit).queryKey,
    queryFn: () => loginHistoryApi.getRecentFailed(userId!, limit),
    enabled: !!userId,
    ...queryOptions,
  });
};
