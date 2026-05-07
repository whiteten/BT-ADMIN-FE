import { type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions } from '@/shared-util';
import { modelApi } from '../api/modelApi';
import type { SttModelCreateData, SttModelItem, SttModelSearchParams } from '../types';

export const modelQueryKeys = createQueryKeys('model', {
  getSttModelList: (params?: Record<string, unknown>) => [params],
});

export const useGetSttModelList = ({ params, queryOptions }: { params?: SttModelSearchParams | null; queryOptions?: UseQueryOptions<SttModelItem[]> } = {}) => {
  return useQuery({
    queryKey: modelQueryKeys.getSttModelList((params as Record<string, unknown>) ?? undefined).queryKey,
    queryFn: () => modelApi.getSttModelList(params ?? undefined),
    enabled: !!params,
    ...queryOptions,
  });
};

export const useCreateSttModel = ({ mutationOptions }: MutationHookOptions<unknown, SttModelCreateData> = {}) => {
  return useMutation({
    mutationFn: modelApi.createSttModel,
    ...mutationOptions,
  });
};
