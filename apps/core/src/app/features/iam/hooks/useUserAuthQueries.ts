/**
 * 사용자 권한 매핑 React Query 훅
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { type UserAuthMapListParams, userAuthApi } from '../api/userAuthApi';
import type { UserAuthMap, UserAuthMapBatchRequest, UserAuthMapBatchResponse } from '../types/iam.types';

export const userAuthQueryKeys = createQueryKeys('userAuthMaps', {
  getList: (params?: UserAuthMapListParams) => [params],
});

/**
 * 사용자 권한 매핑 목록 조회 훅
 */
export const useGetUserAuthMaps = ({ params, queryOptions }: QueryHookWithParamsOptions<UserAuthMap[], UserAuthMapListParams> = {}) => {
  return useQuery({
    queryKey: userAuthQueryKeys.getList(params).queryKey,
    queryFn: () => userAuthApi.getList(params),
    ...queryOptions,
  });
};

/**
 * 사용자 권한 매핑 배치 생성 Mutation 훅
 */
export const useCreateUserAuthMapBatchMutation = ({ mutationOptions }: MutationHookOptions<UserAuthMapBatchResponse, UserAuthMapBatchRequest> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserAuthMapBatchRequest) => userAuthApi.createBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userAuthQueryKeys.getList._def });
    },
    ...mutationOptions,
  });
};

/**
 * 사용자 권한 매핑 삭제 Mutation 훅
 */
export const useDeleteUserAuthMapMutation = ({ mutationOptions }: MutationHookOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mapId: number) => userAuthApi.delete(mapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userAuthQueryKeys.getList._def });
    },
    ...mutationOptions,
  });
};
