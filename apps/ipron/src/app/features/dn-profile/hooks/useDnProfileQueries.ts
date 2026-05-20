/**
 * 내선 프로파일 관리 React Query 훅
 * SD-DN-PROFILE.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { dnProfileApi } from '../api/dnProfileApi';
import type { DnProfile, DnProfileOptionsResponse, NodeSimpleResponse, NodeTenantItem, TenantSimpleResponse } from '../types/dnProfile.types';

export const dnProfileQueryKeys = createQueryKeys('dnProfiles', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (id?: number) => [id],
  getNodeTenants: null,
  getTenants: null,
  getNodes: null,
  getOptions: (params?: Record<string, unknown>) => [params],
});

// ─── List / Detail ─────────────────────────────────────────────────────────

export const useGetDnProfiles = ({ params, queryOptions }: QueryHookWithParamsOptions<DnProfile[]> = {}) => {
  return useQuery({
    queryKey: dnProfileQueryKeys.getList(params).queryKey,
    queryFn: () => dnProfileApi.getList(params),
    ...queryOptions,
  });
};

export const useGetDnProfileDetail = (id: number | null | undefined, { queryOptions }: QueryHookOptions<DnProfile> = {}) => {
  return useQuery({
    queryKey: dnProfileQueryKeys.getDetail(id ?? undefined).queryKey,
    queryFn: () => dnProfileApi.getDetail(id!),
    enabled: !!id,
    ...queryOptions,
  });
};

// ─── Mutations ─────────────────────────────────────────────────────────────

export const useCreateDnProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dnProfileApi.create,
    ...mutationOptions,
  });
};

export const useUpdateDnProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dnProfileApi.update,
    ...mutationOptions,
  });
};

export const useDeleteDnProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dnProfileApi.delete,
    ...mutationOptions,
  });
};

// ─── Node / Tenant / Options ───────────────────────────────────────────────

export const useGetDnProfileNodeTenants = ({ queryOptions }: QueryHookOptions<NodeTenantItem[]> = {}) => {
  return useQuery({
    queryKey: dnProfileQueryKeys.getNodeTenants.queryKey,
    queryFn: () => dnProfileApi.getNodeTenants(),
    ...queryOptions,
  });
};

export const useGetDnProfileTenants = ({ queryOptions }: QueryHookOptions<TenantSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: dnProfileQueryKeys.getTenants.queryKey,
    queryFn: () => dnProfileApi.getTenants(),
    ...queryOptions,
  });
};

export const useGetDnProfileNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: dnProfileQueryKeys.getNodes.queryKey,
    queryFn: () => dnProfileApi.getNodes(),
    ...queryOptions,
  });
};

export const useGetDnProfileOptions = (
  params: { nodeId: number; tenantId: number; drNodeId?: number | null; dnProfileType?: string | null; excludeProfileId?: number | null } | null,
  { queryOptions }: QueryHookOptions<DnProfileOptionsResponse> = {},
) => {
  return useQuery({
    queryKey: dnProfileQueryKeys.getOptions(params ?? undefined).queryKey,
    queryFn: () => dnProfileApi.getOptions(params!),
    enabled: !!params && !!params.nodeId && !!params.tenantId,
    ...queryOptions,
  });
};
