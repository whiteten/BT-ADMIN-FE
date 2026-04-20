import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { searchApi } from '../api/searchApi';
import type { SttSearchCallbotDetailItem, SttSearchCallbotDetailParams, SttSearchCallbotItem, SttSearchCallbotParams, SttSearchItem, SttSearchParams, TenantItem } from '../types';

export const sttQueryKeys = createQueryKeys('stts', {
  getSttSearch: (params?: SttSearchParams) => [params],
  getTenants: (params?: Record<string, unknown>) => [params],
  getSttSearchCallbotList: (params?: SttSearchCallbotParams) => [params],
  getSttSearchCallbotDetail: (params?: SttSearchCallbotDetailParams) => [params],
});

export const useGetTenants = ({ params, queryOptions }: QueryHookWithParamsOptions<TenantItem[]> = {}) => {
  return useQuery({
    queryKey: sttQueryKeys.getTenants(params).queryKey,
    queryFn: () => searchApi.getTenants(params),
    ...queryOptions,
  });
};

export const useGetSttSearch = ({ params, queryOptions }: QueryHookWithParamsOptions<SttSearchItem[]> = {}) => {
  return useQuery({
    queryKey: sttQueryKeys.getSttSearch(params as SttSearchParams).queryKey,
    queryFn: () => searchApi.getSttSearch(params as SttSearchParams),
    ...queryOptions,
  });
};

export const useGetSttSearchCallbot = ({ params, queryOptions }: QueryHookWithParamsOptions<SttSearchCallbotItem[]> = {}) => {
  return useQuery({
    queryKey: sttQueryKeys.getSttSearchCallbotList(params as SttSearchCallbotParams).queryKey,
    queryFn: () => searchApi.getSttSearchCallbot(params as SttSearchCallbotParams),
    ...queryOptions,
  });
};

export const useGetSttSearchCallbotDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<SttSearchCallbotDetailItem[]> = {}) => {
  return useQuery({
    queryKey: sttQueryKeys.getSttSearchCallbotDetail(params as SttSearchCallbotDetailParams).queryKey,
    queryFn: () => searchApi.getSttSearchCallbotDetail(params as SttSearchCallbotDetailParams),
    ...queryOptions,
  });
};
