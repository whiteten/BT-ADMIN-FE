/**
 * IVR EndPoint React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { ivrEndpointApi } from '../api/ivrEndpointApi';
import type { IvrEndpointMaster, IvrEndpointMember } from '../types';

export const ivrEndpointQueryKeys = createQueryKeys('ivrEndpoints', {
  getMasters: (params?: Record<string, unknown>) => [params],
  getMasterDetail: (params?: Record<string, unknown>) => [params],
  getMembers: (params?: Record<string, unknown>) => [params],
  getNodes: null,
});

// ─── Master Queries ─────────────────────────────────────────────────────────

export const useGetMasters = ({ params, queryOptions }: QueryHookWithParamsOptions<IvrEndpointMaster[]> = {}) => {
  return useQuery({
    queryKey: ivrEndpointQueryKeys.getMasters(params).queryKey,
    queryFn: () => ivrEndpointApi.getMasters(params),
    ...queryOptions,
  });
};

export const useGetMasterDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<IvrEndpointMaster> = {}) => {
  return useQuery({
    queryKey: ivrEndpointQueryKeys.getMasterDetail(params).queryKey,
    queryFn: () => ivrEndpointApi.getMasterDetail(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateMaster = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrEndpointApi.createMaster,
    ...mutationOptions,
  });
};

export const useUpdateMaster = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrEndpointApi.updateMaster,
    ...mutationOptions,
  });
};

export const useDeleteMaster = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrEndpointApi.deleteMaster,
    ...mutationOptions,
  });
};

// ─── Member Queries ─────────────────────────────────────────────────────────

export const useGetMembers = ({ params, queryOptions }: QueryHookWithParamsOptions<IvrEndpointMember[]> = {}) => {
  return useQuery({
    queryKey: ivrEndpointQueryKeys.getMembers(params).queryKey,
    queryFn: () => ivrEndpointApi.getMembers(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateMember = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrEndpointApi.createMember,
    ...mutationOptions,
  });
};

export const useUpdateMember = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrEndpointApi.updateMember,
    ...mutationOptions,
  });
};

export const useDeleteMember = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrEndpointApi.deleteMember,
    ...mutationOptions,
  });
};

// ─── Node ───────────────────────────────────────────────────────────────────

export const useGetNodes = ({ queryOptions }: QueryHookOptions<{ nodeId: number; nodeName: string }[]> = {}) => {
  return useQuery({
    queryKey: ivrEndpointQueryKeys.getNodes.queryKey,
    queryFn: () => ivrEndpointApi.getNodes(),
    ...queryOptions,
  });
};
