/**
 * HA 다중화 구성 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { haGroupApi } from '../api/haGroupApi';
import type { AvailableSystem, HaGroup, HaGroupMember } from '../types';

export const haGroupQueryKeys = createAppQueryKeys('haGroup', {
  getHaGroups: (params?: Record<string, unknown>) => [params],
  getAvailableSystems: (params?: Record<string, unknown>) => [params],
  getHaGroupMembers: (params?: Record<string, unknown>) => [params],
  getNodes: null,
});

// ─── HA Group Queries ──────────────────────────────────────────────────────

export const useGetHaGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<HaGroup[]> = {}) => {
  return useQuery({
    queryKey: haGroupQueryKeys.getHaGroups(params).queryKey,
    queryFn: () => haGroupApi.getHaGroups(params),
    ...queryOptions,
  });
};

export const useGetAvailableSystems = ({ params, queryOptions }: QueryHookWithParamsOptions<AvailableSystem[]> = {}) => {
  return useQuery({
    queryKey: haGroupQueryKeys.getAvailableSystems(params).queryKey,
    queryFn: () => haGroupApi.getAvailableSystems(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateHaGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: haGroupApi.createHaGroup,
    ...mutationOptions,
  });
};

export const useUpdateHaGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: haGroupApi.updateHaGroup,
    ...mutationOptions,
  });
};

export const useDeleteHaGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: haGroupApi.deleteHaGroup,
    ...mutationOptions,
  });
};

// ─── HA Group Member Queries ───────────────────────────────────────────────

export const useGetHaGroupMembers = ({ params, queryOptions }: QueryHookWithParamsOptions<HaGroupMember[]> = {}) => {
  return useQuery({
    queryKey: haGroupQueryKeys.getHaGroupMembers(params).queryKey,
    queryFn: () => haGroupApi.getHaGroupMembers(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateHaGroupMember = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: haGroupApi.createHaGroupMember,
    ...mutationOptions,
  });
};

export const useUpdateHaGroupMember = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: haGroupApi.updateHaGroupMember,
    ...mutationOptions,
  });
};

export const useDeleteHaGroupMember = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: haGroupApi.deleteHaGroupMember,
    ...mutationOptions,
  });
};

// ─── Node ───────────────────────────────────────────────────────────────────

export const useGetNodes = ({ queryOptions }: QueryHookOptions<{ nodeId: number; nodeName: string }[]> = {}) => {
  return useQuery({
    queryKey: haGroupQueryKeys.getNodes.queryKey,
    queryFn: () => haGroupApi.getNodes(),
    ...queryOptions,
  });
};
