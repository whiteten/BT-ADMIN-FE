import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { sttApi } from '../api/sttApi';
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
    queryFn: () => sttApi.getTenants(params),
    ...queryOptions,
  });
};

export const useGetSttSearch = ({ params, queryOptions }: QueryHookWithParamsOptions<SttSearchItem[]> = {}) => {
  return useQuery({
    queryKey: sttQueryKeys.getSttSearch(params as SttSearchParams).queryKey,
    queryFn: () => sttApi.getSttSearch(params as SttSearchParams),
    ...queryOptions,
  });
};

export const useGetSttSearchCallbot = ({ params, queryOptions }: QueryHookWithParamsOptions<SttSearchCallbotItem[]> = {}) => {
  return useQuery({
    queryKey: sttQueryKeys.getSttSearchCallbotList(params as SttSearchCallbotParams).queryKey,
    queryFn: () => sttApi.getSttSearchCallbot(params as SttSearchCallbotParams),
    ...queryOptions,
  });
};

export const useGetSttSearchCallbotDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<SttSearchCallbotDetailItem[]> = {}) => {
  return useQuery({
    queryKey: sttQueryKeys.getSttSearchCallbotDetail(params as SttSearchCallbotDetailParams).queryKey,
    queryFn: () => sttApi.getSttSearchCallbotDetail(params as SttSearchCallbotDetailParams),
    ...queryOptions,
  });
};
