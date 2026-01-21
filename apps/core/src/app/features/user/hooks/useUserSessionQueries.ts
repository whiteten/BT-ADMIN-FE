import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { userSessionApi } from '../api/userSessionApi';
import type { UserSession, UserSessionSearchParams } from '../types/userSession.types';

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
  activeSessions: (userId?: number) => [userId],
  sessionCount: (userId?: number) => [userId],
  sessionHistory: (userId?: number, params?: { page?: number; size?: number }) => [userId, params],
  sessionDetail: (sessionId?: string) => [sessionId],
  search: (params?: UserSessionSearchParams) => [params],
});

/**
 * 사용자의 활성 세션 목록 조회 훅
 */
export const useGetActiveSessions = ({
  userId,
  queryOptions,
}: {
  userId?: number;
  queryOptions?: QueryHookWithParamsOptions<UserSession[]>['queryOptions'];
} = {}) => {
  return useQuery({
    queryKey: userSessionQueryKeys.activeSessions(userId).queryKey,
    queryFn: () => userSessionApi.getActiveSessions(userId!),
    enabled: !!userId,
    ...queryOptions,
  });
};

/**
 * 사용자의 활성 세션 수 조회 훅
 */
export const useGetActiveSessionCount = ({
  userId,
  queryOptions,
}: {
  userId?: number;
  queryOptions?: QueryHookWithParamsOptions<number>['queryOptions'];
} = {}) => {
  return useQuery({
    queryKey: userSessionQueryKeys.sessionCount(userId).queryKey,
    queryFn: () => userSessionApi.countActiveSessions(userId!),
    enabled: !!userId,
    ...queryOptions,
  });
};

/**
 * 사용자의 전체 세션 이력 조회 훅
 */
export const useGetSessionHistory = ({
  userId,
  params,
  queryOptions,
}: {
  userId?: number;
  params?: { page?: number; size?: number };
  queryOptions?: QueryHookWithParamsOptions<PagedResponse<UserSession>>['queryOptions'];
} = {}) => {
  return useQuery({
    queryKey: userSessionQueryKeys.sessionHistory(userId, params).queryKey,
    queryFn: () => userSessionApi.getSessionHistory(userId!, params),
    enabled: !!userId,
    ...queryOptions,
  });
};

/**
 * 세션 단건 조회 훅
 */
export const useGetSession = ({
  sessionId,
  queryOptions,
}: {
  sessionId?: string;
  queryOptions?: QueryHookWithParamsOptions<UserSession>['queryOptions'];
} = {}) => {
  return useQuery({
    queryKey: userSessionQueryKeys.sessionDetail(sessionId).queryKey,
    queryFn: () => userSessionApi.getSession(sessionId!),
    enabled: !!sessionId,
    ...queryOptions,
  });
};

/**
 * 세션 검색 훅
 */
export const useSearchSessions = ({ params, queryOptions }: QueryHookWithParamsOptions<PagedResponse<UserSession>> = {}) => {
  return useQuery({
    queryKey: userSessionQueryKeys.search(params as UserSessionSearchParams).queryKey,
    queryFn: () => userSessionApi.search(params as UserSessionSearchParams),
    ...queryOptions,
  });
};

/**
 * 세션 강제 종료 훅
 */
export const useTerminateSession = ({
  userId,
  mutationOptions,
}: {
  userId?: number;
  mutationOptions?: MutationHookOptions<void, string>['mutationOptions'];
} = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userSessionApi.terminateSession,
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: userSessionQueryKeys.activeSessions(userId).queryKey });
        queryClient.invalidateQueries({ queryKey: userSessionQueryKeys.sessionCount(userId).queryKey });
        queryClient.invalidateQueries({ queryKey: userSessionQueryKeys.sessionHistory(userId).queryKey });
      }
    },
    ...mutationOptions,
  });
};

/**
 * 사용자의 모든 세션 강제 종료 훅
 */
export const useTerminateAllSessions = ({
  userId,
  mutationOptions,
}: {
  userId?: number;
  mutationOptions?: MutationHookOptions<number, number>['mutationOptions'];
} = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userSessionApi.terminateAllSessions,
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: userSessionQueryKeys.activeSessions(userId).queryKey });
        queryClient.invalidateQueries({ queryKey: userSessionQueryKeys.sessionCount(userId).queryKey });
        queryClient.invalidateQueries({ queryKey: userSessionQueryKeys.sessionHistory(userId).queryKey });
      }
    },
    ...mutationOptions,
  });
};
