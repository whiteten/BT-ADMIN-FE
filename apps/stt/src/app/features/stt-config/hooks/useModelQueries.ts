import { type UseQueryOptions, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { modelApi } from '../api/modelApi';
import type { SttModelItem, SttModelSearchParams } from '../types';

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
