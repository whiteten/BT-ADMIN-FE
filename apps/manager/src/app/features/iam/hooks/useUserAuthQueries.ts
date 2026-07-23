/**
 * 사용자 권한 매핑 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { userAuthApi } from '../api/userAuthApi';
import type { UserAuthMap, UserPermissionSyncRequest, UserPermissionSyncResponse } from '../types';

export const userAuthQueryKeys = createAppQueryKeys('userAuthMaps', {
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
 * 사용자 권한 동기화 훅 (Replacement 모델)
 * - 선택된 권한 ID 목록을 전달하면 백엔드가 개별 권한으로 저장 (역할 권한 대체)
 */
export const useSyncUserPermissions = ({ mutationOptions }: MutationHookOptions<UserPermissionSyncResponse, { userId: number; data: UserPermissionSyncRequest }> = {}) => {
  return useMutation({
    mutationFn: userAuthApi.sync,
    ...mutationOptions,
  });
};
