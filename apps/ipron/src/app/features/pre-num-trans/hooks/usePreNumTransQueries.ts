/**
 * 발신 DNIS 사전변환 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { preNumTransApi } from '../api/preNumTransApi';
import type { PreNumTrans } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

interface RouteSimpleResponse {
  routeId: number;
  routeName: string;
  nodeId: number;
}

export const preNumTransQueryKeys = createAppQueryKeys('preNumTrans', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (params?: Record<string, unknown>) => [params],
  getNodes: null,
  getRoutes: (params?: Record<string, unknown>) => [params],
});

// ─── 조회 훅 ──────────────────────────────────────────────────────────────

/**
 * 사전변환 목록 조회
 */
export const useGetPreNumTransList = ({ params, queryOptions }: QueryHookWithParamsOptions<PreNumTrans[]> = {}) => {
  return useQuery({
    queryKey: preNumTransQueryKeys.getList(params).queryKey,
    queryFn: () => preNumTransApi.getList(params),
    ...queryOptions,
  });
};

/**
 * 사전변환 상세 조회
 */
export const useGetPreNumTransDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<PreNumTrans> = {}) => {
  return useQuery({
    queryKey: preNumTransQueryKeys.getDetail(params).queryKey,
    queryFn: () => preNumTransApi.getDetail(params ?? {}),
    ...queryOptions,
  });
};

// ─── CUD 훅 ──────────────────────────────────────────────────────────────

/**
 * 사전변환 등록
 */
export const useCreatePreNumTrans = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: preNumTransApi.create,
    ...mutationOptions,
  });
};

/**
 * 사전변환 수정
 */
export const useUpdatePreNumTrans = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: preNumTransApi.update,
    ...mutationOptions,
  });
};

/**
 * 사전변환 삭제
 */
export const useDeletePreNumTrans = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: preNumTransApi.delete,
    ...mutationOptions,
  });
};

/**
 * 사전변환 일괄 삭제 (벌크 1콜)
 */
export const useDeletePreNumTransBatch = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  return useMutation({
    mutationFn: (ids: number[]) => preNumTransApi.deleteBatch(ids),
    ...mutationOptions,
  });
};

// ─── 공통 훅 ──────────────────────────────────────────────────────────────

/**
 * 노드 목록 조회 (cross-service)
 */
export const useGetNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: preNumTransQueryKeys.getNodes.queryKey,
    queryFn: () => preNumTransApi.getNodes(),
    ...queryOptions,
  });
};

/**
 * 라우트 목록 조회 (노드별 필터)
 */
export const useGetRoutes = ({ params, queryOptions }: QueryHookWithParamsOptions<RouteSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: preNumTransQueryKeys.getRoutes(params).queryKey,
    queryFn: () => preNumTransApi.getRoutes(params),
    ...queryOptions,
  });
};
