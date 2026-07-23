/**
 * 단말기 이력 React Query 훅 (IPR20S2130)
 */
import { useQuery } from '@tanstack/react-query';
import type { QueryHookOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { type DevHistoryListResult, deviceHistoryApi } from '../api/deviceHistoryApi';
import type { DevHistorySearchParams } from '../types';

export const deviceHistoryQueryKeys = createAppQueryKeys('deviceHistories', {
  list: (params?: Record<string, unknown>) => [params],
});

export const useGetDeviceHistories = (params?: DevHistorySearchParams, { queryOptions }: QueryHookOptions<DevHistoryListResult> = {}) =>
  useQuery({
    queryKey: deviceHistoryQueryKeys.list(params as Record<string, unknown>).queryKey,
    queryFn: () => deviceHistoryApi.list(params),
    ...queryOptions,
  });
