import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { a2aApi } from '../api/a2aApi';
import type { A2ACreateDatas, A2AItem, A2AUpdateDatas } from '../types';

export const a2aQueryKeys = createQueryKeys('a2a', {
  getA2AList: (params?: Record<string, unknown>) => [params],
});

export const useGetA2AList = ({ queryOptions }: QueryHookWithParamsOptions<A2AItem[]> = {}) => {
  return useQuery({
    queryKey: a2aQueryKeys.getA2AList().queryKey,
    queryFn: () => a2aApi.getA2AList(),
    ...queryOptions,
  });
};

export const useCreateA2A = ({ mutationOptions }: MutationHookOptions<void, A2ACreateDatas> = {}) => {
  return useMutation({
    mutationFn: a2aApi.createA2A,
    ...mutationOptions,
  });
};

export const useUpdateA2A = ({ mutationOptions }: MutationHookOptions<void, { params: { a2aId: string }; data: A2AUpdateDatas }> = {}) => {
  return useMutation({
    mutationFn: a2aApi.updateA2A,
    ...mutationOptions,
  });
};

export const useDeleteA2A = ({ mutationOptions }: MutationHookOptions<void, { a2aId: string }> = {}) => {
  return useMutation({
    mutationFn: (params) => a2aApi.deleteA2A(params),
    ...mutationOptions,
  });
};
