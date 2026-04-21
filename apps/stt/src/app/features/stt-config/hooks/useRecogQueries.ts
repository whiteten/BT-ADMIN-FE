import { type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions } from '@/shared-util';
import { recogApi } from '../api/recogApi';
import type { RecogGroupCreateData, RecogGroupItem, RecogGroupUpdateData, RecogTargetAddData, RecogTargetItem } from '../types';

export const recogQueryKeys = createQueryKeys('recog', {
  getRecogGroupList: null,
  getRecogGroupDetail: (groupCode?: string) => [{ groupCode }],
  searchRecogTarget: (params?: Record<string, unknown>) => [params],
  getRecogTargetList: (groupCode?: string) => [{ groupCode }],
});

export const useGetRecogGroupList = ({ queryOptions }: { queryOptions?: UseQueryOptions<RecogGroupItem[]> } = {}) => {
  return useQuery({
    queryKey: recogQueryKeys.getRecogGroupList.queryKey,
    queryFn: () => recogApi.getRecogGroupList(),
    ...queryOptions,
  });
};

export const useGetRecogGroupDetail = (groupCode: string | undefined) => {
  return useQuery({
    queryKey: recogQueryKeys.getRecogGroupDetail(groupCode).queryKey,
    queryFn: () => recogApi.getRecogGroupDetail(groupCode as string),
    enabled: !!groupCode,
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

export const useSearchRecogTarget = ({ params, queryOptions }: { params?: Record<string, unknown> | null; queryOptions?: UseQueryOptions<RecogTargetItem[]> } = {}) => {
  return useQuery({
    queryKey: recogQueryKeys.searchRecogTarget(params ?? undefined).queryKey,
    queryFn: () => recogApi.searchRecogTarget(params as Record<string, unknown>),
    enabled: !!params,
    ...queryOptions,
  });
};

export const useAddRecogTarget = ({ mutationOptions }: MutationHookOptions<unknown, RecogTargetAddData> = {}) => {
  return useMutation({
    mutationFn: recogApi.addRecogTarget,
    ...mutationOptions,
  });
};

export const useGetRecogTargetList = (groupCode: string | undefined) => {
  return useQuery({
    queryKey: recogQueryKeys.getRecogTargetList(groupCode).queryKey,
    queryFn: () => recogApi.getRecogTargetList(groupCode as string),
    enabled: !!groupCode,
  });
};

export const useDeleteRecogTarget = ({ mutationOptions }: MutationHookOptions<unknown, number> = {}) => {
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

export const useMeasureRecogAccuracy = ({ mutationOptions }: MutationHookOptions<unknown, string> = {}) => {
  return useMutation({
    mutationFn: recogApi.measureRecogAccuracy,
    ...mutationOptions,
  });
};
