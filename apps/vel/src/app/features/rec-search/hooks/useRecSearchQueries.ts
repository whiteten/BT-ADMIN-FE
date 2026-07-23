import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { recSearchApi } from '../api/recSearchApi';
import type { CustInfoField, MarkCode, RecFileListItem, RecFilePagedResult, RecMarkingRequest, RecSearchParams, RecUpdateInfoRequest } from '../types';

export const recSearchQueryKeys = createAppQueryKeys('rec-search', {
  getRecordings: (params?: Record<string, unknown>) => [params],
  getRecording: (params?: Record<string, unknown>) => [params],
  getMarkCodes: (tenantId?: string) => [tenantId],
  getCustInfoFields: (tenantId?: string) => [tenantId],
});

// searchToken: [조회] 클릭마다 +1 되는 nonce. 쿼리키에만 더해(=API 파라미터엔 미포함) 같은 검색조건이어도
// 매 클릭 강제 재요청되게 한다. 실시간으로 녹취가 쌓이는 환경에서 캐시 디듀핑으로 신규 데이터를 놓치는 것 방지.
export const useGetRecordings = ({
  params,
  searchToken,
  queryOptions,
}: QueryHookWithParamsOptions<RecFilePagedResult> & { params?: RecSearchParams; searchToken?: number } = {}) => {
  return useQuery({
    queryKey: [...recSearchQueryKeys.getRecordings(params as Record<string, unknown>).queryKey, searchToken],
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
