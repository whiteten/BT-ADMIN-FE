/**
 * SLEE 환경변수 React Query 훅
 */
import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { sleeConfigApi } from '../api/sleeConfigApi';
import type { SleeConfigCategory, SleeConfigFile, SleeConfigProperty, SleeConfigTenant } from '../types/sleeConfig.types';

export const sleeConfigQueryKeys = createQueryKeys('sleeConfig', {
  getTenants: null,
  getConfigFiles: (params?: Record<string, unknown>) => [params],
  getCategories: (params?: Record<string, unknown>) => [params],
  getProperties: (params?: Record<string, unknown>) => [params],
});

export const useGetSleeConfigTenants = ({ queryOptions }: QueryHookOptions<SleeConfigTenant[]> = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getTenants.queryKey,
    queryFn: () => sleeConfigApi.getTenants(),
    ...queryOptions,
  });
};

export const useGetSleeConfigFiles = ({ params, queryOptions }: QueryHookWithParamsOptions<SleeConfigFile[]> = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getConfigFiles(params).queryKey,
    queryFn: () => sleeConfigApi.getConfigFiles(params),
    ...queryOptions,
  });
};

export const useGetSleeConfigCategories = ({ params, queryOptions }: QueryHookWithParamsOptions<SleeConfigCategory[]> = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getCategories(params).queryKey,
    queryFn: () => sleeConfigApi.getCategories(params ?? {}),
    ...queryOptions,
  });
};

export const useGetSleeConfigProperties = ({ params, queryOptions }: QueryHookWithParamsOptions<SleeConfigProperty[]> = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getProperties(params).queryKey,
    queryFn: () => sleeConfigApi.getProperties(params ?? {}),
    ...queryOptions,
  });
};
