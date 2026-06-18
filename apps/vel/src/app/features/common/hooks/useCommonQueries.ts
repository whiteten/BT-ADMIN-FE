import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { commonApi } from '../api/commonApi';
import type { AgentItem, GroupItem, PopupParams, TenantListItem } from '../types/common';

export const commonQueryKeys = createQueryKeys('vel-common', {
  getTenants: null,
  getGroups: (params?: Record<string, unknown>) => [params],
  getAgents: (params?: Record<string, unknown>) => [params],
});

export const useGetTenants = ({ queryOptions }: QueryHookWithParamsOptions<TenantListItem[]> = {}) => {
  return useQuery({
    queryKey: commonQueryKeys.getTenants.queryKey,
    queryFn: () => commonApi.getTenants(),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

export const useGetGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<GroupItem[]> & { params?: PopupParams } = {}) => {
  return useQuery({
    queryKey: commonQueryKeys.getGroups(params as Record<string, unknown>).queryKey,
    queryFn: () => commonApi.getGroups(params as PopupParams),
    enabled: !!params?.tenantId,
    staleTime: 3 * 60 * 1000,
    ...queryOptions,
  });
};

export const useGetAgents = ({ params, queryOptions }: QueryHookWithParamsOptions<AgentItem[]> & { params?: PopupParams } = {}) => {
  return useQuery({
    queryKey: commonQueryKeys.getAgents(params as Record<string, unknown>).queryKey,
    queryFn: () => commonApi.getAgents(params as PopupParams),
    enabled: !!params?.tenantId,
    staleTime: 3 * 60 * 1000,
    ...queryOptions,
  });
};
