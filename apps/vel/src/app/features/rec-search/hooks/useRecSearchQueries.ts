import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { recSearchApi } from '../api/recSearchApi';
import type { CustInfoField, MarkCode, RecFileListItem, RecFilePagedResult, RecMarkingRequest, RecSearchParams, RecUpdateInfoRequest } from '../types';

export const recSearchQueryKeys = createQueryKeys('rec-search', {
  getRecordings: (params?: Record<string, unknown>) => [params],
  getRecording: (params?: Record<string, unknown>) => [params],
  getMarkCodes: (tenantId?: string) => [tenantId],
  getCustInfoFields: (tenantId?: string) => [tenantId],
});

export const useGetRecordings = ({ params, queryOptions }: QueryHookWithParamsOptions<RecFilePagedResult> & { params?: RecSearchParams } = {}) => {
  return useQuery({
    queryKey: recSearchQueryKeys.getRecordings(params as Record<string, unknown>).queryKey,
    queryFn: () => recSearchApi.getRecordings(params as RecSearchParams),
    enabled: !!params?.startDate && !!params?.endDate,
    ...queryOptions,
  });
};

export const useGetRecording = ({ params, queryOptions }: QueryHookWithParamsOptions<RecFileListItem> & { params?: { recKey: string } } = {}) => {
  return useQuery({
    queryKey: recSearchQueryKeys.getRecording(params as Record<string, unknown>).queryKey,
    queryFn: () => recSearchApi.getRecording(params as { recKey: string }),
    enabled: !!params?.recKey,
    ...queryOptions,
  });
};

export const useUpdateRecordingInfo = ({ mutationOptions }: MutationHookOptions<void, { recKey: string } & RecUpdateInfoRequest> = {}) => {
  return useMutation({
    mutationFn: ({ recKey, ...data }) => recSearchApi.updateRecordingInfo(recKey, data),
    ...mutationOptions,
  });
};

export const useGetMarkCodes = ({ params, queryOptions }: QueryHookWithParamsOptions<MarkCode[]> & { params?: { tenantId: string } } = {}) => {
  return useQuery({
    queryKey: recSearchQueryKeys.getMarkCodes(params?.tenantId).queryKey,
    queryFn: () => recSearchApi.getMarkCodes(params?.tenantId ?? ''),
    enabled: !!params?.tenantId,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

export const useGetCustInfoFields = ({ params, queryOptions }: QueryHookWithParamsOptions<CustInfoField[]> & { params?: { tenantId: string } } = {}) => {
  return useQuery({
    queryKey: recSearchQueryKeys.getCustInfoFields(params?.tenantId).queryKey,
    queryFn: () => recSearchApi.getCustInfoFields(params?.tenantId ?? ''),
    enabled: !!params?.tenantId,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

export const useUpdateMarking = ({ mutationOptions }: MutationHookOptions<void, { recKey: string } & RecMarkingRequest> = {}) => {
  return useMutation({
    mutationFn: ({ recKey, ...data }) => recSearchApi.updateMarking(recKey, data),
    ...mutationOptions,
  });
};
