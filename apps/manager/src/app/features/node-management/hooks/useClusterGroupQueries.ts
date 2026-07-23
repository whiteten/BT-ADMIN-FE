/**
 * 클러스터 그룹 관리 React Query 훅
 * SD-NODE-MANAGEMENT.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { clusterGroupApi } from '../api/clusterGroupApi';
import type { ClusterGroup } from '../types';

export const clusterGroupQueryKeys = createAppQueryKeys('clusterGroups', {
  getClusterGroups: (params?: Record<string, unknown>) => [params],
});

/**
 * 클러스터 그룹 목록 조회
 */
export const useGetClusterGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<ClusterGroup[]> = {}) => {
  return useQuery({
    queryKey: clusterGroupQueryKeys.getClusterGroups(params).queryKey,
    queryFn: () => clusterGroupApi.getClusterGroups(params),
    ...queryOptions,
  });
};

/**
 * 클러스터 그룹 등록
 */
export const useCreateClusterGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: clusterGroupApi.createClusterGroup,
    ...mutationOptions,
  });
};

/**
 * 클러스터 그룹 수정
 */
export const useUpdateClusterGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: clusterGroupApi.updateClusterGroup,
    ...mutationOptions,
  });
};

/**
 * 클러스터 그룹 삭제
 */
export const useDeleteClusterGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: clusterGroupApi.deleteClusterGroup,
    ...mutationOptions,
  });
};
