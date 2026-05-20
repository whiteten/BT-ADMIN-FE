/**
 * 교환기 IP 접근관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { aclApi } from '../api/aclApi';
import type { Acl } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

export const aclQueryKeys = createQueryKeys('acls', {
  getAcls: (params?: Record<string, unknown>) => [params],
  getAclDetail: (params?: Record<string, unknown>) => [params],
  getCtiAcls: (params?: Record<string, unknown>) => [params],
  getNodes: null,
});

/**
 * ACL 목록 조회
 */
export const useGetAcls = ({ params, queryOptions }: QueryHookWithParamsOptions<Acl[]> = {}) => {
  return useQuery({
    queryKey: aclQueryKeys.getAcls(params).queryKey,
    queryFn: () => aclApi.getAcls(params),
    ...queryOptions,
  });
};

/**
 * ACL 상세 조회
 */
export const useGetAclDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<Acl> = {}) => {
  return useQuery({
    queryKey: aclQueryKeys.getAclDetail(params).queryKey,
    queryFn: () => aclApi.getAclDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * ACL 등록
 */
export const useCreateAcl = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aclApi.createAcl,
    ...mutationOptions,
  });
};

/**
 * ACL 수정
 */
export const useUpdateAcl = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aclApi.updateAcl,
    ...mutationOptions,
  });
};

/**
 * ACL 삭제
 */
export const useDeleteAcl = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aclApi.deleteAcl,
    ...mutationOptions,
  });
};

/**
 * CTI ACL 목록 조회
 */
export const useGetCtiAcls = ({ params, queryOptions }: QueryHookWithParamsOptions<Acl[]> = {}) => {
  return useQuery({
    queryKey: aclQueryKeys.getCtiAcls(params).queryKey,
    queryFn: () => aclApi.getCtiAcls(params),
    ...queryOptions,
  });
};

/**
 * CTI ACL 등록
 */
export const useCreateCtiAcl = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aclApi.createCtiAcl,
    ...mutationOptions,
  });
};

/**
 * CTI ACL 수정
 */
export const useUpdateCtiAcl = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aclApi.updateCtiAcl,
    ...mutationOptions,
  });
};

/**
 * CTI ACL 삭제
 */
export const useDeleteCtiAcl = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aclApi.deleteCtiAcl,
    ...mutationOptions,
  });
};

/**
 * 노드 목록 조회 (cross-service)
 */
export const useGetNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: aclQueryKeys.getNodes.queryKey,
    queryFn: () => aclApi.getNodes(),
    ...queryOptions,
  });
};
