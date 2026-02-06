import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { sdDashboardApi, sdSchedulerApi } from '../api/sdApi';
import type { BatchStatus, Checkpoint, ExceptionRecord, HourlyTrend, SchedulerStatus } from '../types/sd.types';

export const sdQueryKeys = createQueryKeys('sd', {
  getProviders: null,
  getAllStatus: null,
  getStatus: (params?: Record<string, unknown>) => [params],
  getHourlyTrend: (params?: Record<string, unknown>) => [params],
  getRecentCounts: (params?: Record<string, unknown>) => [params],
  getCheckpoints: (params?: Record<string, unknown>) => [params],
  getExceptions: (params?: Record<string, unknown>) => [params],
  getAllSchedulerStatus: null,
  getSchedulerStatus: (params?: Record<string, unknown>) => [params],
});

// === Dashboard Queries ===

export const useGetProviders = ({ queryOptions }: QueryHookWithParamsOptions<string[]> = {}) => {
  return useQuery({
    queryKey: sdQueryKeys.getProviders.queryKey,
    queryFn: () => sdDashboardApi.getProviders(),
    ...queryOptions,
  });
};

export const useGetAllStatus = ({ queryOptions }: QueryHookWithParamsOptions<Record<string, BatchStatus>> = {}) => {
  return useQuery({
    queryKey: sdQueryKeys.getAllStatus.queryKey,
    queryFn: () => sdDashboardApi.getAllStatus(),
    ...queryOptions,
  });
};

export const useGetStatus = ({ params, queryOptions }: QueryHookWithParamsOptions<BatchStatus> = {}) => {
  const providerId = params?.providerId as string;
  return useQuery({
    queryKey: sdQueryKeys.getStatus({ providerId }).queryKey,
    queryFn: () => sdDashboardApi.getStatus(providerId),
    enabled: !!providerId,
    ...queryOptions,
  });
};

export const useGetHourlyTrend = ({ params, queryOptions }: QueryHookWithParamsOptions<HourlyTrend[]> = {}) => {
  const providerId = params?.providerId as string;
  const date = params?.date as string | undefined;
  return useQuery({
    queryKey: sdQueryKeys.getHourlyTrend({ providerId, date }).queryKey,
    queryFn: () => sdDashboardApi.getHourlyTrend(providerId, date),
    enabled: !!providerId,
    ...queryOptions,
  });
};

export const useGetRecentCounts = ({ params, queryOptions }: QueryHookWithParamsOptions<HourlyTrend[]> = {}) => {
  const providerId = params?.providerId as string;
  const date = params?.date as string | undefined;
  return useQuery({
    queryKey: sdQueryKeys.getRecentCounts({ providerId, date }).queryKey,
    queryFn: () => sdDashboardApi.getRecentCounts(providerId, date),
    enabled: !!providerId,
    ...queryOptions,
  });
};

export const useGetCheckpoints = ({ params, queryOptions }: QueryHookWithParamsOptions<Checkpoint[]> = {}) => {
  const providerId = params?.providerId as string;
  const from = params?.from as string;
  const to = params?.to as string;
  return useQuery({
    queryKey: sdQueryKeys.getCheckpoints({ providerId, from, to }).queryKey,
    queryFn: () => sdDashboardApi.getCheckpoints(providerId, from, to),
    enabled: !!providerId && !!from && !!to,
    ...queryOptions,
  });
};

export const useGetExceptions = ({ params, queryOptions }: QueryHookWithParamsOptions<ExceptionRecord[]> = {}) => {
  const providerId = params?.providerId as string;
  const from = params?.from as string;
  const to = params?.to as string;
  return useQuery({
    queryKey: sdQueryKeys.getExceptions({ providerId, from, to }).queryKey,
    queryFn: () => sdDashboardApi.getExceptions(providerId, from, to),
    enabled: !!providerId && !!from && !!to,
    ...queryOptions,
  });
};

// === Scheduler Queries ===

export const useGetAllSchedulerStatus = ({ queryOptions }: QueryHookWithParamsOptions<Record<string, SchedulerStatus>> = {}) => {
  return useQuery({
    queryKey: sdQueryKeys.getAllSchedulerStatus.queryKey,
    queryFn: () => sdSchedulerApi.getAllStatus(),
    ...queryOptions,
  });
};

export const useGetSchedulerStatus = ({ params, queryOptions }: QueryHookWithParamsOptions<SchedulerStatus> = {}) => {
  const providerId = params?.providerId as string;
  return useQuery({
    queryKey: sdQueryKeys.getSchedulerStatus({ providerId }).queryKey,
    queryFn: () => sdSchedulerApi.getStatus(providerId),
    enabled: !!providerId,
    ...queryOptions,
  });
};

// === Scheduler Mutations ===

export const usePauseScheduler = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ({ providerId, reason }: { providerId: string; reason: string }) => sdSchedulerApi.pause(providerId, { reason }),
    ...mutationOptions,
  });
};

export const useResumeScheduler = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: (providerId: string) => sdSchedulerApi.resume(providerId),
    ...mutationOptions,
  });
};
