import { useQuery } from '@tanstack/react-query';
import { sharedApi } from '@/shared-api';
import type { QueryHookWithParamsOptions } from '@/libs/shared-util/src/lib/types/query.types';

/**
 * 세션 조회 - health check
 */
export const useGetSession = ({ params, queryOptions }: QueryHookWithParamsOptions<unknown> = {}) => {
  return useQuery({
    queryKey: sharedApi.common.queryKeys.getSession(params).queryKey,
    queryFn: () => sharedApi.common.getSession(params),
    ...queryOptions,
  });
};
