import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { monitoringApi } from '../api/monitoringApi';
import type { ChannelStatusItem, ChannelStatusSearchParams, DnStatusItem, DnStatusSearchParams, SttChatSentence } from '../types';

export const monitoringQueryKeys = createQueryKeys('monitoring', {
  getChannelStatusList: (params?: Record<string, unknown>) => [params],
  getDnStatusList: (params?: Record<string, unknown>) => [params],
  getRealtimeSentence: (params?: Record<string, unknown>) => [params],
});

export const useGetChannelStatusList = ({ params, queryOptions }: QueryHookWithParamsOptions<ChannelStatusItem[]> = {}) => {
  return useQuery({
    queryKey: monitoringQueryKeys.getChannelStatusList(params).queryKey,
    queryFn: () => monitoringApi.getChannelStatusList(params as unknown as ChannelStatusSearchParams),
    enabled: !!(params as unknown as ChannelStatusSearchParams)?.ipv4,
    refetchInterval: 3000,
    ...queryOptions,
  });
};

export const useGetDnStatusList = ({ params, queryOptions }: QueryHookWithParamsOptions<DnStatusItem[]> = {}) => {
  return useQuery({
    queryKey: monitoringQueryKeys.getDnStatusList(params).queryKey,
    queryFn: () => monitoringApi.getDnStatusList(params as unknown as DnStatusSearchParams),
    refetchInterval: 3000,
    ...queryOptions,
  });
};

export const useGetRealtimeSentence = ({ params, queryOptions }: QueryHookWithParamsOptions<SttChatSentence[]> = {}) => {
  return useQuery({
    queryKey: monitoringQueryKeys.getRealtimeSentence(params).queryKey,
    queryFn: () => monitoringApi.getRealtimeSentence(params as { ucidGkey: string }),
    enabled: !!(params as { ucidGkey?: string })?.ucidGkey,
    refetchInterval: 500,
    ...queryOptions,
  });
};
