/**
 * BFF Flow 관리 React Query 훅
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { bffFlowApi } from '../api/bffFlowApi';
import type { BffFlow, FlowSpec } from '../types';

export const bffFlowQueryKeys = createQueryKeys('bffFlows', {
  getFlows: null,
});

/** 전체 Flow 목록 조회 */
export const useGetFlows = ({ queryOptions }: QueryHookOptions<BffFlow[]> = {}) => {
  return useQuery({
    queryKey: bffFlowQueryKeys.getFlows.queryKey,
    queryFn: bffFlowApi.getFlows,
    ...queryOptions,
  });
};

/** Flow 저장 (생성/수정) — 성공 시 캐시 리프레시 + 목록 갱신 */
export const useSaveFlow = ({ mutationOptions }: MutationHookOptions<BffFlow, { flowId: string; spec: FlowSpec }> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bffFlowApi.saveFlow,
    ...mutationOptions,
    onSuccess: async (...args) => {
      await bffFlowApi.refresh().catch((e) => console.warn('Flow cache refresh failed', e));
      await queryClient.invalidateQueries({ queryKey: bffFlowQueryKeys.getFlows.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/** Flow 삭제 — 성공 시 캐시 리프레시 + 목록 갱신 */
export const useDeleteFlow = ({ mutationOptions }: MutationHookOptions<void, string> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bffFlowApi.deleteFlow,
    ...mutationOptions,
    onSuccess: async (...args) => {
      await bffFlowApi.refresh().catch((e) => console.warn('Flow cache refresh failed', e));
      await queryClient.invalidateQueries({ queryKey: bffFlowQueryKeys.getFlows.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

/** 캐시 리프레시 */
export const useRefreshFlows = ({ mutationOptions }: MutationHookOptions<void, void> = {}) => {
  return useMutation({
    mutationFn: bffFlowApi.refresh,
    ...mutationOptions,
  });
};
