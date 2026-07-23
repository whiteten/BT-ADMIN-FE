/**
 * DNIS 관리 (MCS) React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { mcsDnisApi } from '../api/mcsDnisApi';
import type { McsdDnis, McsdGdn } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

export const mcsDnisQueryKeys = createAppQueryKeys('mcsDnis', {
  getGdnList: (params?: Record<string, unknown>) => [params],
  getDnisList: (params?: Record<string, unknown>) => [params],
  getNodes: null,
});

// ─── GDN 훅 ──────────────────────────────────────────────────────────────

/**
 * MCS 대표번호 목록 조회
 */
export const useGetMcsGdns = ({ params, queryOptions }: QueryHookWithParamsOptions<McsdGdn[]> = {}) => {
  return useQuery({
    queryKey: mcsDnisQueryKeys.getGdnList(params).queryKey,
    queryFn: () => mcsDnisApi.getGdnList(params),
    ...queryOptions,
  });
};

/**
 * MCS 대표번호 등록
 */
export const useCreateMcsGdn = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mcsDnisApi.createGdn,
    ...mutationOptions,
  });
};

/**
 * MCS 대표번호 수정
 */
export const useUpdateMcsGdn = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mcsDnisApi.updateGdn,
    ...mutationOptions,
  });
};

/**
 * MCS 대표번호 삭제 (cascade)
 */
export const useDeleteMcsGdn = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mcsDnisApi.deleteGdn,
    ...mutationOptions,
  });
};

// ─── DNIS 훅 ─────────────────────────────────────────────────────────────

/**
 * MCS DNIS 목록 조회
 */
export const useGetMcsDnisList = ({ params, queryOptions }: QueryHookWithParamsOptions<McsdDnis[]> = {}) => {
  return useQuery({
    queryKey: mcsDnisQueryKeys.getDnisList(params).queryKey,
    queryFn: () => mcsDnisApi.getDnisList((params ?? {}) as { gdnNo: string }),
    ...queryOptions,
  });
};

/**
 * MCS DNIS 등록
 */
export const useCreateMcsDnis = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mcsDnisApi.createDnis,
    ...mutationOptions,
  });
};

/**
 * MCS DNIS 수정
 */
export const useUpdateMcsDnis = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mcsDnisApi.updateDnis,
    ...mutationOptions,
  });
};

/**
 * MCS DNIS 삭제
 */
export const useDeleteMcsDnis = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mcsDnisApi.deleteDnis,
    ...mutationOptions,
  });
};

// ─── 공통 훅 ──────────────────────────────────────────────────────────────

/**
 * 노드 목록 조회 (cross-service)
 */
export const useGetNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: mcsDnisQueryKeys.getNodes.queryKey,
    queryFn: () => mcsDnisApi.getNodes(),
    ...queryOptions,
  });
};
