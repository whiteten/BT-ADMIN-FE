import { useQuery } from '@tanstack/react-query';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { searchApi } from '../api/searchApi';
import type { SearchData } from '../types/search';

export const searchQueryKeys = createAppQueryKeys('search', {
  docs: (params?: Record<string, unknown>) => [params],
});

/** 매뉴얼 doc 검색 훅 — 메뉴 검색은 GlobalSearch가 navigation(menuConfigs) 기반 FE fuzzy로 처리 */
export const useSearchDocs = ({ params, queryOptions }: QueryHookWithParamsOptions<SearchData> = {}) => {
  return useQuery({
    queryKey: searchQueryKeys.docs(params).queryKey,
    queryFn: () => searchApi.searchDocs(params?.q as string, params?.limit as number | undefined),
    ...queryOptions,
  });
};
