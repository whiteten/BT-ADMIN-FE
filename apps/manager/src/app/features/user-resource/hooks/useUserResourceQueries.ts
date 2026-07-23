/**
 * 사용자 리소스 접근 매핑 React Query 훅
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { userResourceApi } from '../api/userResourceApi';
import type { BotService, NluModel, UserResourceMap, UserResourceSyncRequest, UserResourceSyncResponse } from '../types';

export const userResourceQueryKeys = createAppQueryKeys('userResourceMaps', {
  getList: (userId: number) => [userId],
  getBots: null,
  getModels: null,
});

/**
 * 사용자 리소스 매핑 목록 조회 훅
 */
export const useGetUserResourceMaps = (userId: number, { queryOptions }: QueryHookOptions<UserResourceMap[]> = {}) => {
  return useQuery({
    queryKey: userResourceQueryKeys.getList(userId).queryKey,
    queryFn: () => userResourceApi.getList(userId),
    enabled: !!userId,
    ...queryOptions,
  });
};

/**
 * 사용자 리소스 매핑 동기화 훅
 */
export const useSyncUserResources = ({ mutationOptions }: MutationHookOptions<UserResourceSyncResponse, { userId: number; data: UserResourceSyncRequest }> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userResourceApi.sync,
    onSuccess: (_, variables) => {
      // 매핑 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: userResourceQueryKeys.getList(variables.userId).queryKey });
    },
    ...mutationOptions,
  });
};

/**
 * 봇 서비스 목록 조회 훅
 */
export const useGetBots = ({ queryOptions }: QueryHookOptions<BotService[]> = {}) => {
  return useQuery({
    queryKey: userResourceQueryKeys.getBots.queryKey,
    queryFn: userResourceApi.getBots,
    ...queryOptions,
  });
};

/**
 * NLU 모델 목록 조회 훅
 */
export const useGetModels = ({ queryOptions }: QueryHookOptions<NluModel[]> = {}) => {
  return useQuery({
    queryKey: userResourceQueryKeys.getModels.queryKey,
    queryFn: userResourceApi.getModels,
    ...queryOptions,
  });
};
