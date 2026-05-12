import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { statisticsApi } from '../api/statisticsApi';
import type {
  CategoryOptionListItem,
  DialogOptionListItem,
  DialogStatList,
  EntityOptionListItem,
  EntityStatList,
  IntentOptionListItem,
  IntentStatList,
  KeywordStatList,
  ServiceStatList,
  SlotOptionListItem,
  SlotStatList,
  UserDefStatList,
} from '../types/statistics.types';

export const statisticsQueryKeys = createQueryKeys('statistics', {
  getServiceStatList: (params?: Record<string, unknown>) => [params],
  getDialogStatList: (params?: Record<string, unknown>) => [params],
  getSlotStatList: (params?: Record<string, unknown>) => [params],
  getIntentStatList: (params?: Record<string, unknown>) => [params],
  getEntityStatList: (params?: Record<string, unknown>) => [params],
  getKeywordStatList: (params?: Record<string, unknown>) => [params],
  getUserDefStatList: (params?: Record<string, unknown>) => [params],
  getDialogOptionList: (params?: Record<string, unknown>) => [params],
  getSlotOptionList: (params?: Record<string, unknown>) => [params],
  getIntentOptionList: (params?: Record<string, unknown>) => [params],
  getEntityOptionList: (params?: Record<string, unknown>) => [params],
  getCategoryOptionList: (params?: Record<string, unknown>) => [params],
});

export const useGetServiceStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<ServiceStatList> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getServiceStatList(params).queryKey,
    queryFn: () => statisticsApi.getServiceStatList(params),
    ...queryOptions,
  });
};

export const useGetDialogStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<DialogStatList> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getDialogStatList(params).queryKey,
    queryFn: () => statisticsApi.getDialogStatList(params),
    ...queryOptions,
  });
};

export const useGetSlotStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<SlotStatList> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getSlotStatList(params).queryKey,
    queryFn: () => statisticsApi.getSlotStatList(params),
    ...queryOptions,
  });
};

export const useGetIntentStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<IntentStatList> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getIntentStatList(params).queryKey,
    queryFn: () => statisticsApi.getIntentStatList(params),
    ...queryOptions,
  });
};

export const useGetEntityStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<EntityStatList> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getEntityStatList(params).queryKey,
    queryFn: () => statisticsApi.getEntityStatList(params),
    ...queryOptions,
  });
};

export const useGetKeywordStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<KeywordStatList> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getKeywordStatList(params).queryKey,
    queryFn: () => statisticsApi.getKeywordStatList(params),
    ...queryOptions,
  });
};

export const useGetDialogOptionList = ({ params, queryOptions }: QueryHookWithParamsOptions<DialogOptionListItem[]> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getDialogOptionList(params).queryKey,
    queryFn: () => statisticsApi.getDialogOptionList(params),
    ...queryOptions,
  });
};

export const useGetSlotOptionList = ({ params, queryOptions }: QueryHookWithParamsOptions<SlotOptionListItem[]> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getSlotOptionList(params).queryKey,
    queryFn: () => statisticsApi.getSlotOptionList(params),
    ...queryOptions,
  });
};

export const useGetIntentOptionList = ({ params, queryOptions }: QueryHookWithParamsOptions<IntentOptionListItem[]> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getIntentOptionList(params).queryKey,
    queryFn: () => statisticsApi.getIntentOptionList(params),
    ...queryOptions,
  });
};

export const useGetEntityOptionList = ({ params, queryOptions }: QueryHookWithParamsOptions<EntityOptionListItem[]> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getEntityOptionList(params).queryKey,
    queryFn: () => statisticsApi.getEntityOptionList(params),
    ...queryOptions,
  });
};

export const useGetUserDefStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<UserDefStatList> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getUserDefStatList(params).queryKey,
    queryFn: () => statisticsApi.getUserDefStatList(params),
    ...queryOptions,
  });
};

export const useGetCategoryOptionList = ({ params, queryOptions }: QueryHookWithParamsOptions<CategoryOptionListItem[]> = {}) => {
  return useQuery({
    queryKey: statisticsQueryKeys.getCategoryOptionList(params).queryKey,
    queryFn: () => statisticsApi.getCategoryOptionList(params),
    ...queryOptions,
  });
};
