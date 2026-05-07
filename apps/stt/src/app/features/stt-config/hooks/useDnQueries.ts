import { type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions } from '@/shared-util';
import { dnApi } from '../api/dnApi';
import type { SttDnCreateData, SttDnDeleteParams, SttDnItem, SttDnSearchParams, SttDnUpdateData } from '../types';

export const dnQueryKeys = createQueryKeys('dn', {
  getSttDnList: (params?: Record<string, unknown>) => [params],
});

export const useGetSttDnList = ({ params, queryOptions }: { params?: SttDnSearchParams | null; queryOptions?: UseQueryOptions<SttDnItem[]> } = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getSttDnList((params as Record<string, unknown>) ?? undefined).queryKey,
    queryFn: () => dnApi.getSttDnList(params ?? undefined),
    enabled: !!params,
    ...queryOptions,
  });
};

export const useCreateSttDn = ({ mutationOptions }: MutationHookOptions<unknown, SttDnCreateData> = {}) => {
  return useMutation({
    mutationFn: dnApi.createSttDn,
    ...mutationOptions,
  });
};

export const useUpdateSttDn = ({ mutationOptions }: MutationHookOptions<unknown, SttDnUpdateData> = {}) => {
  return useMutation({
    mutationFn: dnApi.updateSttDn,
    ...mutationOptions,
  });
};

export const useDeleteSttDn = ({ mutationOptions }: MutationHookOptions<unknown, SttDnDeleteParams> = {}) => {
  return useMutation({
    mutationFn: dnApi.deleteSttDn,
    ...mutationOptions,
  });
};
