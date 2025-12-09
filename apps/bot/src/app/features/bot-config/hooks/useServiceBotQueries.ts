import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { serviceBotApi } from '../api/serviceBotApi';
import type { ServiceBotCreateRequest, ServiceBotListItem } from '../types';

const serviceBotQueryKeys = createQueryKeys('service-bots', {
  getServiceBots: (params?: Record<string, unknown>) => [params],
});

export const useGetServiceBots = ({ params, queryOptions }: QueryHookWithParamsOptions<ServiceBotListItem[]> = {}) => {
  return useQuery({
    queryKey: serviceBotQueryKeys.getServiceBots(params).queryKey,
    queryFn: () => serviceBotApi.getServiceBots(params),
    ...queryOptions,
  });
};

export const useCreateServiceBot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: (data: ServiceBotCreateRequest) => serviceBotApi.createServiceBot(data),
    ...mutationOptions,
  });
};
