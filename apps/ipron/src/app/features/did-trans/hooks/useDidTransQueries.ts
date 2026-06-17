/**
 * DID 번호변환 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { didTransApi } from '../api/didTransApi';
import type { DidTrans, NumPattern } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

export const didTransQueryKeys = createQueryKeys('didTrans', {
  getDnisTransList: (params?: Record<string, unknown>) => [params],
  getDnisTransDetail: (params?: Record<string, unknown>) => [params],
  getAniTransList: (params?: Record<string, unknown>) => [params],
  getAniTransDetail: (params?: Record<string, unknown>) => [params],
  getNodes: null,
  getNumPatterns: null,
});

// ─── DNIS 훅 ──────────────────────────────────────────────────────────────

/**
 * DNIS 번호변환 목록 조회
 */
export const useGetDnisTransList = ({ params, queryOptions }: QueryHookWithParamsOptions<DidTrans[]> = {}) => {
  return useQuery({
    queryKey: didTransQueryKeys.getDnisTransList(params).queryKey,
    queryFn: () => didTransApi.getDnisTransList(params),
    ...queryOptions,
  });
};

/**
 * DNIS 번호변환 상세 조회
 */
export const useGetDnisTransDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<DidTrans> = {}) => {
  return useQuery({
    queryKey: didTransQueryKeys.getDnisTransDetail(params).queryKey,
    queryFn: () => didTransApi.getDnisTransDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * DNIS 번호변환 등록
 */
export const useCreateDnisTrans = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didTransApi.createDnisTrans,
    ...mutationOptions,
  });
};

/**
 * DNIS 번호변환 수정
 */
export const useUpdateDnisTrans = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didTransApi.updateDnisTrans,
    ...mutationOptions,
  });
};

/**
 * DNIS 번호변환 삭제
 */
export const useDeleteDnisTrans = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didTransApi.deleteDnisTrans,
    ...mutationOptions,
  });
};

/**
 * DNIS 번호변환 일괄 삭제 (벌크 1콜)
 */
export const useDeleteDnisTransBatch = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  return useMutation({
    mutationFn: (ids: number[]) => didTransApi.deleteDnisTransBatch(ids),
    ...mutationOptions,
  });
};

// ─── ANI 훅 ───────────────────────────────────────────────────────────────

/**
 * ANI 번호변환 목록 조회
 */
export const useGetAniTransList = ({ params, queryOptions }: QueryHookWithParamsOptions<DidTrans[]> = {}) => {
  return useQuery({
    queryKey: didTransQueryKeys.getAniTransList(params).queryKey,
    queryFn: () => didTransApi.getAniTransList(params),
    ...queryOptions,
  });
};

/**
 * ANI 번호변환 상세 조회
 */
export const useGetAniTransDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<DidTrans> = {}) => {
  return useQuery({
    queryKey: didTransQueryKeys.getAniTransDetail(params).queryKey,
    queryFn: () => didTransApi.getAniTransDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * ANI 번호변환 등록
 */
export const useCreateAniTrans = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didTransApi.createAniTrans,
    ...mutationOptions,
  });
};

/**
 * ANI 번호변환 수정
 */
export const useUpdateAniTrans = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didTransApi.updateAniTrans,
    ...mutationOptions,
  });
};

/**
 * ANI 번호변환 일괄 삭제 (벌크 1콜)
 */
export const useDeleteAniTransBatch = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  return useMutation({
    mutationFn: (ids: number[]) => didTransApi.deleteAniTransBatch(ids),
    ...mutationOptions,
  });
};

/**
 * ANI 번호변환 삭제
 */
export const useDeleteAniTrans = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didTransApi.deleteAniTrans,
    ...mutationOptions,
  });
};

// ─── 노드간 복사 ──────────────────────────────────────────────────────────

export const useCopyDnisTrans = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didTransApi.copyDnisTrans,
    ...mutationOptions,
  });
};

export const useCopyAniTrans = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didTransApi.copyAniTrans,
    ...mutationOptions,
  });
};

// ─── 공통 훅 ──────────────────────────────────────────────────────────────

/**
 * 노드 목록 조회 (cross-service)
 */
export const useGetNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: didTransQueryKeys.getNodes.queryKey,
    queryFn: () => didTransApi.getNodes(),
    ...queryOptions,
  });
};

// ─── 번호 패턴 훅 ────────────────────────────────────────────────────────

/**
 * 번호 패턴 목록 조회
 */
export const useGetNumPatterns = ({ queryOptions }: QueryHookOptions<NumPattern[]> = {}) => {
  return useQuery({
    queryKey: didTransQueryKeys.getNumPatterns.queryKey,
    queryFn: () => didTransApi.getNumPatterns(),
    ...queryOptions,
  });
};

/**
 * 번호 패턴 등록
 */
export const useCreateNumPattern = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didTransApi.createNumPattern,
    ...mutationOptions,
  });
};

/**
 * 번호 패턴 수정
 */
export const useUpdateNumPattern = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didTransApi.updateNumPattern,
    ...mutationOptions,
  });
};

/**
 * 번호 패턴 삭제
 */
export const useDeleteNumPattern = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didTransApi.deleteNumPattern,
    ...mutationOptions,
  });
};
