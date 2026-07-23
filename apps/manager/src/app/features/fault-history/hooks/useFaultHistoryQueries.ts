import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { faultHistoryApi } from '../api/faultHistoryApi';
import type { FaultForceRecoverParams, FaultHistoryItem, FaultHistoryListParams, FaultHistorySummary, ForceRecoverResult, PagedResponse } from '../types';

/** 장애 이력 쿼리 키 팩토리 */
export const faultHistoryQueryKeys = createAppQueryKeys('faultHistory', {
  getFaultHistories: (params?: Record<string, unknown>) => [params],
  getFaultHistorySummary: (params?: Record<string, unknown>) => [params],
  getFaultHistoryEvents: (params?: Record<string, unknown>) => [params],
});

/** 목록 조회 훅 (서버 페이징 + 필터) — { params, queryOptions } 규약 */
export const useGetFaultHistories = ({ params, queryOptions }: QueryHookWithParamsOptions<PagedResponse<FaultHistoryItem>> = {}) => {
  return useQuery({
    queryKey: faultHistoryQueryKeys.getFaultHistories(params).queryKey,
    queryFn: () => faultHistoryApi.getList((params ?? {}) as FaultHistoryListParams),
    ...queryOptions,
  });
};

/** 요약 스탯 조회 훅 — params.from/to (yyyyMMdd, 생략 시 오늘). 목록 조회 기간과 같은 값을 넘겨 함께 갱신한다. */
export const useGetFaultHistorySummary = ({ params, queryOptions }: QueryHookWithParamsOptions<FaultHistorySummary> = {}) => {
  return useQuery({
    queryKey: faultHistoryQueryKeys.getFaultHistorySummary(params).queryKey,
    queryFn: () => faultHistoryApi.getSummary({ from: params?.from as string | undefined, to: params?.to as string | undefined }),
    ...queryOptions,
  });
};

/** 이벤트 시퀀스 조회 훅 — params.issueKey 필수, 사용처에서 queryOptions.enabled 로 제어 */
export const useGetFaultHistoryEvents = ({ params, queryOptions }: QueryHookWithParamsOptions<FaultHistoryItem[]> = {}) => {
  return useQuery({
    queryKey: faultHistoryQueryKeys.getFaultHistoryEvents(params).queryKey,
    queryFn: () => faultHistoryApi.getEvents(params?.issueKey as string),
    ...queryOptions,
  });
};

/** 장애 메모 저장 훅 — 캐시 무효화는 호출 컴포넌트의 mutationOptions.onSuccess 에서 처리 */
export const useUpdateFaultHistoryMemo = ({ mutationOptions }: MutationHookOptions<void, { historyId: number; memo: string }> = {}) => {
  return useMutation({
    mutationFn: ({ historyId, memo }: { historyId: number; memo: string }) => faultHistoryApi.updateMemo(historyId, memo),
    ...mutationOptions,
  });
};

/** 일괄 강제복구 훅 — 캐시 무효화·결과 표시는 호출 컴포넌트의 mutationOptions.onSuccess 에서 처리 */
export const useForceRecoverFaultHistories = ({ mutationOptions }: MutationHookOptions<ForceRecoverResult, FaultForceRecoverParams> = {}) => {
  return useMutation({
    mutationFn: (params: FaultForceRecoverParams) => faultHistoryApi.forceRecover(params),
    ...mutationOptions,
  });
};
