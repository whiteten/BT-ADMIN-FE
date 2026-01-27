import { useQuery } from '@tanstack/react-query';
import { type NavigationData, sharedApi } from '@/shared-api';
import type { QueryHookWithParamsOptions } from '@/libs/shared-util/src/lib/types/query.types';

/**
 * 네비게이션 데이터 조회
 */
export const useGetNavigation = ({ params, queryOptions }: QueryHookWithParamsOptions<NavigationData> = {}) => {
  return useQuery({
    queryKey: sharedApi.common.queryKeys.getNavigation(params).queryKey,
    queryFn: () => sharedApi.common.getNavigation(params),
    ...queryOptions,
  });
};
