/**
 * 노드 관리 React Query 훅
 * SD-NODE-MANAGEMENT.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { nodeApi } from '../api/nodeApi';
import type { NodeDetail, NodeListItem } from '../types';

export const nodeQueryKeys = createAppQueryKeys('nodes', {
  getNodes: (params?: Record<string, unknown>) => [params],
  getNode: (params?: Record<string, unknown>) => [params],
  checkNodeId: (params?: Record<string, unknown>) => [params],
  checkNodeName: (params?: Record<string, unknown>) => [params],
});

/**
 * 노드 목록 조회
 */
export const useGetNodes = ({ params, queryOptions }: QueryHookWithParamsOptions<NodeListItem[]> = {}) => {
  return useQuery({
    queryKey: nodeQueryKeys.getNodes(params).queryKey,
    queryFn: () => nodeApi.getNodes(params),
    ...queryOptions,
  });
};

/**
 * 노드 상세 조회
 */
export const useGetNode = ({ params, queryOptions }: QueryHookWithParamsOptions<NodeDetail> = {}) => {
  return useQuery({
    queryKey: nodeQueryKeys.getNode(params).queryKey,
    queryFn: () => nodeApi.getNode(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 노드 등록
 */
export const useCreateNode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: nodeApi.createNode,
    ...mutationOptions,
  });
};

/**
 * 노드 수정
 */
export const useUpdateNode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: nodeApi.updateNode,
    ...mutationOptions,
  });
};

/**
 * 노드 삭제
 */
export const useDeleteNode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: nodeApi.deleteNode,
    ...mutationOptions,
  });
};

/**
 * 노드ID 중복체크
 */
export const useCheckNodeId = ({ params, queryOptions }: QueryHookWithParamsOptions<boolean> = {}) => {
  return useQuery({
    queryKey: nodeQueryKeys.checkNodeId(params).queryKey,
    queryFn: () => nodeApi.checkNodeId(params ?? {}),
    enabled: false,
    ...queryOptions,
  });
};

/**
 * 노드명 중복체크
 */
export const useCheckNodeName = ({ params, queryOptions }: QueryHookWithParamsOptions<boolean> = {}) => {
  return useQuery({
    queryKey: nodeQueryKeys.checkNodeName(params).queryKey,
    queryFn: () => nodeApi.checkNodeName(params ?? {}),
    enabled: false,
    ...queryOptions,
  });
};

/**
 * 노드 클러스터 이동
 */
export const useMoveNodeCluster = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: nodeApi.moveNodeCluster,
    ...mutationOptions,
  });
};
