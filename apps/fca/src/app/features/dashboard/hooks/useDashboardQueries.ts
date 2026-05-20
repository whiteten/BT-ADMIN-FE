import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { dashboardApi } from '../api/dashboardApi';
import type { BotDashboardResponse } from '../types';

export const dashboardQueryKeys = createQueryKeys('dashboard', {
  getBotDashboard: (params?: Record<string, unknown>) => [params],
});

export const useGetBotDashboard = ({ params, queryOptions }: QueryHookWithParamsOptions<BotDashboardResponse> = {}) => {
  return useQuery({
    queryKey: dashboardQueryKeys.getBotDashboard(params).queryKey,
    queryFn: () => dashboardApi.getBotDashboard(params),
    ...queryOptions,
  });
};
