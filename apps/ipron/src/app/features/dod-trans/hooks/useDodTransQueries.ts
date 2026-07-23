/**
 * DOD DNIS 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { dodTransApi } from '../api/dodTransApi';
import type { DodTransItem, DodTransMaster } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

export const dodTransQueryKeys = createAppQueryKeys('dodTrans', {
  getMasterList: (params?: Record<string, unknown>) => [params],
  getItemList: (params?: Record<string, unknown>) => [params],
  getNodes: null,
});

// ─── Master 훅 ──────────────────────────────────────────────────────────────

/**
 * DOD DNIS 변환 마스터 목록 조회
 */
export const useGetMasterList = ({ params, queryOptions }: QueryHookWithParamsOptions<DodTransMaster[]> = {}) => {
  return useQuery({
    queryKey: dodTransQueryKeys.getMasterList(params).queryKey,
    queryFn: () => dodTransApi.getMasterList(params),
    ...queryOptions,
  });
};

/**
 * DOD DNIS 변환 마스터 등록
 */
export const useCreateMaster = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dodTransApi.createMaster,
    ...mutationOptions,
  });
};

/**
 * DOD DNIS 변환 마스터 수정
 */
export const useUpdateMaster = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dodTransApi.updateMaster,
    ...mutationOptions,
  });
};

/**
 * DOD DNIS 변환 마스터 삭제
 */
export const useDeleteMaster = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dodTransApi.deleteMaster,
    ...mutationOptions,
  });
};

// ─── Item 훅 ────────────────────────────────────────────────────────────────

/**
 * DOD DNIS 변환 아이템 목록 조회
 */
export const useGetItemList = ({ params, queryOptions }: QueryHookWithParamsOptions<DodTransItem[]> = {}) => {
  return useQuery({
    queryKey: dodTransQueryKeys.getItemList(params).queryKey,
    queryFn: () => dodTransApi.getItemList(params),
    ...queryOptions,
  });
};

/**
 * DOD DNIS 변환 아이템 등록
 */
export const useCreateItem = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dodTransApi.createItem,
    ...mutationOptions,
  });
};

/**
 * DOD DNIS 변환 아이템 수정
 */
export const useUpdateItem = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dodTransApi.updateItem,
    ...mutationOptions,
  });
};

/**
 * DOD DNIS 변환 아이템 삭제
 */
export const useDeleteItem = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dodTransApi.deleteItem,
    ...mutationOptions,
  });
};

/**
 * DOD DNIS 변환 아이템 일괄 삭제 (벌크 1콜, 복합키 묶음)
 */
export const useDeleteItemBatch = ({ mutationOptions }: MutationHookOptions<void, { dodTransId: number; listSeq: number }[]> = {}) => {
  return useMutation({
    mutationFn: (items: { dodTransId: number; listSeq: number }[]) => dodTransApi.deleteItemBatch(items),
    ...mutationOptions,
  });
};

// ─── 공통 훅 ────────────────────────────────────────────────────────────────

/**
 * 노드 목록 조회 (cross-service)
 */
export const useGetNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: dodTransQueryKeys.getNodes.queryKey,
    queryFn: () => dodTransApi.getNodes(),
    ...queryOptions,
  });
};
