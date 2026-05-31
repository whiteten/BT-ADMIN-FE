import { type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions } from '@/shared-util';
import { retryReqApi } from '../api/retryReqApi';
import type { RetryReqCreateParams, RetryReqListItem, RetryReqSearchParams, RetryReqTreeItem } from '../types';

export const retryReqQueryKeys = createQueryKeys('retryReq', {
  getRetryReqTree: null,
  getRetryReqList: (params?: Record<string, unknown>) => [params],
});

export const useGetRetryReqTree = ({ queryOptions }: { queryOptions?: Omit<UseQueryOptions<RetryReqTreeItem[]>, 'queryKey' | 'queryFn'> } = {}) => {
  return useQuery({
    queryKey: retryReqQueryKeys.getRetryReqTree.queryKey,
    queryFn: retryReqApi.getRetryReqTree,
    ...queryOptions,
  });
};

export const useGetRetryReqList = ({
  params,
  queryOptions,
}: { params?: RetryReqSearchParams | null; queryOptions?: Omit<UseQueryOptions<RetryReqListItem[]>, 'queryKey' | 'queryFn'> } = {}) => {
  return useQuery({
    queryKey: retryReqQueryKeys.getRetryReqList((params as unknown as Record<string, unknown>) ?? undefined).queryKey,
    queryFn: () => retryReqApi.getRetryReqList(params!),
    enabled: !!params?.retryDate,
    ...queryOptions,
  });
};

export const useCreateRetryReq = ({ mutationOptions }: MutationHookOptions<unknown, RetryReqCreateParams> = {}) => {
  return useMutation({
    mutationFn: retryReqApi.createRetryReq,
    ...mutationOptions,
  });
};

export const useDeleteRetryReq = ({ mutationOptions }: MutationHookOptions<unknown, string> = {}) => {
  return useMutation({
    mutationFn: retryReqApi.deleteRetryReq,
    ...mutationOptions,
  });
};
