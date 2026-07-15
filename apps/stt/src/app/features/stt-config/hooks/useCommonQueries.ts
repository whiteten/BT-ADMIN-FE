import { type UseQueryOptions, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { commonApi } from '../api/commonchApi';
import type { SttSystemItem } from '../types';

export const commonQueryKeys = createQueryKeys('stts', {
  getTenants: (params?: Record<string, unknown>) => [params],
  getSttSystemList: null,
});

export const useGetSttSystemList = ({ queryOptions }: { queryOptions?: UseQueryOptions<SttSystemItem[]> } = {}) => {
  return useQuery({
    queryKey: commonQueryKeys.getSttSystemList.queryKey,
    queryFn: () => commonApi.getSttSystemList(),
    ...queryOptions,
  });
};
