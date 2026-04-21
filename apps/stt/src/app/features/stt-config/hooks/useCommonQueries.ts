import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { commonApi } from '../api/commonchApi';
import type { EngineItem, TenantItem } from '../types';

export const commonQueryKeys = createQueryKeys('stts', {
  getTenants: (params?: Record<string, unknown>) => [params],
  getEngineList: null,
});

export const useGetTenants = ({ params, queryOptions }: QueryHookWithParamsOptions<TenantItem[]> = {}) => {
  return useQuery({
    queryKey: commonQueryKeys.getTenants(params).queryKey,
    queryFn: () => commonApi.getTenants(params),
    ...queryOptions,
  });
};

export const useGetEngines = ({ queryOptions }: QueryHookOptions<EngineItem[]> = {}) => {
  return useQuery({
    queryKey: commonQueryKeys.getEngineList.queryKey,
    queryFn: () => commonApi.getEngineList(),
    ...queryOptions,
  });
};
