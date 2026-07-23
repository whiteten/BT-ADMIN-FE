import { type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { recogApi } from '../api/recogApi';
import type { LatestRecogGroup, RecogGroupCreateData, RecogGroupItem, RecogGroupUpdateData, RecogTargetCreateData, RecogTargetListItem, RecogTargetSearchItem } from '../types';

export const recogQueryKeys = createAppQueryKeys('recog', {
  getRecogGroupList: (params?: Record<string, unknown>) => [params],
  getRecogGroupDetail: (groupCode?: string) => [{ groupCode }],
  searchRecogTarget: (params?: Record<string, unknown>) => [params],
  getRecogTargetList: (params?: { groupCode?: string; engineCode?: string }) => [params],
  getLatestRecogGroup: (params?: { modelVerId?: string }) => [params],
});

export const useGetRecogGroupList = ({ params, queryOptions }: { params?: { engineCode?: string }; queryOptions?: UseQueryOptions<RecogGroupItem[]> } = {}) => {
  return useQuery({
    queryKey: recogQueryKeys.getRecogGroupList((params as Record<string, unknown>) ?? undefined).queryKey,
    queryFn: () => recogApi.getRecogGroupList(params),
    enabled: !params || !!params.engineCode,
    ...queryOptions,
  });
};

export const useCreateRecogGroup = ({ mutationOptions }: MutationHookOptions<unknown, RecogGroupCreateData> = {}) => {
  return useMutation({
    mutationFn: recogApi.createRecogGroup,
    ...mutationOptions,
  });
};

export const useUpdateRecogGroup = ({ mutationOptions }: MutationHookOptions<unknown, RecogGroupUpdateData> = {}) => {
  return useMutation({
    mutationFn: recogApi.updateRecogGroup,
    ...mutationOptions,
  });
};

export const useDeleteRecogGroup = ({ mutationOptions }: MutationHookOptions<unknown, string> = {}) => {
  return useMutation({
    mutationFn: recogApi.deleteRecogGroup,
    ...mutationOptions,
  });
};

export const useGetRecogTargetSearch = ({ params, queryOptions }: { params?: Record<string, unknown> | null; queryOptions?: UseQueryOptions<RecogTargetSearchItem[]> } = {}) => {
  return useQuery({
    queryKey: recogQueryKeys.searchRecogTarget(params ?? undefined).queryKey,
    queryFn: () => recogApi.getRecogTargetSearch(params as Record<string, unknown>),
    enabled: !!params,
    ...queryOptions,
  });
};

export const useGetRecogTargetList = ({
  params,
  queryOptions,
}: { params?: { groupCode?: string; engineCode?: string }; queryOptions?: UseQueryOptions<RecogTargetListItem[]> } = {}) => {
  return useQuery({
    queryKey: recogQueryKeys.getRecogTargetList(params).queryKey,
    queryFn: () => recogApi.getRecogTargetList(params as { groupCode: string; engineCode?: string }),
    enabled: !!params?.groupCode,
    ...queryOptions,
  });
};

export const useCreateRecogTarget = ({ mutationOptions }: MutationHookOptions<unknown, RecogTargetCreateData> = {}) => {
  return useMutation({
    mutationFn: recogApi.createRecogTarget,
    ...mutationOptions,
  });
};

export const useDeleteRecogTarget = ({ mutationOptions }: MutationHookOptions<unknown, { ucidGkey: string; armsoffset: number; rxtxKind: string; groupCode: string }> = {}) => {
  return useMutation({
    mutationFn: recogApi.deleteRecogTarget,
    ...mutationOptions,
  });
};

export const useDeleteRecogTargets = ({ mutationOptions }: MutationHookOptions<unknown, number[]> = {}) => {
  return useMutation({
    mutationFn: recogApi.deleteRecogTargets,
    ...mutationOptions,
  });
};

export const useGetLatestRecogGroup = ({
  params,
  queryOptions,
}: { params?: { modelVerId?: string } | null; queryOptions?: Omit<UseQueryOptions<LatestRecogGroup | null>, 'queryKey' | 'queryFn'> } = {}) => {
  return useQuery({
    queryKey: recogQueryKeys.getLatestRecogGroup((params as Record<string, unknown>) ?? undefined).queryKey,
    queryFn: () => recogApi.getLatestRecogGroup(params as { modelVerId: string }),
    enabled: !!params?.modelVerId,
    ...queryOptions,
  });
};
