/**
 * 사용자 권한 매핑 React Query 훅
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { userAuthApi } from '../api/userAuthApi';
import type { UserAuthMap, UserAuthMapCreateRequest, UserAuthMapCreateResponse } from '../types/iam.types';

export const userAuthQueryKeys = createQueryKeys('userAuthMaps', {
  getList: (userId?: number) => [userId],
});

export interface UserAuthMapQueryParams {
  userId?: number;
}

type UseGetUserAuthMapsOptions = QueryHookWithParamsOptions<UserAuthMap[], UserAuthMapQueryParams>;

/**
 * 사용자 권한 매핑 목록 조회 훅
 * @param userId - 대상 사용자 ID (필수)
 */
export const useGetUserAuthMaps = (options: UseGetUserAuthMapsOptions = {}) => {
  const { params, queryOptions } = options;
  const userId = params?.userId as number | undefined;

  return useQuery({
    queryKey: userAuthQueryKeys.getList(userId).queryKey,
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return userAuthApi.getList(userId);
    },
    enabled: !!userId,
    ...queryOptions,
  });
};

/**
 * 사용자 권한 매핑 생성 Mutation 훅
 * @param userId - 대상 사용자 ID
 */
export const useCreateUserAuthMapMutation = (userId: number, options: MutationHookOptions<UserAuthMapCreateResponse, UserAuthMapCreateRequest> = {}) => {
  const { mutationOptions } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserAuthMapCreateRequest) => userAuthApi.create(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userAuthQueryKeys.getList(userId).queryKey });
    },
    ...mutationOptions,
  });
};

/**
 * 사용자 권한 매핑 삭제 Mutation 훅
 * @param userId - 대상 사용자 ID
 */
export const useDeleteUserAuthMapMutation = (userId: number, options: MutationHookOptions<void, number> = {}) => {
  const { mutationOptions } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mapId: number) => userAuthApi.delete(userId, mapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userAuthQueryKeys.getList(userId).queryKey });
    },
    ...mutationOptions,
  });
};
