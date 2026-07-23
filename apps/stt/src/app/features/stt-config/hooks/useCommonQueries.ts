import { type UseQueryOptions, useQuery } from '@tanstack/react-query';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { commonApi } from '../api/commonchApi';
import type { SttSystemItem } from '../types';

export const commonQueryKeys = createAppQueryKeys('stts', {
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
