/**
 * 국선관리 React Query 훅
 * SD-ENDPOINT.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { endpointApi } from '../api/endpointApi';
import type { Endpoint, EndpointMember, EndpointRegnum } from '../types';

export const endpointQueryKeys = createQueryKeys('endpoints', {
  getEndpoints: (params?: Record<string, unknown>) => [params],
  getEndpointDetail: (params?: Record<string, unknown>) => [params],
  getMembers: (params?: Record<string, unknown>) => [params],
  getRegnums: (params?: Record<string, unknown>) => [params],
  getNodes: null,
});

// ─── Endpoint Queries ───────────────────────────────────────────────────────

/**
 * 국선 목록 조회
 */
export const useGetEndpoints = ({ params, queryOptions }: QueryHookWithParamsOptions<Endpoint[]> = {}) => {
  return useQuery({
    queryKey: endpointQueryKeys.getEndpoints(params).queryKey,
    queryFn: () => endpointApi.getEndpoints(params),
    ...queryOptions,
  });
};

/**
 * 국선 상세 조회
 */
export const useGetEndpointDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<Endpoint> = {}) => {
  return useQuery({
    queryKey: endpointQueryKeys.getEndpointDetail(params).queryKey,
    queryFn: () => endpointApi.getEndpointDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 국선 등록
 */
export const useCreateEndpoint = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: endpointApi.createEndpoint,
    ...mutationOptions,
  });
};

/**
 * 국선 수정
 */
export const useUpdateEndpoint = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: endpointApi.updateEndpoint,
    ...mutationOptions,
  });
};

/**
 * 국선 삭제
 */
export const useDeleteEndpoint = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: endpointApi.deleteEndpoint,
    ...mutationOptions,
  });
};

// ─── Member Queries ─────────────────────────────────────────────────────────

/**
 * 멤버 목록 조회
 */
export const useGetMembers = ({ params, queryOptions }: QueryHookWithParamsOptions<EndpointMember[]> = {}) => {
  return useQuery({
    queryKey: endpointQueryKeys.getMembers(params).queryKey,
    queryFn: () => endpointApi.getMembers(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 멤버 등록
 */
export const useCreateMember = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: endpointApi.createMember,
    ...mutationOptions,
  });
};

/**
 * 멤버 수정
 */
export const useUpdateMember = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: endpointApi.updateMember,
    ...mutationOptions,
  });
};

/**
 * 멤버 삭제
 */
export const useDeleteMember = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: endpointApi.deleteMember,
    ...mutationOptions,
  });
};

// ─── Regnum Queries ─────────────────────────────────────────────────────────

/**
 * 인증번호 목록 조회
 */
export const useGetRegnums = ({ params, queryOptions }: QueryHookWithParamsOptions<EndpointRegnum[]> = {}) => {
  return useQuery({
    queryKey: endpointQueryKeys.getRegnums(params).queryKey,
    queryFn: () => endpointApi.getRegnums(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 인증번호 등록
 */
export const useCreateRegnum = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: endpointApi.createRegnum,
    ...mutationOptions,
  });
};

/**
 * 인증번호 수정
 */
export const useUpdateRegnum = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: endpointApi.updateRegnum,
    ...mutationOptions,
  });
};

/**
 * 인증번호 삭제
 */
export const useDeleteRegnum = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: endpointApi.deleteRegnum,
    ...mutationOptions,
  });
};

// ─── Node Query ─────────────────────────────────────────────────────────────

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

/**
 * 노드 목록 조회 (cross-service)
 */
export const useGetNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: endpointQueryKeys.getNodes.queryKey,
    queryFn: () => endpointApi.getNodes(),
    ...queryOptions,
  });
};
