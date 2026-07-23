import { type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { retryReqApi } from '../api/retryReqApi';
import type { RetryReqCreateParams, RetryReqListItem, RetryReqSearchParams, RetryReqTreeItem } from '../types';

export const retryReqQueryKeys = createAppQueryKeys('retryReq', {
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

export const useDeleteRetryReq = ({ mutationOptions }: MutationHookOptions<unknown, { tenantId: number; retryDate: string }> = {}) => {
  return useMutation({
    mutationFn: retryReqApi.deleteRetryReq,
    ...mutationOptions,
  });
};
