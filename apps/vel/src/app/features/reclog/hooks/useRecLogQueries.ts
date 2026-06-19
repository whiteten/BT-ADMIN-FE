import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { recLogApi } from '../api/recLogApi';
import type { RecLogPagedResult, RecLogSearchParams, RecReasonTypeRequest, RecReasonTypeSearchParams } from '../types/rec-log';

export const recLogQueryKeys = createQueryKeys('rec-log', {
  getRecLogs: (params?: Record<string, unknown>) => [params],
  getReasonTypes: (params?: Record<string, unknown>) => [params],
});

export const useGetRecLogs = ({ params, queryOptions }: QueryHookWithParamsOptions<RecLogPagedResult> & { params?: RecLogSearchParams } = {}) => {
  return useQuery({
    queryKey: recLogQueryKeys.getRecLogs(params as Record<string, unknown>).queryKey,
    queryFn: () => recLogApi.getRecLogs(params as RecLogSearchParams),
    enabled: !!params?.startDate && !!params?.endDate,
    ...queryOptions,
  });
};

export const useGetReasonTypes = (params: RecReasonTypeSearchParams, enabled = false) => {
  return useQuery({
    queryKey: recLogQueryKeys.getReasonTypes(params as Record<string, unknown>).queryKey,
    queryFn: () => recLogApi.getReasonTypes(params),
    enabled,
  });
};

export const useCreateReasonType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecReasonTypeRequest) => recLogApi.createReasonType(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recLogQueryKeys.getReasonTypes._def }),
  });
};

export const useUpdateReasonType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, code, data }: { tenantId: string; code: string; data: RecReasonTypeRequest }) => recLogApi.updateReasonType(tenantId, code, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recLogQueryKeys.getReasonTypes._def }),
  });
};

export const useDeleteReasonType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, code }: { tenantId: string; code: string }) => recLogApi.deleteReasonType(tenantId, code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recLogQueryKeys.getReasonTypes._def }),
  });
};
