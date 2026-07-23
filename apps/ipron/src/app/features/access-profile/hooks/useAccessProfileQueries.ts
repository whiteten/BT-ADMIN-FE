/**
 * 접근코드 프로파일 관리 React Query 훅
 * SD-ACCESS-PROFILE.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { accessProfileApi } from '../api/accessProfileApi';
import type { AccessCode, AccessProfile, NodeSimpleResponse, ProfileTreeNodeResponse, RouteSimpleResponse, TenantSimpleResponse } from '../types';

export const accessProfileQueryKeys = createAppQueryKeys('accessProfiles', {
  getProfiles: (params?: Record<string, unknown>) => [params],
  getProfileTree: null,
  getProfileDetail: (params?: Record<string, unknown>) => [params],
  getCodes: (params?: Record<string, unknown>) => [params],
  getTenants: null,
  getNodes: null,
  getRoutesByNode: (nodeId?: number) => [nodeId],
});

// ─── Profile Queries ─────────────────────────────────────────────────────────

export const useGetProfiles = ({ params, queryOptions }: QueryHookWithParamsOptions<AccessProfile[]> = {}) => {
  return useQuery({
    queryKey: accessProfileQueryKeys.getProfiles(params).queryKey,
    queryFn: () => accessProfileApi.getProfiles(params),
    ...queryOptions,
  });
};

export const useGetProfileTree = ({ queryOptions }: QueryHookOptions<ProfileTreeNodeResponse[]> = {}) => {
  return useQuery({
    queryKey: accessProfileQueryKeys.getProfileTree.queryKey,
    queryFn: () => accessProfileApi.getProfileTree(),
    ...queryOptions,
  });
};

export const useGetProfileDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<AccessProfile> = {}) => {
  return useQuery({
    queryKey: accessProfileQueryKeys.getProfileDetail(params).queryKey,
    queryFn: () => accessProfileApi.getProfileDetail(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: accessProfileApi.createProfile,
    ...mutationOptions,
  });
};

export const useUpdateProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: accessProfileApi.updateProfile,
    ...mutationOptions,
  });
};

export const useDeleteProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: accessProfileApi.deleteProfile,
    ...mutationOptions,
  });
};

export const useCopyProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: accessProfileApi.copyProfile,
    ...mutationOptions,
  });
};

// ─── Code Queries ────────────────────────────────────────────────────────────

export const useGetCodes = ({ params, queryOptions }: QueryHookWithParamsOptions<AccessCode[]> = {}) => {
  return useQuery({
    queryKey: accessProfileQueryKeys.getCodes(params).queryKey,
    queryFn: () => accessProfileApi.getCodes(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: accessProfileApi.createCode,
    ...mutationOptions,
  });
};

export const useUpdateCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: accessProfileApi.updateCode,
    ...mutationOptions,
  });
};

export const useDeleteCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: accessProfileApi.deleteCode,
    ...mutationOptions,
  });
};

// ─── Tenant / Node / Route Queries ──────────────────────────────────────────

export const useGetTenants = ({ queryOptions }: QueryHookOptions<TenantSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: accessProfileQueryKeys.getTenants.queryKey,
    queryFn: () => accessProfileApi.getTenants(),
    ...queryOptions,
  });
};

export const useGetNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: accessProfileQueryKeys.getNodes.queryKey,
    queryFn: () => accessProfileApi.getNodes(),
    ...queryOptions,
  });
};

export const useGetRoutesByNode = (nodeId: number | null, { queryOptions }: QueryHookOptions<RouteSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: accessProfileQueryKeys.getRoutesByNode(nodeId ?? undefined).queryKey,
    queryFn: () => accessProfileApi.getRoutesByNode(nodeId!),
    enabled: !!nodeId,
    ...queryOptions,
  });
};
