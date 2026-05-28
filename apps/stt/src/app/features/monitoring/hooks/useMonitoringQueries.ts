import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { monitoringApi } from '../api/monitoringApi';
import type {
  CallStatusItem,
  CallStatusSearchParams,
  CallStatusSummaryItem,
  ChannelStatusItem,
  ChannelStatusSearchParams,
  DashboardData,
  DashboardSearchParams,
  DnStatusItem,
  DnStatusSearchParams,
  SttChatSentence,
} from '../types';

export const monitoringQueryKeys = createQueryKeys('monitoring', {
  getChannelStatusList: (params?: Record<string, unknown>) => [params],
  getDnStatusList: (params?: Record<string, unknown>) => [params],
  getRealtimeSentence: (params?: Record<string, unknown>) => [params],
  getCallStatusList: (params?: Record<string, unknown>) => [params],
  getDashboard: (params?: Record<string, unknown>) => [params],
});

export const useGetChannelStatusList = ({ params, queryOptions }: QueryHookWithParamsOptions<ChannelStatusItem[]> = {}) => {
  return useQuery({
    queryKey: monitoringQueryKeys.getChannelStatusList(params).queryKey,
    queryFn: () => monitoringApi.getChannelStatusList(params as unknown as ChannelStatusSearchParams),
    enabled: !!(params as unknown as ChannelStatusSearchParams)?.ipv4,
    ...queryOptions,
  });
};

export const useGetDnStatusList = ({ params, queryOptions }: QueryHookWithParamsOptions<DnStatusItem[]> = {}) => {
  return useQuery({
    queryKey: monitoringQueryKeys.getDnStatusList(params).queryKey,
    queryFn: () => monitoringApi.getDnStatusList(params as unknown as DnStatusSearchParams),
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

export const useGetCallStatusList = ({ params, queryOptions }: QueryHookWithParamsOptions<{ summary: CallStatusSummaryItem[]; items: CallStatusItem[] }> = {}) => {
  return useQuery({
    queryKey: monitoringQueryKeys.getCallStatusList(params).queryKey,
    queryFn: () => monitoringApi.getCallStatusList(params as unknown as CallStatusSearchParams),
    enabled: !!(params as unknown as CallStatusSearchParams)?.callDate,
    ...queryOptions,
  });
};

export const useGetDashboard = ({ params, queryOptions }: QueryHookWithParamsOptions<DashboardData> = {}) => {
  return useQuery({
    queryKey: monitoringQueryKeys.getDashboard(params).queryKey,
    queryFn: () => monitoringApi.getDashboard(params as unknown as DashboardSearchParams),
    enabled: !!(params as unknown as DashboardSearchParams)?.callDate,
    ...queryOptions,
  });
};
