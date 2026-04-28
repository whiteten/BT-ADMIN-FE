import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { commonApi } from '../api/commonchApi';
import type { CodeItem, TenantItem } from '../types';

export const commonQueryKeys = createQueryKeys('stts', {
  getTenants: (params?: Record<string, unknown>) => [params],
  getCodesList: (params?: Record<string, unknown>) => [params],
});

export const useGetTenants = ({ params, queryOptions }: QueryHookWithParamsOptions<TenantItem[]> = {}) => {
  return useQuery({
    queryKey: commonQueryKeys.getTenants(params).queryKey,
    queryFn: () => commonApi.getTenants(params),
    ...queryOptions,
  });
};

export const useGetCodes = ({ params, queryOptions }: QueryHookWithParamsOptions<CodeItem[]> = {}) => {
  return useQuery({
    queryKey: commonQueryKeys.getCodesList(params).queryKey,
    queryFn: () => commonApi.getCodesList(params),
    ...queryOptions,
  });
};
