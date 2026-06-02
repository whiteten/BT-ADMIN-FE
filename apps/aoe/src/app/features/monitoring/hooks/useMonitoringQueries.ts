import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { monitoringApi } from '../api/monitoringApi';
import type { AoeDashboardResponse } from '../types';

export const monitoringQueryKeys = createQueryKeys('aoe-monitoring', {
  getDashboard: (params?: Record<string, unknown>) => [params],
});

/**
 * 대시보드 초기 로드/폴백 조회. WS 연결 전/실패 시 사용한다.
 */
export const useGetAoeDashboard = ({ params, queryOptions }: QueryHookWithParamsOptions<AoeDashboardResponse | undefined> = {}) => {
  return useQuery({
    queryKey: monitoringQueryKeys.getDashboard(params).queryKey,
    queryFn: () => monitoringApi.getDashboard(params),
    ...queryOptions,
  });
};
