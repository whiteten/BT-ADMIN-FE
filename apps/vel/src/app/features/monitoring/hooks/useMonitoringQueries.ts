import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { monitoringApi } from '../api/monitoringApi';
import type { EavesdropLogRequest, EavesdropUpdateRequest, MonitoringItem, MonitoringSearchParams, MruProcess, MruSystem } from '../types/monitoring';

export const monitoringQueryKeys = createQueryKeys('monitoring', {
  getList: (params?: Record<string, unknown>) => [params],
  getSystems: null,
  getProcesses: (systemId?: string | number) => [systemId],
});

export const useGetMonitoringList = ({ params, queryOptions }: QueryHookWithParamsOptions<MonitoringItem[]> & { params?: MonitoringSearchParams } = {}) => {
  return useQuery({
    queryKey: monitoringQueryKeys.getList(params as Record<string, unknown>).queryKey,
    queryFn: () => monitoringApi.getList(params as MonitoringSearchParams),
    enabled: !!params?.tenantId,
    ...queryOptions,
  });
};

export const useGetMonitoringSystems = ({ queryOptions }: QueryHookWithParamsOptions<MruSystem[]> = {}) => {
  return useQuery({
    queryKey: monitoringQueryKeys.getSystems.queryKey,
    queryFn: () => monitoringApi.getSystems(),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

export const useGetMonitoringProcesses = ({ systemId, queryOptions }: QueryHookWithParamsOptions<MruProcess[]> & { systemId?: string | number } = {}) => {
  return useQuery({
    queryKey: monitoringQueryKeys.getProcesses(systemId).queryKey,
    queryFn: () => monitoringApi.getProcesses(systemId as string | number),
    enabled: !!systemId,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

export const useUpdateRtUser = ({ mutationOptions }: MutationHookOptions<void, EavesdropUpdateRequest> = {}) => {
  return useMutation({
    mutationFn: (data: EavesdropUpdateRequest) => monitoringApi.updateRtUser(data),
    ...mutationOptions,
  });
};

export const useClearRtUser = ({ mutationOptions }: MutationHookOptions<void, { tenantId: string; dnNo: string }> = {}) => {
  return useMutation({
    mutationFn: ({ tenantId, dnNo }: { tenantId: string; dnNo: string }) => monitoringApi.clearRtUser(tenantId, dnNo),
    ...mutationOptions,
  });
};

export const useInsertRtLog = ({ mutationOptions }: MutationHookOptions<void, EavesdropLogRequest> = {}) => {
  return useMutation({
    mutationFn: (data: EavesdropLogRequest) => monitoringApi.insertRtLog(data),
    ...mutationOptions,
  });
};
