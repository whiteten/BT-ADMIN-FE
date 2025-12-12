import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { serviceBotApi } from '../api/serviceBotApi';
import type { ServiceBotItem, ServiceBotListItem, ServiceBotVersionItem, ServiceBotVersionListItem } from '../types';

export const serviceBotQueryKeys = createQueryKeys('service-bots', {
  getServiceBots: (params?: Record<string, unknown>) => [params],
  getServiceBot: (params?: Record<string, unknown>) => [params],
  getServiceBotVersions: (params?: Record<string, unknown>) => [params],
  getServiceBotVersion: (params?: Record<string, unknown>) => [params],
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

export const useUpdateServiceBotVoice = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: serviceBotApi.updateServiceBotVoice,
    ...mutationOptions,
  });
};

export const useUpdateServiceBotSchedule = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: serviceBotApi.updateServiceBotSchedule,
    ...mutationOptions,
  });
};

export const useGetServiceBotVersions = ({ params, queryOptions }: QueryHookWithParamsOptions<ServiceBotVersionListItem[]> = {}) => {
  return useQuery({
    queryKey: serviceBotQueryKeys.getServiceBotVersions(params).queryKey,
    queryFn: () => serviceBotApi.getServiceBotVersions(params),
    ...queryOptions,
  });
};

export const useGetServiceBotVersion = ({ params, queryOptions }: QueryHookWithParamsOptions<ServiceBotVersionItem> = {}) => {
  return useQuery({
    queryKey: serviceBotQueryKeys.getServiceBotVersion(params).queryKey,
    queryFn: () => serviceBotApi.getServiceBotVersion(params),
    ...queryOptions,
  });
};

export const useCreateServiceBotVersion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: serviceBotApi.createServiceBotVersion,
    ...mutationOptions,
  });
};

export const useUpdateServiceBotVersion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: serviceBotApi.updateServiceBotVersion,
    ...mutationOptions,
  });
};

export const useDeleteServiceBotVersion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: serviceBotApi.deleteServiceBotVersion,
    ...mutationOptions,
  });
};
