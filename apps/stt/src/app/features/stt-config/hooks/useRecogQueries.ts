import { type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions } from '@/shared-util';
import { recogApi } from '../api/recogApi';
import type { RecogGroupCreateData, RecogGroupItem, RecogGroupUpdateData, RecogTargetCreateData, RecogTargetSearchItem } from '../types';

export const recogQueryKeys = createQueryKeys('recog', {
  getRecogGroupList: (params?: Record<string, unknown>) => [params],
  getRecogGroupDetail: (groupCode?: string) => [{ groupCode }],
  searchRecogTarget: (params?: Record<string, unknown>) => [params],
  getRecogTargetList: (params?: { groupCode?: string; engineCode?: string }) => [params],
});

export const useGetRecogGroupList = ({ params, queryOptions }: { params?: { engineCode?: string }; queryOptions?: UseQueryOptions<RecogGroupItem[]> } = {}) => {
  return useQuery({
    queryKey: recogQueryKeys.getRecogGroupList((params as Record<string, unknown>) ?? undefined).queryKey,
    queryFn: () => recogApi.getRecogGroupList(params),
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

export const useGetRecogTargetList = (params: { groupCode: string; engineCode?: string } | undefined) => {
  return useQuery({
    queryKey: recogQueryKeys.getRecogTargetList(params).queryKey,
    queryFn: () => recogApi.getRecogTargetList(params as { groupCode: string; engineCode?: string }),
    enabled: !!params?.groupCode,
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
