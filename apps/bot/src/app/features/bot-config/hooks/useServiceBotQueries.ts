import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { serviceBotApi } from '../api/serviceBotApi';
import type { ServiceBotItem, ServiceBotListItem } from '../types';

const serviceBotQueryKeys = createQueryKeys('service-bots', {
  getServiceBots: (params?: Record<string, unknown>) => [params],
  getServiceBot: (params?: Record<string, unknown>) => [params],
});

export const useGetServiceBots = ({ params, queryOptions }: QueryHookWithParamsOptions<ServiceBotListItem[]> = {}) => {
  return useQuery({
    queryKey: serviceBotQueryKeys.getServiceBots(params).queryKey,
    queryFn: () => serviceBotApi.getServiceBots(params),
    ...queryOptions,
  });
};

export const useGetServiceBot = ({ params, queryOptions }: QueryHookWithParamsOptions<ServiceBotItem> = {}) => {
  return useQuery({
    queryKey: serviceBotQueryKeys.getServiceBot(params).queryKey,
    queryFn: () => serviceBotApi.getServiceBot(params),
    ...queryOptions,
  });
};

export const useCreateServiceBot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: serviceBotApi.createServiceBot,
    ...mutationOptions,
  });
};

export const useUpdateServiceBot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: serviceBotApi.updateServiceBot,
    ...mutationOptions,
  });
};

export const useDeleteServiceBot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: serviceBotApi.deleteServiceBot,
    ...mutationOptions,
  });
};
