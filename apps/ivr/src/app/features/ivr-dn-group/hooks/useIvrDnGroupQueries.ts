/**
 * IVR DN 그룹 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { ivrDnGroupApi } from '../api/ivrDnGroupApi';
import type { IrDnGroup, IrSubDnGroup, IrSubDnQuota, IrSystemUsage } from '../types';

export const ivrDnGroupQueryKeys = createAppQueryKeys('ivrDnGroups', {
  getDnGroups: (params?: Record<string, unknown>) => [params],
  getSystemUsage: (params?: Record<string, unknown>) => [params],
  getDnGroupDetail: (params?: Record<string, unknown>) => [params],
  getSubDnGroups: (params?: Record<string, unknown>) => [params],
  getSubDnQuota: (params?: Record<string, unknown>) => [params],
  getNodes: null,
});

// ─── DN Group Queries ──────────────────────────────────────────────────────

export const useGetDnGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<IrDnGroup[]> = {}) => {
  return useQuery({
    queryKey: ivrDnGroupQueryKeys.getDnGroups(params).queryKey,
    queryFn: () => ivrDnGroupApi.getDnGroups(params),
    ...queryOptions,
  });
};

export const useGetSystemUsage = ({ params, queryOptions }: QueryHookWithParamsOptions<IrSystemUsage[]> = {}) => {
  return useQuery({
    queryKey: ivrDnGroupQueryKeys.getSystemUsage(params).queryKey,
    queryFn: () => ivrDnGroupApi.getSystemUsage(params ?? {}),
    ...queryOptions,
  });
};

export const useGetDnGroupDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<IrDnGroup> = {}) => {
  return useQuery({
    queryKey: ivrDnGroupQueryKeys.getDnGroupDetail(params).queryKey,
    queryFn: () => ivrDnGroupApi.getDnGroupDetail(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateDnGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrDnGroupApi.createDnGroup,
    ...mutationOptions,
  });
};

export const useUpdateDnGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrDnGroupApi.updateDnGroup,
    ...mutationOptions,
  });
};

export const useDeleteDnGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrDnGroupApi.deleteDnGroup,
    ...mutationOptions,
  });
};

// ─── Sub DN Group Queries ─────────────────────────────────────────────────

export const useGetSubDnGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<IrSubDnGroup[]> = {}) => {
  return useQuery({
    queryKey: ivrDnGroupQueryKeys.getSubDnGroups(params).queryKey,
    queryFn: () => ivrDnGroupApi.getSubDnGroups(params ?? {}),
    ...queryOptions,
  });
};

export const useGetSubDnQuota = ({ params, queryOptions }: QueryHookWithParamsOptions<IrSubDnQuota> = {}) => {
  return useQuery({
    queryKey: ivrDnGroupQueryKeys.getSubDnQuota(params).queryKey,
    queryFn: () => ivrDnGroupApi.getSubDnQuota(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateSubDnGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrDnGroupApi.createSubDnGroup,
    ...mutationOptions,
  });
};

export const useUpdateSubDnGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrDnGroupApi.updateSubDnGroup,
    ...mutationOptions,
  });
};

export const useDeleteSubDnGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrDnGroupApi.deleteSubDnGroup,
    ...mutationOptions,
  });
};

// ─── Node ───────────────────────────────────────────────────────────────────

export const useGetNodes = ({ queryOptions }: QueryHookOptions<{ nodeId: number; nodeName: string }[]> = {}) => {
  return useQuery({
    queryKey: ivrDnGroupQueryKeys.getNodes.queryKey,
    queryFn: () => ivrDnGroupApi.getNodes(),
    ...queryOptions,
  });
};
