/**
 * 수신번호 차단 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { type NodeTenantItem, callScreenApi } from '../api/callScreenApi';
import type { CallScreen } from '../types';

export const callScreenQueryKeys = createQueryKeys('callScreen', {
  getList: (params?: Record<string, unknown>) => [params],
  getNodeTenants: null,
});

// ─── 조회 훅 ──────────────────────────────────────────────────────────────

/**
 * 수신번호 차단 목록 조회
 */
export const useGetCallScreenList = ({ params, queryOptions }: QueryHookWithParamsOptions<CallScreen[]> = {}) => {
  return useQuery({
    queryKey: callScreenQueryKeys.getList(params).queryKey,
    queryFn: () => callScreenApi.getList(params),
    ...queryOptions,
  });
};

/**
 * 노드-테넌트 매핑 목록 (트리 구성용)
 */
export const useGetNodeTenants = ({ queryOptions }: QueryHookOptions<NodeTenantItem[]> = {}) => {
  return useQuery({
    queryKey: callScreenQueryKeys.getNodeTenants.queryKey,
    queryFn: () => callScreenApi.getNodeTenants(),
    ...queryOptions,
  });
};

// ─── CUD 훅 ────────────────────────────────────────────────────────────────

/**
 * 수신번호 차단 등록
 */
export const useCreateCallScreen = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: callScreenApi.create,
    ...mutationOptions,
  });
};

/**
 * 수신번호 차단 수정
 */
export const useUpdateCallScreen = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: callScreenApi.update,
    ...mutationOptions,
  });
};

/**
 * 수신번호 차단 삭제
 */
export const useDeleteCallScreen = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: callScreenApi.delete,
    ...mutationOptions,
  });
};

/**
 * 수신번호 차단 일괄 삭제 (벌크 1콜)
 */
export const useDeleteCallScreenBatch = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  return useMutation({
    mutationFn: (ids: number[]) => callScreenApi.deleteBatch(ids),
    ...mutationOptions,
  });
};
