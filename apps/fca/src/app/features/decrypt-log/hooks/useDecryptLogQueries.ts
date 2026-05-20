import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { decryptLogApi } from '../api/decryptLogApi';
import type { DecryptLogStat, PagedDecryptLog } from '../types';

export const decryptLogQueryKeys = createQueryKeys('decryptLog', {
  list: (params?: Record<string, unknown>) => [params],
  stats: (params?: Record<string, unknown>) => [params],
});

/** 감사 이력 목록 조회 훅 */
export const useGetDecryptLogList = ({ params, queryOptions }: QueryHookWithParamsOptions<PagedDecryptLog> = {}) => {
  return useQuery({
    queryKey: decryptLogQueryKeys.list(params).queryKey,
    queryFn: () => decryptLogApi.list(params),
    ...queryOptions,
  });
};

/** 감사 이력 통계 조회 훅 */
export const useGetDecryptLogStats = ({ params, queryOptions }: QueryHookWithParamsOptions<DecryptLogStat> = {}) => {
  return useQuery({
    queryKey: decryptLogQueryKeys.stats(params).queryKey,
    queryFn: () => decryptLogApi.stats(params),
    ...queryOptions,
  });
};
