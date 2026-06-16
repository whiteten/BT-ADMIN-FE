import { type UseQueryOptions, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { commonApi } from '../api/commonchApi';
import type { CodeItem, SttSystemItem } from '../types';

export const commonQueryKeys = createQueryKeys('stts', {
  getTenants: (params?: Record<string, unknown>) => [params],
  getCodesList: (params?: Record<string, unknown>) => [params],
  getSttSystemList: null,
});

export const useGetCodes = ({ params, queryOptions }: QueryHookWithParamsOptions<CodeItem[]> = {}) => {
  return useQuery({
    queryKey: commonQueryKeys.getCodesList(params).queryKey,
    queryFn: () => commonApi.getCodesList(params),
    ...queryOptions,
  });
};

export const useGetSttSystemList = ({ queryOptions }: { queryOptions?: UseQueryOptions<SttSystemItem[]> } = {}) => {
  return useQuery({
    queryKey: commonQueryKeys.getSttSystemList.queryKey,
    queryFn: () => commonApi.getSttSystemList(),
    ...queryOptions,
  });
};
