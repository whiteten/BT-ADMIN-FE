/**
 * 단말기 이력 React Query 훅 (IPR20S2130)
 */
import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookOptions } from '@/shared-util';
import { type DevHistoryListResult, deviceHistoryApi } from '../api/deviceHistoryApi';
import type { DevHistorySearchParams } from '../types';

export const deviceHistoryQueryKeys = createQueryKeys('deviceHistories', {
  list: (params?: Record<string, unknown>) => [params],
});

export const useGetDeviceHistories = (params?: DevHistorySearchParams, { queryOptions }: QueryHookOptions<DevHistoryListResult> = {}) =>
  useQuery({
    queryKey: deviceHistoryQueryKeys.list(params as Record<string, unknown>).queryKey,
    queryFn: () => deviceHistoryApi.list(params),
    ...queryOptions,
  });
