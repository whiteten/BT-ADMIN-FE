import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { searchApi } from '../api/searchApi';
import type { SearchData } from '../types/search';

export const searchQueryKeys = createQueryKeys('search', {
  search: (params?: Record<string, unknown>) => [params],
});

export const useSearchMenus = ({ params, queryOptions }: QueryHookWithParamsOptions<SearchData> = {}) => {
  return useQuery({
    queryKey: searchQueryKeys.search(params).queryKey,
    queryFn: () => searchApi.search(params?.q as string, params?.limit as number | undefined),
    ...queryOptions,
  });
};
