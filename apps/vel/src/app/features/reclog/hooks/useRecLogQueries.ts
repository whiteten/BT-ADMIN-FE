import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { recLogApi } from '../api/recLogApi';
import type { RecLogPagedResult, RecLogSearchParams, RecReasonTypeRequest, RecReasonTypeSearchParams } from '../types/rec-log';

export const recLogQueryKeys = createQueryKeys('rec-log', {
  getRecLogs: (params?: Record<string, unknown>) => [params],
  getReasonTypes: (params?: Record<string, unknown>) => [params],
});

// searchToken: [조회] 클릭마다 +1 되는 nonce. 쿼리키에만 더해(=API 파라미터엔 미포함) 같은 검색조건이어도
// 매 클릭 강제 재요청되게 한다. 실시간으로 청취로그가 쌓이는 환경에서 캐시 디듀핑으로 신규 데이터를 놓치는 것 방지.
export const useGetRecLogs = ({
  params,
  searchToken,
  queryOptions,
}: QueryHookWithParamsOptions<RecLogPagedResult> & { params?: RecLogSearchParams; searchToken?: number } = {}) => {
  return useQuery({
    queryKey: [...recLogQueryKeys.getRecLogs(params as Record<string, unknown>).queryKey, searchToken],
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
