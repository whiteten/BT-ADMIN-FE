/**
 * 앱 관리 React Query 훅
 */
import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookOptions } from '@/shared-util';
import { type App, appApi } from '../api/appApi';

export const appQueryKeys = createQueryKeys('apps', {
  getApps: null,
});

/**
 * 앱 목록 조회 훅
 */
export const useGetApps = ({ queryOptions }: QueryHookOptions<App[]> = {}) => {
  return useQuery({
    queryKey: appQueryKeys.getApps.queryKey,
    queryFn: appApi.getApps,
    ...queryOptions,
  });
};
