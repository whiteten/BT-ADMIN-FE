/**
 * 미디어전달관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { mediaDeliveryApi } from '../api/mediaDeliveryApi';
import type { MdGrp, MdItem } from '../types';

export const mediaDeliveryQueryKeys = createAppQueryKeys('mediaDelivery', {
  getMdGrps: (params?: Record<string, unknown>) => [params],
  getMdItems: (params?: Record<string, unknown>) => [params],
  getMdItemDetail: (params?: Record<string, unknown>) => [params],
  getNodes: null,
});

// ─── MD Group Queries ────────────────────────────────────────────────────────

/**
 * 미디어전달그룹 목록 조회
 */
export const useGetMdGrps = ({ params, queryOptions }: QueryHookWithParamsOptions<MdGrp[]> = {}) => {
  return useQuery({
    queryKey: mediaDeliveryQueryKeys.getMdGrps(params).queryKey,
    queryFn: () => mediaDeliveryApi.getMdGrps(params),
    ...queryOptions,
  });
};

/**
 * 미디어전달그룹 등록
 */
export const useCreateMdGrp = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mediaDeliveryApi.createMdGrp,
    ...mutationOptions,
  });
};

/**
 * 미디어전달그룹 수정
 */
export const useUpdateMdGrp = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mediaDeliveryApi.updateMdGrp,
    ...mutationOptions,
  });
};

/**
 * 미디어전달그룹 삭제
 */
export const useDeleteMdGrp = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mediaDeliveryApi.deleteMdGrp,
    ...mutationOptions,
  });
};

// ─── MD Item Queries ─────────────────────────────────────────────────────────

/**
 * 미디어전달 아이템 목록 조회
 */
export const useGetMdItems = ({ params, queryOptions }: QueryHookWithParamsOptions<MdItem[]> = {}) => {
  return useQuery({
    queryKey: mediaDeliveryQueryKeys.getMdItems(params).queryKey,
    queryFn: () => mediaDeliveryApi.getMdItems(params),
    ...queryOptions,
  });
};

/**
 * 미디어전달 아이템 상세 조회
 */
export const useGetMdItemDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<MdItem> = {}) => {
  return useQuery({
    queryKey: mediaDeliveryQueryKeys.getMdItemDetail(params).queryKey,
    queryFn: () => mediaDeliveryApi.getMdItemDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 미디어전달 아이템 등록
 */
export const useCreateMdItem = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mediaDeliveryApi.createMdItem,
    ...mutationOptions,
  });
};

/**
 * 미디어전달 아이템 수정
 */
export const useUpdateMdItem = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mediaDeliveryApi.updateMdItem,
    ...mutationOptions,
  });
};

/**
 * 미디어전달 아이템 삭제
 */
export const useDeleteMdItem = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mediaDeliveryApi.deleteMdItem,
    ...mutationOptions,
  });
};

// ─── Node Query ──────────────────────────────────────────────────────────────

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

/**
 * 노드 목록 조회 (cross-service)
 */
export const useGetNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: mediaDeliveryQueryKeys.getNodes.queryKey,
    queryFn: () => mediaDeliveryApi.getNodes(),
    ...queryOptions,
  });
};
