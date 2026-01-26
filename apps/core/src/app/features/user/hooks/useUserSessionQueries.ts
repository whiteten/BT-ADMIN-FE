import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { userSessionApi } from '../api/userSessionApi';
import type { UserSession } from '../types/userSession.types';

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
 * 사용자 세션 쿼리 키 정의
 */
export const userSessionQueryKeys = createQueryKeys('userSession', {
  activeSessions: (params?: Record<string, unknown>) => [params],
  sessionCount: (params?: Record<string, unknown>) => [params],
  sessionHistory: (params?: Record<string, unknown>) => [params],
  sessionDetail: (params?: Record<string, unknown>) => [params],
  search: (params?: Record<string, unknown>) => [params],
});

/**
 * 사용자의 활성 세션 목록 조회 훅
 */
export const useGetActiveSessions = ({ params, queryOptions }: QueryHookWithParamsOptions<UserSession[]> = {}) => {
  return useQuery({
    queryKey: userSessionQueryKeys.activeSessions(params).queryKey,
    queryFn: () => userSessionApi.getActiveSessions(params),
    ...queryOptions,
  });
};

/**
 * 사용자의 활성 세션 수 조회 훅
 */
export const useGetActiveSessionCount = ({ params, queryOptions }: QueryHookWithParamsOptions<number> = {}) => {
  return useQuery({
    queryKey: userSessionQueryKeys.sessionCount(params).queryKey,
    queryFn: () => userSessionApi.countActiveSessions(params),
    ...queryOptions,
  });
};

/**
 * 사용자의 전체 세션 이력 조회 훅
 */
export const useGetSessionHistory = ({ params, queryOptions }: QueryHookWithParamsOptions<PagedResponse<UserSession>> = {}) => {
  return useQuery({
    queryKey: userSessionQueryKeys.sessionHistory(params).queryKey,
    queryFn: () => userSessionApi.getSessionHistory(params),
    ...queryOptions,
  });
};

/**
 * 세션 단건 조회 훅
 */
export const useGetSession = ({ params, queryOptions }: QueryHookWithParamsOptions<UserSession> = {}) => {
  return useQuery({
    queryKey: userSessionQueryKeys.sessionDetail(params).queryKey,
    queryFn: () => userSessionApi.getSession(params),
    ...queryOptions,
  });
};

/**
 * 세션 검색 훅
 */
export const useSearchSessions = ({ params, queryOptions }: QueryHookWithParamsOptions<PagedResponse<UserSession>> = {}) => {
  return useQuery({
    queryKey: userSessionQueryKeys.search(params).queryKey,
    queryFn: () => userSessionApi.search(params),
    ...queryOptions,
  });
};

/**
 * 세션 강제 종료 훅
 */
export const useTerminateSession = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userSessionApi.terminateSession,
    ...mutationOptions,
  });
};

/**
 * 사용자의 모든 세션 강제 종료 훅
 */
export const useTerminateAllSessions = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userSessionApi.terminateAllSessions,
    ...mutationOptions,
  });
};
