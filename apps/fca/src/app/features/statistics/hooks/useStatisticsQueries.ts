import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { statisticsApi } from '../api/statisticsApi';
import type { DialogStatListItem, EntityStatListItem, IntentStatListItem, KeywordStatListItem, ServiceStatListItem, SlotStatListItem } from '../types/statistics.types';

export const statisticsQueryKeys = createQueryKeys('statistics', {
  getServiceStatList: (params?: Record<string, unknown>) => [params],
  getDialogStatList: (params?: Record<string, unknown>) => [params],
  getSlotStatList: (params?: Record<string, unknown>) => [params],
  getIntentStatList: (params?: Record<string, unknown>) => [params],
  getEntityStatList: (params?: Record<string, unknown>) => [params],
  getKeywordStatList: (params?: Record<string, unknown>) => [params],
});

export const useGetServiceStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<ServiceStatListItem[]> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getServiceStatList(params).queryKey,
    queryFn: () => statisticsApi.getServiceStatList(params),
    ...queryOptions,
  });
};

export const useGetDialogStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<DialogStatListItem[]> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getDialogStatList(params).queryKey,
    queryFn: () => statisticsApi.getDialogStatList(params),
    ...queryOptions,
  });
};

export const useGetSlotStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<SlotStatListItem[]> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getSlotStatList(params).queryKey,
    queryFn: () => statisticsApi.getSlotStatList(params),
    ...queryOptions,
  });
};

export const useGetIntentStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<IntentStatListItem[]> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getIntentStatList(params).queryKey,
    queryFn: () => statisticsApi.getIntentStatList(params),
    ...queryOptions,
  });
};

export const useGetEntityStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<EntityStatListItem[]> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getEntityStatList(params).queryKey,
    queryFn: () => statisticsApi.getEntityStatList(params),
    ...queryOptions,
  });
};

export const useGetKeywordStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<KeywordStatListItem[]> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getKeywordStatList(params).queryKey,
    queryFn: () => statisticsApi.getKeywordStatList(params),
    ...queryOptions,
  });
};
