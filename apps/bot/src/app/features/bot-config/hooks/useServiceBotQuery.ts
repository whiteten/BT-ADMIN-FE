import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { serviceBotApi } from '../api/serviceBotApi';

const serviceBotQueryKeys = createQueryKeys('service-bots', {
  getServiceBots: (params?: Record<string, unknown>) => [params],
});

export const useGetServiceBots = ({ params, queryOptions }: QueryHookWithParamsOptions = {}) => {
  return useQuery({
    queryKey: serviceBotQueryKeys.getServiceBots(params).queryKey,
    queryFn: () => serviceBotApi.getServiceBots(params),
    ...queryOptions,
  });
};
